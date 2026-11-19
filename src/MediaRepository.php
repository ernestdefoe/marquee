<?php

namespace Ernestdefoe\Marquee;

use Carbon\Carbon;
use Ernestdefoe\Marquee\Source\Outage;
use Ernestdefoe\Marquee\Source\SeasonSource;
use Ernestdefoe\Marquee\Source\SourceException;
use Ernestdefoe\Marquee\Source\Sources;
use Ernestdefoe\Marquee\Translation\Translator;
use Ernestdefoe\Marquee\Translation\WikipediaOverview;
use Ernestdefoe\Marquee\Job\DescribeMedia;
use Ernestdefoe\Marquee\Job\FetchSeason;
use Ernestdefoe\Marquee\Job\PruneMedia;
use Flarum\Queue\RoutingQueue;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Contracts\Queue\Queue;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Queue\SyncQueue;

/**
 * Titles and seasons are fetched once and kept. A stored copy is refreshed only
 * when someone links to it or opens it again after it has gone stale; viewing a
 * discussion never reaches the source.
 *
 * On a non-English forum a game or book also gets its description in the data
 * language (Wikipedia, then DeepL). That takes longer than the source itself,
 * so the composer's quick look-up stores the source's data and leaves the
 * description to a queued job (with a queue worker) or to posting, which
 * queues it too (resolveForPost: on the sync queue that runs before the
 * response). A game Wikipedia has no article on in that language is looked
 * at again daily (marquee:describe), without the source.
 */
class MediaRepository
{
    private const MEDIA_TTL_DAYS = 7;
    private const SEASON_TTL_DAYS = 3;
    private const DESCRIBE_AGAIN_HOURS = 24;

    public function __construct(
        private Sources $sources,
        private Outage $outage,
        private WikipediaOverview $wikipedia,
        private Translator $translator,
        private Queue $queue,
        private Cache $cache
    ) {
    }

    /**
     * @param bool $quick answer as soon as the source has, and queue the
     *                    description in the data language
     * @throws SourceException
     */
    public function resolve(string $kind, string $externalId, bool $quick = false): Media
    {
        $media = Media::query()->where('kind', $kind)->where('external_id', $externalId)->first();
        $describes = $this->describes($kind);

        if ($media && ! $this->stale($media)) {
            if ($describes && $media->describe_at?->lte(Carbon::now())) {
                $quick ? $this->defer($media) : $this->describe($media);
            }

            return $media;
        }

        // The stale copy answers the composer; the refresh is queued.
        if ($quick && $media) {
            $this->defer($media);

            return $media;
        }

        $source = $this->sources->get($kind) ?? throw new SourceException("No source for $kind");

        try {
            $data = $this->outage->guard($kind, fn () => $source->details($externalId));
        } catch (SourceException $e) {
            // A stale copy beats no copy while the source is down.
            if ($media) {
                return $media;
            }
            throw $e;
        }

        $pending = $quick && $describes;
        if ($pending) {
            $data['pending'] = true;
        } else {
            $data = $this->describeData($kind, $data, $media?->data);
        }

        $media = $this->store($media, $kind, $externalId, $data, $pending);

        if ($pending) {
            $this->defer($media);
        }

        return $media;
    }

    /** @param array<string, mixed> $data */
    private function store(?Media $media, string $kind, string $externalId, array $data, bool $pending): Media
    {
        $fields = [
            'kind' => $kind,
            'external_id' => $externalId,
            'title' => mb_substr($data['title'], 0, 255),
            'year' => $data['year'],
            'poster' => $data['poster'],
            'data' => $data,
            'fetched_at' => Carbon::now(),
            'describe_at' => $pending ? Carbon::now() : $this->describeAt($kind, $data),
        ];

        try {
            // In a savepoint: on PostgreSQL a failed insert would abort the whole save.
            ($media ??= new Media())->getConnection()->transaction(fn () => $media->forceFill($fields)->save());
        } catch (UniqueConstraintViolationException) {
            // Another request (the composer's look-up beside the save) stored it meanwhile.
            $media = Media::query()->where('kind', $kind)->where('external_id', $externalId)->firstOrFail();
            $media->forceFill($fields)->save();
        }

        return $media;
    }

    /**
     * Posting a discussion: the source's data now, its description queued. On
     * the sync queue the job runs straight away, so the discussion is never
     * shown with the English description; with a queue worker posting waits
     * for neither.
     *
     * @throws SourceException
     */
    public function resolveForPost(string $kind, string $externalId): Media
    {
        $media = $this->resolve($kind, $externalId, true);

        // On a real queue the quick look-up has queued it already.
        if ($this->sync() && $this->unfinished($media)) {
            $this->queue->push(new DescribeMedia($media->id));
            $media->refresh();
        }

        return $media;
    }

    /** Queue storing a season, unless a fresh copy is stored already. */
    public function seasonLater(Media $media, int $number): void
    {
        $fresh = $media->seasons()->where('number', $number)->where('fetched_at', '>', Carbon::now()->subDays(self::SEASON_TTL_DAYS))->exists();

        if (! $fresh) {
            $this->queue->push(new FetchSeason($media->id, $number));
        }
    }

    /**
     * Queue the titles a discussion let go of, to delete once nothing else links to them.
     *
     * @param list<int|null> $ids
     */
    public function pruneLater(array $ids): void
    {
        $this->queue->push(new PruneMedia(array_values($ids)));
    }

    private function sync(): bool
    {
        $driver = $this->queue instanceof RoutingQueue ? $this->queue->getDriver() : $this->queue;

        return $driver instanceof SyncQueue;
    }

    private function stale(Media $media): bool
    {
        return $media->fetched_at->lte(Carbon::now()->subDays(self::MEDIA_TTL_DAYS));
    }

    /** A stale copy, or a description still due. */
    private function unfinished(Media $media): bool
    {
        return $this->stale($media) || ($this->describes($media->kind) && $media->describe_at?->lte(Carbon::now()));
    }

    /**
     * Queue what a quick look-up left. On the sync queue that would run inside
     * the look-up and make the composer wait, so it is left instead: describe_at
     * is due, so posting the discussion finishes it, or else the daily
     * marquee:describe.
     */
    private function defer(Media $media): void
    {
        // One job per title at a time: look-ups while it waits add none.
        if (! $this->sync() && $this->cache->add(self::queuedKey($media), true, 600)) {
            $this->queue->push(new DescribeMedia($media->id));
        }
    }

    private static function queuedKey(Media $media): string
    {
        return 'marquee.describe-queued.'.$media->id;
    }

    /** The queued half of a quick look-up: a refresh if the copy is stale, else the description. */
    public function finish(Media $media): void
    {
        $this->cache->forget(self::queuedKey($media));

        if ($this->stale($media)) {
            $this->resolve($media->kind, $media->external_id);
        } elseif ($media->describe_at?->lte(Carbon::now())) {
            $this->describe($media);
        }
    }

    /**
     * Whether titles of this kind get a description in the data language here
     * (not on an English forum, nor for movies, shows and albums).
     */
    public function describes(string $kind): bool
    {
        return $this->wikipedia->applies($kind) || $this->translator->applies($kind);
    }

    /**
     * Find the description in the data language for a stored title, without
     * asking the source again: after a quick look-up, and daily for a game
     * whose article does not exist yet.
     */
    public function describe(Media $media): void
    {
        $data = $media->data;

        if (! empty($data['pending']) || $this->wikipedia->missing($media->kind, $data)) {
            unset($data['pending']);
            $data = $this->describeData($media->kind, $data, $data);
        }

        $media->forceFill(['data' => $data, 'describe_at' => $this->describeAt($media->kind, $data)])->save();
    }

    /**
     * @param array<string, mixed> $data
     * @param array<string, mixed>|null $previous
     * @return array<string, mixed>
     */
    private function describeData(string $kind, array $data, ?array $previous): array
    {
        // Outside the outage guard: Wikipedia or DeepL failing says nothing about the source.
        // Wikipedia's own words in the data language first; DeepL translates what is left.
        $data = $this->wikipedia->apply($kind, $data, $previous);

        return $this->translator->apply($kind, $data, $previous);
    }

    /** @param array<string, mixed> $data */
    private function describeAt(string $kind, array $data): ?Carbon
    {
        return $this->wikipedia->missing($kind, $data) ? Carbon::now()->addHours(self::DESCRIBE_AGAIN_HOURS) : null;
    }

    /** @throws SourceException */
    public function season(Media $media, int $number): Season
    {
        $season = $media->seasons()->where('number', $number)->first();

        if ($season && $season->fetched_at->gt(Carbon::now()->subDays(self::SEASON_TTL_DAYS))) {
            return $season;
        }

        $source = $this->sources->get($media->kind);
        if (! $source instanceof SeasonSource) {
            throw new SourceException("{$media->kind} has no seasons");
        }

        try {
            $data = $this->outage->guard($media->kind, fn () => $source->season($media->external_id, $number));
        } catch (SourceException $e) {
            if ($season) {
                return $season;
            }
            throw $e;
        }

        $fields = ['media_id' => $media->id, 'number' => $number, 'data' => $data, 'fetched_at' => Carbon::now()];

        try {
            ($season ??= new Season())->getConnection()->transaction(fn () => $season->forceFill($fields)->save());
        } catch (UniqueConstraintViolationException) {
            $season = $media->seasons()->where('number', $number)->firstOrFail();
            $season->forceFill($fields)->save();
        }

        return $season;
    }

    /**
     * Deletes stored titles (and their seasons) that no discussion links to or
     * lists as related any more.
     *
     * @param list<int|null>|null $ids these titles, after a discussion let go of
     *                                 them; null = every title stored over a day
     *                                 ago (look-ups that were never posted)
     * @return int how many were deleted
     */
    public function prune(?array $ids = null): int
    {
        $candidates = $ids === null
            ? Media::query()->where('fetched_at', '<', Carbon::now()->subDay())->pluck('id')->all()
            : array_values(array_unique(array_filter(array_map('intval', $ids))));

        if (! $candidates) {
            return 0;
        }

        $deleted = 0;
        foreach (array_chunk($candidates, 500) as $chunk) {
            // One statement each: a title linked between a check and the delete
            // would otherwise go, and its new link with it (the link cascades).
            $deleted += Media::query()->whereIn('id', $chunk)
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('marquee_discussions')->whereColumn('marquee_discussions.media_id', 'marquee_media.id'))
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('marquee_related')->whereColumn('marquee_related.media_id', 'marquee_media.id'))
                ->delete();

            // Their seasons (cascaded already where foreign keys are enforced).
            Season::query()->whereIn('media_id', $chunk)
                ->whereNotExists(fn ($q) => $q->selectRaw('1')->from('marquee_media')->whereColumn('marquee_media.id', 'marquee_seasons.media_id'))
                ->delete();
        }

        return $deleted;
    }
}
