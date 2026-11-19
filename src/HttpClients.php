<?php

namespace Ernestdefoe\Marquee;

use GuzzleHttp\Client;

/**
 * The outbound HTTP clients (TMDB, IGDB, Deezer, Open Library, Wikimedia,
 * DeepL). Each source has its own base address and timeouts; built here so
 * none of them news up Guzzle itself and a test can hand them a mock.
 */
class HttpClients
{
    /** @param array<string, mixed> $options Guzzle options */
    public function make(array $options): Client
    {
        return new Client($options);
    }
}
