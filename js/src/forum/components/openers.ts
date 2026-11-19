import app from 'flarum/forum/app';
import type Discussion from 'flarum/common/models/Discussion';
import type Media from '../models';
import type { Episode, PickedTitle, SeasonData } from '../types';

/*
 * The windows are chunks of their own, fetched the first time one opens. The
 * imports live here, in the always-loaded bundle, so even the season browser
 * (itself a chunk) opens an episode through a chunk the forum bundle knows.
 */

export function openLinkModal(discussion: Discussion, media?: Media) {
  return app.modal.show(() => import('./LinkModal'), { discussion, media });
}

export function openEpisodeModal(link: PickedTitle, season: SeasonData, episode: Episode) {
  return app.modal.show(() => import('./EpisodeModal'), { link, season, episode });
}

type SeasonBrowserClass = typeof import('./SeasonBrowser').default;

let seasonBrowser: SeasonBrowserClass | null = null;
let loadingSeasonBrowser: Promise<void> | null = null;

/**
 * The season browser, or null while its chunk loads (the card redraws once it
 * has). Only a show's card has one.
 */
export function loadedSeasonBrowser(): SeasonBrowserClass | null {
  if (!seasonBrowser) {
    loadingSeasonBrowser ??= import('./SeasonBrowser').then(
      (module) => {
        seasonBrowser = module.default;
        m.redraw();
      },
      () => {
        // The card works without it; the next redraw tries again.
        loadingSeasonBrowser = null;
      }
    );
  }
  return seasonBrowser;
}
