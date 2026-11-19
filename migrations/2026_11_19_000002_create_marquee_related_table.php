<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

/** A discussion's related titles (the rest of a series), in the card's order. */
return Migration::createTable('marquee_related', function (Blueprint $table) {
    $table->unsignedInteger('discussion_id');
    $table->unsignedInteger('media_id')->index();
    $table->unsignedSmallInteger('position');

    $table->primary(['discussion_id', 'media_id']);
    $table->foreign('discussion_id')->references('id')->on('discussions')->cascadeOnDelete();
    $table->foreign('media_id')->references('id')->on('marquee_media')->cascadeOnDelete();
});
