<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Schema\Builder;

/**
 * Marquee's columns on `discussions` move to marquee_discussions and
 * marquee_related, then go. Down puts them back with their values.
 */
return [
    'up' => function (Builder $schema) {
        $db = $schema->getConnection();

        $db->table('discussions')->whereNotNull('marquee_media_id')->orderBy('id')
            ->select(['id', 'marquee_media_id', 'marquee_season', 'marquee_episode', 'marquee_related', 'marquee_backdrops'])
            ->chunk(500, function ($rows) use ($db) {
                $known = $db->table('marquee_media')
                    ->whereIn('id', $rows->flatMap(fn ($row) => (array) json_decode((string) $row->marquee_related, true))->map(fn ($id) => (int) $id)->unique()->all())
                    ->pluck('id')->map(fn ($id) => (int) $id)->all();

                $db->table('marquee_discussions')->insert($rows->map(fn ($row) => [
                    'discussion_id' => $row->id,
                    'media_id' => $row->marquee_media_id,
                    'season' => $row->marquee_season,
                    'episode' => $row->marquee_episode,
                    'backdrops' => $row->marquee_backdrops,
                ])->all());

                $related = [];
                foreach ($rows as $row) {
                    $ids = array_values(array_unique(array_intersect(array_map('intval', (array) json_decode((string) $row->marquee_related, true)), $known)));
                    foreach (array_values(array_diff($ids, [(int) $row->marquee_media_id])) as $position => $id) {
                        $related[] = ['discussion_id' => $row->id, 'media_id' => $id, 'position' => $position];
                    }
                }
                if ($related) {
                    $db->table('marquee_related')->insert($related);
                }
            });

        $schema->table('discussions', function (Blueprint $table) {
            $table->dropForeign(['marquee_media_id']);
        });
        $schema->table('discussions', function (Blueprint $table) {
            $table->dropColumn(['marquee_media_id', 'marquee_season', 'marquee_episode', 'marquee_related', 'marquee_backdrops']);
        });
    },
    'down' => function (Builder $schema) {
        $schema->table('discussions', function (Blueprint $table) {
            $table->unsignedInteger('marquee_media_id')->nullable();
            $table->unsignedSmallInteger('marquee_season')->nullable();
            $table->unsignedSmallInteger('marquee_episode')->nullable();
            $table->text('marquee_related')->nullable();
            $table->text('marquee_backdrops')->nullable();

            $table->foreign('marquee_media_id')->references('id')->on('marquee_media')->nullOnDelete();
        });

        $db = $schema->getConnection();
        $db->table('marquee_discussions')->orderBy('discussion_id')->chunk(500, function ($rows) use ($db) {
            $related = $db->table('marquee_related')->whereIn('discussion_id', $rows->pluck('discussion_id')->all())
                ->orderBy('position')->get()->groupBy('discussion_id');

            foreach ($rows as $row) {
                $ids = ($related[$row->discussion_id] ?? collect())->pluck('media_id')->map(fn ($id) => (int) $id)->all();
                $db->table('discussions')->where('id', $row->discussion_id)->update([
                    'marquee_media_id' => $row->media_id,
                    'marquee_season' => $row->season,
                    'marquee_episode' => $row->episode,
                    'marquee_related' => $ids ? json_encode($ids) : null,
                    'marquee_backdrops' => $row->backdrops,
                ]);
            }
        });
    },
];
