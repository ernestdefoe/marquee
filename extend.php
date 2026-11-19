<?php

use Ernestdefoe\Marquee\Api;
use Ernestdefoe\Marquee\Console;
use Ernestdefoe\Marquee\Formatter;
use Ernestdefoe\Marquee\Link;
use Ernestdefoe\Marquee\Listener;
use Ernestdefoe\Marquee\Media;
use Flarum\Api\Endpoint;
use Flarum\Api\Resource\DiscussionResource;
use Flarum\Api\Resource\ForumResource;
use Flarum\Api\Resource\PostResource;
use Flarum\Discussion\Discussion;
use Flarum\Extend;
use Illuminate\Console\Scheduling\Event;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->jsDirectory(__DIR__.'/js/dist/forum')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),

    new Extend\Locales(__DIR__.'/locale'),

    (new Extend\Formatter())
        ->configure(Formatter\EpisodeReferences::class),

    (new Extend\Routes('api'))
        ->get('/marquee/search', 'marquee.search', Api\SearchController::class)
        ->post('/marquee/media', 'marquee.lookup', Api\LookupController::class)
        ->get('/marquee/media/{id:\d+}/seasons/{number:\d+}', 'marquee.season', Api\SeasonController::class)
        ->post('/marquee/discussions/{id:\d+}/backdrop', 'marquee.backdrop', Api\BackdropController::class),

    // A discussion's title lives in marquee_discussions (Link); other extensions read it there too.
    (new Extend\Model(Discussion::class))
        ->hasOne('marqueeLink', Link::class, 'discussion_id')
        ->relationship('marqueeMedia', fn (Discussion $discussion) => $discussion->hasOneThrough(Media::class, Link::class, 'discussion_id', 'id', 'id', 'media_id'))
        ->relationship('marqueeRelatedMedia', fn (Discussion $discussion) => $discussion->belongsToMany(Media::class, 'marquee_related', 'discussion_id', 'media_id')->orderByPivot('position')),

    new Extend\ApiResource(Api\MediaResource::class),

    (new Extend\ApiResource(DiscussionResource::class))
        ->fields(Api\DiscussionFields::class)
        ->endpoint(
            [Endpoint\Index::class, Endpoint\Show::class, Endpoint\Create::class, Endpoint\Update::class],
            fn (Endpoint\Index|Endpoint\Show|Endpoint\Create|Endpoint\Update $endpoint) => $endpoint->addDefaultInclude(['marqueeMedia'])->eagerLoad(['marqueeLink'])
        )
        // The related titles' cards: the discussion page only, never the list.
        ->endpoint(
            [Endpoint\Show::class, Endpoint\Update::class],
            fn (Endpoint\Show|Endpoint\Update $endpoint) => $endpoint->addDefaultInclude(['marqueeRelatedMedia'])
        ),

    // Posts carry their discussion (a user's Posts tab, search): its link and title in one query each.
    (new Extend\ApiResource(PostResource::class))
        ->endpoint(
            [Endpoint\Index::class, Endpoint\Show::class],
            fn (Endpoint\Index|Endpoint\Show $endpoint) => $endpoint->eagerLoadWhenIncluded(['discussion' => ['discussion.marqueeLink', 'discussion.marqueeMedia']])
        ),

    (new Extend\ApiResource(ForumResource::class))
        ->fields(Api\ForumFields::class),

    (new Extend\Console())
        ->command(Console\DescribeCommand::class)
        ->schedule(Console\DescribeCommand::class, function (Event $event): void {
            $event->daily()->withoutOverlapping();
        })
        ->command(Console\GameTypesCommand::class)
        ->schedule(Console\GameTypesCommand::class, function (Event $event): void {
            $event->daily()->withoutOverlapping();
        })
        ->command(Console\PruneCommand::class)
        ->schedule(Console\PruneCommand::class, function (Event $event): void {
            $event->daily()->withoutOverlapping();
        }),

    (new Extend\Event())
        ->listen('eloquent.deleting: '.Discussion::class, Listener\ForgetDeletedDiscussion::class),

    // String keys, not Settings::…: extend.php must not autoload the extension's own classes while it boots.
    (new Extend\Settings())
        ->default('ernestdefoe-marquee.language', '')
        ->default('ernestdefoe-marquee.list_posters', true)
        ->default('ernestdefoe-marquee.show_scores', true)
        ->default('ernestdefoe-marquee.show_source_link', true)
        ->default('ernestdefoe-marquee.list_meta', 'kind_year')
        ->default('ernestdefoe-marquee.title_year', true)
        ->default('ernestdefoe-marquee.game_backdrop', 'artwork_screenshot')
        ->default('ernestdefoe-marquee.backdrop_color', '')
        ->default('ernestdefoe-marquee.backdrop_tag_color', false)
        ->default('ernestdefoe-marquee.dock', true)
        ->default('ernestdefoe-marquee.dock_icon', '')
        ->default('ernestdefoe-marquee.tags', '{}'),
];
