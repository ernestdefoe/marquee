import IndexSidebar from 'flarum/forum/components/IndexSidebar';
import type ComposerState from 'flarum/forum/states/ComposerState';
import { composerFields, tagForKind, titleFor } from '../util';
import type { PickedTitle } from '../types';

let pending: PickedTitle | null = null;

/**
 * Open the composer already tagged, titled and linked. Exported for companion
 * extensions (Curio's Show it off): `flarum.reg.get('ernestdefoe-marquee',
 * 'forum/utils/startDiscussion').startDiscussion(link)`, under utils/ so the
 * module registry carries it. The composer loads
 * lazily and starts with empty fields, so the prefill is applied when it is
 * created (applyPrefill), before the tag picker would open.
 */
export function startDiscussion(link: PickedTitle): Promise<unknown> {
  pending = link;
  // No composer (a guest gets the log-in window instead): drop the prefill, nothing to say.
  return IndexSidebar.prototype.newDiscussionAction.call({}).catch(() => (pending = null));
}

export function applyPrefill(composer: ComposerState) {
  if (!pending) return;
  const link = pending;
  pending = null;

  const fields = composerFields(composer);
  const tag = tagForKind(link.kind);
  if (tag) fields.tags = [tag];
  fields.title(titleFor(link, link.season, link.episode));
  fields.marquee = link;
}
