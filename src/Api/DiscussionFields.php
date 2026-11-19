<?php

namespace Ernestdefoe\Marquee\Api;

use Ernestdefoe\Marquee\Backdrops;
use Ernestdefoe\Marquee\Link;
use Ernestdefoe\Marquee\Media;
use Ernestdefoe\Marquee\MediaRepository;
use Ernestdefoe\Marquee\Season;
use Ernestdefoe\Marquee\Source\SourceException;
use Ernestdefoe\Marquee\Source\Sources;
use Flarum\Api\Context;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Schema;
use Flarum\Discussion\Discussion;
use Flarum\Foundation\ValidationException;
use Flarum\Locale\TranslatorInterface;
use Flarum\User\User;
use Illuminate\Database\Eloquent\Collection;

class DiscussionFields
{
    public function __construct(
        private Sources $sources,
        private MediaRepository $media,
        private TranslatorInterface $translator,
        private Backdrops $backdrops
    ) {
    }

    public function __invoke(): array
    {
        return [...$this->readable(), ...$this->writable()];
    }

    /** What the card reads. */
    private function readable(): array
    {
        return [
            Schema\Relationship\ToOne::make('marqueeMedia')
                ->type('marquee-media')
                ->includable(),

            Schema\Integer::make('marqueeSeason')
                ->nullable()
                ->get(fn (Discussion $d) => $d->marqueeLink?->season),

            Schema\Integer::make('marqueeEpisode')
                ->nullable()
                ->get(fn (Discussion $d) => $d->marqueeLink?->episode),

            // The linked season's episodes, on the discussion page (and after an
            // edit to it) only, so the hero needs no second request.
            Schema\Arr::make('marqueeSeasonData')
                ->nullable()
                ->visible(fn (Discussion $d, Context $context) => $d->marqueeLink?->season && ($context->showing(DiscussionResource::class) || $context->updating(DiscussionResource::class)))
                ->get(fn (Discussion $d) => Season::query()
                    ->where('media_id', $d->marqueeLink->media_id)
                    ->where('number', $d->marqueeLink->season)
                    ->first()?->data),

            // Related titles (the rest of a series), on the discussion page only.
            Schema\Relationship\ToMany::make('marqueeRelatedMedia')
                ->type('marquee-media')
                ->includable()
                ->withLinkage(fn (Context $context) => $context->showing(DiscussionResource::class) || $context->updating(DiscussionResource::class)),

            Schema\Boolean::make('canMarqueeLink')
                ->get(fn (Discussion $d, Context $context) => self::canLink($context->getActor(), $d)),
        ];
    }

    /** What the composer and the Linked title window write. */
    private function writable(): array
    {
        return [
            // Write-only: { kind, id, season?, episode? } or null to unlink.
            Schema\Attribute::make('marquee')
                ->hidden()
                ->writable(fn (Discussion $d, Context $context) => $context->creating() || self::canLink($context->getActor(), $d))
                ->set(fn (Discussion $d, mixed $value) => $this->link($d, $value)),

            // Write-only: [{ kind, id }, …] in card order, or [] for none. After
            // `marquee`, so a change of linked title in the same save comes first.
            Schema\Attribute::make('marqueeRelated')
                ->hidden()
                ->writable(fn (Discussion $d, Context $context) => ! $context->creating() && self::canLink($context->getActor(), $d))
                ->set(fn (Discussion $d, mixed $value) => $this->relate($d, $value)),

            // Each title's own background: { titleId: "none" or an uploaded
            // image's address }; a title not in it has the source's. Uploading
            // goes through BackdropController. Written as changes after
            // `marqueeRelated`: { titleId: null (the source's) or "none" }.
            Schema\Attribute::make('marqueeBackdrops')
                ->nullable()
                ->visible(fn (Discussion $d, Context $context) => $context->showing(DiscussionResource::class) || $context->updating(DiscussionResource::class))
                ->get(fn (Discussion $d) => $this->backdrops->values($d->marqueeLink?->backdrops))
                ->writable(fn (Discussion $d, Context $context) => ! $context->creating() && self::canLink($context->getActor(), $d))
                ->set(fn (Discussion $d, mixed $value) => $this->setBackdrops($d, $value)),
        ];
    }

    /**
     * Changing a posted discussion's linked title: "Change the linked title of
     * any discussion" (discussion.marqueeLink, tag-scopable), or the author who
     * may rename their own discussion and has "...of their own discussions".
     * Neither follows from the rename permission any more.
     */
    public static function canLink(User $actor, Discussion $discussion): bool
    {
        if ($actor->can('marqueeLink', $discussion)) {
            return true;
        }

        return (int) $discussion->user_id === (int) $actor->id
            && $actor->hasPermission('ernestdefoe-marquee.linkOwn')
            && $actor->can('rename', $discussion);
    }

    private function link(Discussion $discussion, mixed $value): void
    {
        $link = $this->linkOf($discussion);

        if ($value === null) {
            $link->media_id = $link->season = $link->episode = null;
            $link->setRelatedIds([]);
            $discussion->setRelation('marqueeMedia', null);
            $this->keepBackdrops($link);

            return;
        }

        $season = isset($value['season']) ? (int) $value['season'] : null;
        $episode = isset($value['episode']) ? (int) $value['episode'] : null;
        $media = $this->title($value);

        if ($season !== null && ! in_array($season, $media->seasonNumbers(), true)) {
            $this->fail('invalid');
        }

        if ($episode !== null && ($season === null || $episode < 1 || $episode > $media->episodeCount($season))) {
            $this->fail('invalid');
        }

        // Have the season stored before anyone opens the discussion. The composer
        // has usually fetched it already while the episode was picked.
        if ($season !== null) {
            $this->media->seasonLater($media, $season);
        }

        $related = array_values(array_diff($link->relatedIds(), [$media->id]));
        $link->media_id = $media->id;
        $link->season = $season;
        $link->episode = $episode;
        $link->setRelatedIds($related);
        $discussion->setRelation('marqueeMedia', $media);
        $this->keepBackdrops($link);
    }

    /**
     * The discussion's link, loaded once per save and kept as its relation, so
     * the discussion's own `saving` listeners (Spoiler Shield) see what changed.
     * It is written after the discussion, and the titles it let go of are
     * pruned then.
     */
    private function linkOf(Discussion $discussion): Link
    {
        if ($discussion->relationLoaded('marqueeLink') && $discussion->marqueeLink?->tracked) {
            return $discussion->marqueeLink;
        }

        $link = ($discussion->exists ? $discussion->marqueeLink : null) ?? new Link();
        $link->tracked = true;
        $titles = $link->titleIds();
        $files = array_values((array) ($link->backdrops ?? []));
        $discussion->setRelation('marqueeLink', $link);

        $discussion->afterSave(function (Discussion $discussion) use ($link, $titles, $files) {
            $link->persist($discussion);
            // Uploaded backgrounds the card no longer uses, and titles nothing may link to now.
            $this->backdrops->deleteAll(array_diff($files, array_values((array) ($link->backdrops ?? []))));
            $this->media->pruneLater($titles);
        });

        return $link;
    }

    /** The stored title for { kind, id }, fetched if need be. */
    private function title(mixed $value): Media
    {
        $kind = is_array($value) ? (string) ($value['kind'] ?? '') : '';
        $id = is_array($value) ? (string) ($value['id'] ?? '') : '';

        if (! $this->sources->get($kind) || ! preg_match('/^[A-Za-z0-9_-]{1,64}$/', $id)) {
            $this->fail('invalid');
        }

        try {
            return $this->media->resolveForPost($kind, $id);
        } catch (SourceException) {
            $this->fail('unavailable');
        }
    }

    /** At most this many related titles: a row of chips, not a catalogue. */
    private const RELATED = 12;

    private function relate(Discussion $discussion, mixed $value): void
    {
        $link = $this->linkOf($discussion);

        if ($value === [] || $value === null) {
            $link->setRelatedIds([]);
            $discussion->setRelation('marqueeRelatedMedia', new Collection());
            $this->keepBackdrops($link);

            return;
        }

        if (! $link->media_id || ! is_array($value) || ! array_is_list($value) || count($value) > self::RELATED) {
            $this->fail('invalid');
        }

        $titles = array_map(fn ($item) => $this->title($item), $value);

        // Not the linked title itself, and each title once.
        $titles = collect($titles)->reject(fn (Media $m) => $m->id === $link->media_id)->unique('id')->values();
        $link->setRelatedIds($titles->pluck('id')->all());
        $discussion->setRelation('marqueeRelatedMedia', new Collection($titles->all()));
        $this->keepBackdrops($link);
    }

    /** Backgrounds of titles no longer on the card go (their files once the save is through). */
    private function keepBackdrops(Link $link): void
    {
        $map = (array) ($link->backdrops ?? []);
        $kept = array_intersect_key($map, array_flip($link->titleIds()));

        if (count($kept) !== count($map)) {
            $link->backdrops = $kept ?: null;
        }
    }

    /** Back to the source's (null) or to none ("none"), for titles on the card. */
    private function setBackdrops(Discussion $discussion, mixed $value): void
    {
        $link = $this->linkOf($discussion);
        $ids = $link->titleIds();
        if (! is_array($value) || array_is_list($value) && $value !== []) {
            $this->fail('invalid');
        }

        $map = (array) ($link->backdrops ?? []);
        foreach ($value as $id => $choice) {
            if (! in_array((int) $id, $ids, true) || ($choice !== null && $choice !== Backdrops::NONE)) {
                $this->fail('invalid');
            }

            if ($choice === null) {
                unset($map[(int) $id]);
            } else {
                $map[(int) $id] = $choice;
            }
        }

        $link->backdrops = $map ?: null;
    }

    private function fail(string $reason): never
    {
        throw new ValidationException(['marquee' => $this->translator->trans("ernestdefoe-marquee.api.link_$reason")]);
    }
}
