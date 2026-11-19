import app from 'flarum/forum/app';
import type { SearchResult, SeasonData, StoredMedia } from './types';

const url = (path: string) => `${app.forum.attribute('apiUrl')}/marquee/${path}`;
// Callers handle a failure themselves (an empty list, a retry), so core's alert would only add noise.
const quiet = () => {};

export const search = (kind: string, q: string): Promise<SearchResult[]> =>
  app.request<{ data: SearchResult[] }>({ method: 'GET', url: url('search'), params: { kind, q }, errorHandler: quiet }).then((r) => r.data);

export const lookup = (kind: string, id: string): Promise<StoredMedia> =>
  app.request<{ data: StoredMedia }>({ method: 'POST', url: url('media'), body: { kind, id }, errorHandler: quiet }).then((r) => r.data);

/** A stored title's id. Models and picks type it as optional; a title with seasons always has one. */
type MediaId = string | null | undefined;

const seasons = new Map<string, Promise<SeasonData>>();

/** One season with its episodes, fetched at most once per page load. */
export const loadSeason = (mediaId: MediaId, number: number): Promise<SeasonData> => {
  const key = `${mediaId}:${number}`;
  let season = seasons.get(key);
  if (!season) {
    season = app.request<{ data: SeasonData }>({ method: 'GET', url: url(`media/${mediaId}/seasons/${number}`), errorHandler: quiet }).then(
      (r) => r.data,
      (e: unknown) => {
        seasons.delete(key);
        throw e;
      }
    );
    seasons.set(key, season);
  }
  return season;
};

/** A season that arrived with the discussion needs no request. */
export const primeSeason = (mediaId: MediaId, data: SeasonData | null) => {
  if (data) seasons.set(`${mediaId}:${data.number}`, Promise.resolve(data));
};
