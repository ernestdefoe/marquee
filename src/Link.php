<?php

namespace Ernestdefoe\Marquee;

use Flarum\Database\AbstractModel;
use Flarum\Discussion\Discussion;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A discussion's Marquee title: the linked title, its season and episode, the
 * related titles in the card's order, and each title's own background. One row
 * per linked discussion, kept beside `discussions`.
 *
 * This is also how other extensions read a discussion's title (Curio, Shelf,
 * Club, Spoiler Shield): `$discussion->marqueeLink`, or queries on this model.
 * While a discussion is being saved, a changed link is already the loaded
 * relation (dirty: media_id, season, episode; media_id null = unlinked); it is
 * written once the discussion is.
 *
 * @property int $discussion_id
 * @property int|null $media_id
 * @property int|null $season
 * @property int|null $episode
 * @property array<int|string, string>|null $backdrops title id => uploaded image path or "none"
 */
class Link extends AbstractModel
{
    protected $table = 'marquee_discussions';

    protected $primaryKey = 'discussion_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $casts = ['media_id' => 'integer', 'season' => 'integer', 'episode' => 'integer', 'backdrops' => 'array'];

    /** @var list<int>|null related title ids set in this save, written after it; null = unchanged */
    private ?array $pendingRelated = null;

    /** Set while a discussion save holds this link, so its fields share one copy. */
    public bool $tracked = false;

    /** @return BelongsTo<Discussion, $this> */
    public function discussion(): BelongsTo
    {
        return $this->belongsTo(Discussion::class, 'discussion_id');
    }

    /** @return BelongsTo<Media, $this> */
    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'media_id');
    }

    /** @return BelongsToMany<Media, $this> in the card's order */
    public function related(): BelongsToMany
    {
        return $this->belongsToMany(Media::class, 'marquee_related', 'discussion_id', 'media_id')->orderByPivot('position');
    }

    /** @return list<int> the related titles' ids, in the card's order */
    public function relatedIds(): array
    {
        if ($this->pendingRelated !== null) {
            return $this->pendingRelated;
        }

        return $this->exists ? $this->related->map(fn (Media $media) => $media->id)->all() : [];
    }

    /** @param list<int> $ids */
    public function setRelatedIds(array $ids): void
    {
        $this->pendingRelated = array_values($ids);
    }

    /** @return list<int> the titles on the card: the linked one, then its related titles */
    public function titleIds(): array
    {
        return $this->media_id ? [$this->media_id, ...$this->relatedIds()] : [];
    }

    /** Write the link after its discussion: the row and the related titles, or neither once unlinked. */
    public function persist(Discussion $discussion): void
    {
        $this->tracked = false;

        if (! $this->media_id) {
            if ($this->exists) {
                $this->related()->detach();
                $this->delete();
            }

            return;
        }

        $this->discussion_id = $discussion->id;
        $this->save();

        if ($this->pendingRelated !== null) {
            $this->related()->sync(array_combine(
                $this->pendingRelated,
                array_map(fn ($position) => ['position' => $position], array_keys($this->pendingRelated))
            ));
            $this->pendingRelated = null;
            $this->unsetRelation('related');
        }
    }
}
