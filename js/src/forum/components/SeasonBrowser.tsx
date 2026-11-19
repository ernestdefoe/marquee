import Component, { type ComponentAttrs } from 'flarum/common/Component';
import type Mithril from 'mithril';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import classList from 'flarum/common/utils/classList';
import { t, img, pad, date, runtime, showScores } from '../util';
import { loadSeason } from '../api';
import { seasonRequest } from '../refs';
import { openEpisodeModal } from './openers';
import type { Episode, PickedTitle, SeasonData, SeasonSummary } from '../types';

export interface SeasonBrowserAttrs extends ComponentAttrs {
  link: PickedTitle;
  /** The linked season and episode, if the discussion is about one. */
  season: number | null;
  episode: number | null;
}

/** Bring the linked episode into view inside the episode list, without moving the page. */
const scrollIntoList = (el: HTMLElement) => {
  const list = el.closest<HTMLElement>('.MarqueeSeasons-episodes');
  if (list) list.scrollTop = el.offsetTop - list.offsetTop - (list.clientHeight - el.offsetHeight) / 2;
};

/**
 * A show's seasons inside the hero. PickedTitle a season to list its episodes (fetched
 * the first time anyone opens it); pick an episode to open its details.
 */
export default class SeasonBrowser extends Component<SeasonBrowserAttrs> {
  data!: Record<number, SeasonData | 'failed'>;
  openNumber: number | null = null;

  oninit(vnode: Mithril.Vnode<SeasonBrowserAttrs, this>) {
    super.oninit(vnode);
    this.data = {};
    this.toggle(this.attrs.season);
  }

  toggle(number: number | null) {
    this.openNumber = this.openNumber === number ? null : number;
    if (!number || this.data[number]) return;

    loadSeason(this.attrs.link.id, number).then(
      (data) => {
        this.data[number] = data;
        m.redraw();
      },
      () => {
        // Said in the panel (hero.season_failed), where the episodes would have been.
        this.data[number] = 'failed';
        m.redraw();
      }
    );
  }

  view() {
    // A season chip in a post asked for this season.
    if (seasonRequest.number && seasonRequest.number !== this.openNumber) {
      const number = seasonRequest.number;
      seasonRequest.number = null;
      this.openNumber = null;
      this.toggle(number);
    }

    return (
      <section className="MarqueeSeasons">
        <h2 className="MarqueeHero-sectionTitle">{t('hero.seasons')}</h2>
        <ul className="MarqueeSeasons-list" role="tablist">
          {(this.attrs.link.seasons || []).map((s) => (
            <li>{this.seasonButton(s)}</li>
          ))}
        </ul>

        {this.openNumber ? (
          <div className="MarqueeSeasons-panel" role="tabpanel">
            {this.panel(this.data[this.openNumber])}
          </div>
        ) : null}
      </section>
    );
  }

  /** "This discussion", beside the season or episode it is about. */
  here() {
    return <span className="MarqueeSeasons-here">{t('hero.this_discussion')}</span>;
  }

  seasonButton(s: SeasonSummary) {
    const { season: linked, episode: current } = this.attrs;

    return (
      <button
        type="button"
        role="tab"
        aria-selected={String(s.number === this.openNumber)}
        aria-current={s.number === linked ? 'true' : undefined}
        className={classList('MarqueeSeasons-season', { active: s.number === this.openNumber, linked: s.number === linked })}
        onclick={() => this.toggle(s.number)}
      >
        {s.poster ? <img src={img(s.poster, 'w92')} alt="" loading="lazy" decoding="async" /> : <span className="Marquee-noPoster" />}
        <span>
          <b>{s.name}</b>
          {s.number === linked && !current ? this.here() : null}
          <small>{[s.year, t('meta.episodes_count', { count: s.episodes })].filter(Boolean).map((p, i) => [i ? ' · ' : '', p])}</small>
          {s.score && showScores() ? (
            <small>
              <i className="fas fa-star" aria-hidden="true" /> {s.score}%
            </small>
          ) : null}
        </span>
      </button>
    );
  }

  /** The open season's episodes, once they have arrived. */
  panel(season: SeasonData | 'failed' | undefined) {
    if (!season) return <LoadingIndicator size="small" display="block" />;
    if (season === 'failed') return <p className="MarqueeSeasons-failed">{t('hero.season_failed')}</p>;

    return (
      <ol className="MarqueeSeasons-episodes">
        {season.episodes.map((e) => (
          <li>{this.episodeButton(season, e)}</li>
        ))}
      </ol>
    );
  }

  episodeButton(season: SeasonData, e: Episode) {
    const { link, season: linked, episode: current } = this.attrs;
    const isCurrent = season.number === linked && e.n === current;

    return (
      <button
        type="button"
        aria-current={isCurrent ? 'true' : undefined}
        className={classList('MarqueeSeasons-episode', { current: isCurrent })}
        oncreate={(vnode: Mithril.VnodeDOM) => {
          if (vnode.dom.classList.contains('current')) scrollIntoList(vnode.dom as HTMLElement);
        }}
        onclick={() => openEpisodeModal(link, season, e)}
      >
        {e.still ? <img src={img(e.still, 'w300')} alt="" loading="lazy" decoding="async" /> : <span className="Marquee-noStill" />}
        <span>
          <b>
            <em>{t('meta.episode_code', { episode: pad(e.n) })}</em> {e.title}
          </b>
          {isCurrent ? this.here() : null}
          <small>
            {[date(e.date), runtime(e.runtime)].filter(Boolean).join(' · ')}
            {e.score && showScores() ? [' · ', <i className="fas fa-star" aria-hidden="true" />, ` ${e.score}%`] : null}
          </small>
          {e.overview ? <span className="MarqueeSeasons-overview">{e.overview}</span> : null}
        </span>
      </button>
    );
  }
}
