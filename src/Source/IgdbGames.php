<?php

namespace Ernestdefoe\Marquee\Source;

/**
 * Games from IGDB. Image fields hold `igdb:{image_id}`; the client builds the
 * URL (images.igdb.com/igdb/image/upload/t_{size}/{image_id}.jpg).
 */
class IgdbGames implements Source
{
    /**
     * game_type ids worth starting a discussion about: main game, standalone
     * expansion, remake, remaster, expanded game, port. Leaves out DLC, bundles,
     * mods, episodes, seasons, packs, updates and forks. (IGDB kept the old
     * `category` enum values when it moved them to the game_types table.)
     */
    private const GAME_TYPES = '(0,4,8,9,10,11)';

    private const DETAIL_FIELDS = 'name,url,summary,first_release_date,aggregated_rating,aggregated_rating_count,'
        .'rating,rating_count,cover.image_id,artworks.image_id,screenshots.image_id,platforms.name,'
        .'platforms.abbreviation,genres.name,game_modes.name,involved_companies.company.name,'
        .'involved_companies.developer,involved_companies.publisher,videos.video_id,videos.name,'
        .'franchises.name,collections.name';

    public function __construct(private IgdbClient $igdb)
    {
    }

    public function kind(): string
    {
        return 'game';
    }

    public function configured(): bool
    {
        return $this->igdb->configured();
    }

    public function search(string $query): array
    {
        $results = $this->igdb->query('games', implode(' ', [
            'search '.IgdbClient::quote($query).';',
            'fields name,first_release_date,cover.image_id,platforms.abbreviation,platforms.name,genres.name;',
            'where game_type = '.self::GAME_TYPES.' & version_parent = null;',
            'limit 8;',
        ]));

        return array_map(fn ($g) => [
            'id' => (string) $g['id'],
            'title' => $g['name'],
            'year' => self::year($g['first_release_date'] ?? null),
            'poster' => self::image($g['cover']['image_id'] ?? null),
            'subtitle' => implode(' · ', array_filter([
                implode(', ', array_slice(self::platforms($g['platforms'] ?? []), 0, 3)),
                $g['genres'][0]['name'] ?? null,
            ])),
        ], $results);
    }

    public function details(string $id): array
    {
        if (! ctype_digit($id)) {
            throw new SourceException("IGDB game ids are numeric, got $id");
        }

        $results = $this->igdb->query('multiquery', implode("\n", [
            'query games "game" { fields '.self::DETAIL_FIELDS."; where id = $id; };",
            "query game_time_to_beats \"ttb\" { fields hastily,normally,completely,count; where game_id = $id; };",
        ]));

        $named = array_column($results, 'result', 'name');
        $game = $named['game'][0] ?? null;

        if (! $game) {
            throw new SourceException("IGDB has no game $id");
        }

        return self::normalize($game, $named['ttb'][0] ?? null);
    }

    /** Public so the shape can be checked without credentials. */
    public static function normalize(array $g, ?array $ttb): array
    {
        $companies = $g['involved_companies'] ?? [];
        $role = fn (string $flag) => array_values(array_unique(array_filter(array_map(
            fn ($c) => ! empty($c[$flag]) ? ($c['company']['name'] ?? null) : null,
            $companies
        ))));

        $trailer = null;
        foreach ($g['videos'] ?? [] as $video) {
            $trailer ??= $video['video_id'] ?? null;
            if (stripos($video['name'] ?? '', 'trailer') !== false) {
                $trailer = $video['video_id'];
                break;
            }
        }

        $hours = fn ($seconds) => $seconds ? max(1, (int) round($seconds / 3600)) : null;
        $backdrop = $g['artworks'][0]['image_id'] ?? $g['screenshots'][0]['image_id'] ?? null;

        return [
            'title' => $g['name'],
            'year' => self::year($g['first_release_date'] ?? null),
            'date' => isset($g['first_release_date']) ? gmdate('Y-m-d', (int) $g['first_release_date']) : null,
            'genres' => array_column($g['genres'] ?? [], 'name'),
            'modes' => array_column($g['game_modes'] ?? [], 'name'),
            'platforms' => self::platforms($g['platforms'] ?? [], false),
            'critic' => isset($g['aggregated_rating']) ? (int) round($g['aggregated_rating']) : null,
            'criticCount' => $g['aggregated_rating_count'] ?? null,
            'users' => isset($g['rating']) ? (int) round($g['rating']) : null,
            'usersCount' => $g['rating_count'] ?? null,
            'overview' => $g['summary'] ?? null,
            'poster' => self::image($g['cover']['image_id'] ?? null),
            'backdrop' => self::image($backdrop),
            'screenshots' => array_map(fn ($s) => self::image($s['image_id']), array_slice($g['screenshots'] ?? [], 0, 6)),
            'crew' => [
                'developer' => $role('developer'),
                'publisher' => $role('publisher'),
                'series' => array_values(array_unique(array_merge(
                    array_column($g['franchises'] ?? [], 'name'),
                    array_column($g['collections'] ?? [], 'name')
                ))),
            ],
            'timeToBeat' => $ttb && ($ttb['count'] ?? 0) > 0 ? [
                'hastily' => $hours($ttb['hastily'] ?? null),
                'normally' => $hours($ttb['normally'] ?? null),
                'completely' => $hours($ttb['completely'] ?? null),
            ] : null,
            'trailer' => $trailer,
            'url' => $g['url'] ?? null,
        ];
    }

    private static function year(?int $timestamp): ?int
    {
        return $timestamp ? (int) gmdate('Y', $timestamp) : null;
    }

    private static function image(?string $imageId): ?string
    {
        return $imageId ? 'igdb:'.$imageId : null;
    }

    private static function platforms(array $platforms, bool $short = true): array
    {
        return array_values(array_filter(array_map(
            // Full names read better, but some are long ("PC (Microsoft Windows)").
            fn ($p) => $short || mb_strlen($p['name'] ?? '') > 18
                ? ($p['abbreviation'] ?? $p['name'] ?? null)
                : ($p['name'] ?? null),
            $platforms
        )));
    }
}
