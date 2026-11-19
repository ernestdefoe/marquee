<?php

namespace Ernestdefoe\Marquee\Api;

use Ernestdefoe\Marquee\Backdrops;
use Flarum\Discussion\Discussion;
use Flarum\Foundation\ValidationException;
use Flarum\Http\RequestUtil;
use Flarum\Locale\TranslatorInterface;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Support\Arr;
use Laminas\Diactoros\Response\JsonResponse;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Message\UploadedFileInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * A title's own background on a discussion's card: POST
 * /marquee/discussions/{id}/backdrop with the image as `backdrop` and the
 * title's id as `media` (the linked title when left out). Allowed to whoever
 * may change the discussion's linked title. Replaces (and deletes) the one it had.
 */
class BackdropController implements RequestHandlerInterface
{
    use Throttle;

    public function __construct(
        private Backdrops $backdrops,
        private BackdropValidator $validator,
        private TranslatorInterface $translator,
        private Cache $cache
    ) {
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = RequestUtil::getActor($request);
        $actor->assertRegistered();

        $discussion = Discussion::whereVisibleTo($actor)->findOrFail((int) Arr::get($request->getAttribute('routeParameters'), 'id'));

        $link = $discussion->marqueeLink;
        $ids = $link?->titleIds() ?? [];
        if (! $link || ! $ids || ! DiscussionFields::canLink($actor, $discussion)) {
            return new JsonResponse(['errors' => [['status' => '403', 'code' => 'permission_denied']]], 403);
        }

        if ($limited = $this->throttled($this->cache, $actor, 10)) {
            return $limited;
        }

        $file = Arr::get($request->getUploadedFiles(), 'backdrop');

        if (! $file instanceof UploadedFileInterface) {
            throw new ValidationException(['backdrop' => $this->translator->trans('validation.required', ['attribute' => 'backdrop'])]);
        }

        $media = (int) (Arr::get((array) $request->getParsedBody(), 'media') ?: $ids[0]);
        if (! in_array($media, $ids, true)) {
            throw new ValidationException(['media' => $this->translator->trans('validation.in', ['attribute' => 'media'])]);
        }

        $this->validator->assertImageValid('backdrop', $file);

        $stored = $this->backdrops->store($discussion->id, (string) $file->getStream()->getMetadata('uri'));

        // The map is read and written under a lock, so two uploads at once both keep
        // their entry. Never waited for: the second is told to try again.
        $lock = $this->cache->lock('marquee.backdrops.'.$discussion->id, 10);
        if (! $lock->get()) {
            $this->backdrops->delete($stored);
            throw new ValidationException(['backdrop' => $this->translator->trans('ernestdefoe-marquee.api.backdrop_busy')]);
        }

        try {
            $link = $link->fresh() ?? $link;
            $map = (array) ($link->backdrops ?? []);
            $before = $map[$media] ?? null;
            $map[$media] = $stored;
            $link->backdrops = $map;
            $link->save();
        } finally {
            $lock->release();
        }

        $this->backdrops->delete($before);

        return new JsonResponse(['data' => ['backdrops' => $this->backdrops->values($map)]]);
    }
}
