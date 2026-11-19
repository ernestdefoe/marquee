<?php

namespace Ernestdefoe\Marquee\Job;

use Ernestdefoe\Marquee\Media;
use Ernestdefoe\Marquee\MediaRepository;
use Ernestdefoe\Marquee\Source\SourceException;
use Flarum\Queue\AbstractJob;
use Psr\Log\LoggerInterface;

/** Stores a linked season before anyone opens the discussion (the page fetches it otherwise). */
class FetchSeason extends AbstractJob
{
    public function __construct(private int $mediaId, private int $number)
    {
        parent::__construct();
    }

    public function handle(MediaRepository $repository, LoggerInterface $log): void
    {
        if (! $media = Media::query()->find($this->mediaId)) {
            return;
        }

        try {
            $repository->season($media, $this->number);
        } catch (SourceException $e) {
            // The discussion page asks for it again when it is opened.
            $log->info('[marquee] Season not stored yet: '.$e->getMessage());
        }
    }
}
