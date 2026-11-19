<?php

namespace Ernestdefoe\Marquee\Job;

use Ernestdefoe\Marquee\Media;
use Ernestdefoe\Marquee\MediaRepository;
use Flarum\Queue\AbstractJob;

/**
 * Finishes a title the composer's quick look-up left: its description in the
 * data language (Wikipedia, then DeepL), or a refresh of a stale copy.
 */
class DescribeMedia extends AbstractJob
{
    public function __construct(private int $mediaId)
    {
        parent::__construct();
    }

    public function handle(MediaRepository $repository): void
    {
        // Pruned meanwhile: nothing links to it any more.
        if (! $media = Media::query()->find($this->mediaId)) {
            return;
        }

        $repository->finish($media);
    }
}
