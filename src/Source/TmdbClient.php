<?php

namespace Ernestdefoe\Marquee\Source;

use Ernestdefoe\Marquee\Settings;
use Flarum\Settings\SettingsRepositoryInterface;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Contracts\Cache\Repository as Cache;

class TmdbClient
{
    private const BASE = 'https://api.themoviedb.org/3/';

    private ?Client $http = null;

    public function __construct(
        private SettingsRepositoryInterface $settings,
        private Cache $cache
    ) {
    }

    public function configured(): bool
    {
        return (bool) $this->settings->get(Settings::TMDB_TOKEN);
    }

    public function language(): string
    {
        return $this->settings->get(Settings::LANGUAGE) ?: 'en-US';
    }

    /** @throws SourceException */
    public function get(string $path, array $query = []): array
    {
        $this->http ??= new Client(['base_uri' => self::BASE, 'timeout' => 6, 'connect_timeout' => 3]);

        try {
            $response = $this->http->get($path, [
                'headers' => ['Authorization' => 'Bearer '.$this->settings->get(Settings::TMDB_TOKEN), 'Accept' => 'application/json'],
                'query' => $query + ['language' => $this->language()],
            ]);
        } catch (GuzzleException $e) {
            throw new SourceException('TMDB request failed: '.$path, 0, $e);
        }

        return json_decode((string) $response->getBody(), true) ?: [];
    }

    /** Genre id => name for one kind (movie | tv), kept for a week. */
    public function genres(string $kind): array
    {
        return $this->cache->remember("marquee.tmdb.genres.$kind.".$this->language(), 604800, function () use ($kind) {
            return array_column($this->get("genre/$kind/list")['genres'] ?? [], 'name', 'id');
        });
    }

    public static function year(?string $date): ?int
    {
        return $date ? (int) substr($date, 0, 4) ?: null : null;
    }

    public static function score(?float $average): ?int
    {
        return $average ? (int) round($average * 10) : null;
    }

    public static function people(array $list, int $limit, callable $role): array
    {
        return array_map(fn ($p) => [
            'name' => $p['name'],
            'role' => $role($p),
            'photo' => $p['profile_path'] ?? null,
        ], array_slice($list, 0, $limit));
    }

    public static function trailer(array $videos): ?string
    {
        foreach ($videos['results'] ?? [] as $v) {
            if (($v['site'] ?? '') === 'YouTube' && ($v['type'] ?? '') === 'Trailer') {
                return $v['key'];
            }
        }

        return null;
    }

    /** Crew names for the given jobs, without repeats, in billing order. */
    public static function crew(array $crew, array $jobs): array
    {
        $names = [];
        foreach ($crew as $c) {
            if (in_array($c['job'] ?? '', $jobs, true)) {
                $names[$c['name']] = true;
            }
        }

        return array_keys($names);
    }
}
