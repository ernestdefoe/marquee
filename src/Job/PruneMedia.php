<?php

namespace Ernestdefoe\Marquee\Job;

use Ernestdefoe\Marquee\MediaRepository;
use Flarum\Queue\AbstractJob;

/** Deletes the titles a discussion let go of, once nothing else links to them. */
class PruneMedia extends AbstractJob
{
    /** @param list<int|null> $ids */
    public function __construct(private array $ids)
    {
        parent::__construct();
    }

    public function handle(MediaRepository $repository): void
    {
        $repository->prune($this->ids);
    }
}
