import Component, { type ComponentAttrs } from 'flarum/common/Component';
import { text, pad } from '../util';
import { loadSeason } from '../api';
import type { Episode, PickedTitle, SeasonData } from '../types';

export interface ScopePickerAttrs extends ComponentAttrs {
  /** Changed in place. */
  link: PickedTitle;
  onchange: (link: PickedTitle) => void;
}

/**
 * For a show: narrow a link to one season, or one episode of it.
 * Attrs: link (changed in place), onchange(link).
 */
export default class ScopePicker extends Component<ScopePickerAttrs> {
  seasonData?: SeasonData;
  loading?: number | null;

  view() {
    const link = this.attrs.link;
    const seasonData = this.seasonData?.number === link.season ? this.seasonData : null;

    if (link.season && !seasonData && link.id) this.load(link.id, link.season);

    return (
      <span className="Marquee-scope">
        <select
          className="FormControl"
          aria-label={text('scope.season_label')}
          value={link.season ? String(link.season) : ''}
          onchange={(e: Event) => this.setSeason(Number((e.target as HTMLSelectElement).value) || null)}
        >
          <option value="">{text('scope.whole_show')}</option>
          {(link.seasons || []).map((s) => (
            <option value={String(s.number)}>{text('scope.season_option', { number: s.number, year: s.year || '' })}</option>
          ))}
        </select>
        {link.season ? (
          <select
            className="FormControl"
            aria-label={text('scope.episode_label')}
            disabled={!seasonData}
            value={link.episode ? String(link.episode.n) : ''}
            onchange={(e: Event) =>
              this.setEpisode(seasonData?.episodes.find((ep) => String(ep.n) === (e.target as HTMLSelectElement).value) || null)
            }
          >
            <option value="">{seasonData ? text('scope.whole_season') : text('scope.loading')}</option>
            {(seasonData?.episodes || []).map((ep) => (
              <option value={String(ep.n)}>{text('scope.episode_option', { number: pad(ep.n), title: ep.title })}</option>
            ))}
          </select>
        ) : null}
      </span>
    );
  }

  load(mediaId: string, number: number) {
    if (this.loading === number) return;
    this.loading = number;
    loadSeason(mediaId, number).then(
      (data) => {
        this.seasonData = data;
        this.loading = null;
        m.redraw();
      },
      // The episode list stays on "Loading"; the next redraw asks again.
      () => (this.loading = null)
    );
  }

  setSeason(number: number | null) {
    Object.assign(this.attrs.link, { season: number, episode: null });
    this.attrs.onchange(this.attrs.link);
  }

  setEpisode(episode: Episode | null) {
    this.attrs.link.episode = episode;
    this.attrs.onchange(this.attrs.link);
  }
}
