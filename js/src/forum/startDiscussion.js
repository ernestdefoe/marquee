import app from 'flarum/forum/app';
import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import { SOURCES, label } from './fixtures';

let pending = null;

/**
 * Open the composer already tagged, titled and linked to a show, season or
 * episode. The composer loads lazily and resets its fields, so the prefill is
 * applied when it is created (see applyPrefill).
 */
export function startDiscussion(link) {
  pending = link;
  return IndexSidebar.prototype.newDiscussionAction.call({}).catch(() => (pending = null));
}

export function applyPrefill(composer) {
  if (!pending) return;
  const { item, season, episode } = pending;
  pending = null;

  const tag = app.store.all('tags').find((t) => t.slug() === SOURCES[item.type].tag);
  if (tag) composer.fields.tags = [tag];
  composer.fields.title(label(item, season, episode));
  composer.fields.marquee = { item, season, episode };
}
