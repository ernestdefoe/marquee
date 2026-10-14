<?php

use Flarum\Extend;

// Prototype: front end only, sample data in js/src/forum/fixtures.js.
return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),
];
