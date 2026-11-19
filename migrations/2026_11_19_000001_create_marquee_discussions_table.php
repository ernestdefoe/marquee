<?php

use Flarum\Database\Migration;
use Illuminate\Database\Schema\Blueprint;

/** A discussion's Marquee title, beside `discussions` instead of in it (see Link). */
return Migration::createTable('marquee_discussions', function (Blueprint $table) {
    $table->unsignedInteger('discussion_id')->primary();
    $table->unsignedInteger('media_id')->index();
    $table->unsignedSmallInteger('season')->nullable();
    $table->unsignedSmallInteger('episode')->nullable();
    $table->text('backdrops')->nullable();

    $table->foreign('discussion_id')->references('id')->on('discussions')->cascadeOnDelete();
    $table->foreign('media_id')->references('id')->on('marquee_media')->cascadeOnDelete();
});
