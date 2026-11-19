<?php

namespace Ernestdefoe\Marquee\Listener;

use Ernestdefoe\Marquee\Backdrops;
use Ernestdefoe\Marquee\MediaRepository;
use Flarum\Discussion\Discussion;

/**
 * A discussion being deleted takes its link with it, its uploaded backgrounds
 * too, and its titles go once nothing else links to them. On Eloquent's
 * `deleting`: by core's Deleted event the link rows have cascaded away, so
 * there would be nothing left to read. Deleting them here also covers a
 * database that does not enforce foreign keys.
 */
class ForgetDeletedDiscussion
{
    public function __construct(private MediaRepository $media, private Backdrops $backdrops)
    {
    }

    public function handle(Discussion $discussion): void
    {
        $link = $discussion->marqueeLink;
        if (! $link) {
            return;
        }

        $titles = $link->titleIds();
        $backdrops = $link->backdrops;
        $link->related()->detach();
        $link->delete();

        $this->backdrops->deleteAll($backdrops);
        $this->media->pruneLater($titles);
    }
}
