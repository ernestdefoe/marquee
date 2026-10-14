import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import classList from 'flarum/common/utils/classList';
import EpisodeModal from './EpisodeModal';
import { pad } from '../fixtures';

/**
 * The seasons of a show inside the hero. Pick a season to list its episodes;
 * pick an episode to open its details.
 */
export default class SeasonBrowser extends Component {
  oninit(vnode) {
    super.oninit(vnode);
    this.open = this.attrs.season?.number ?? null;
  }

  view() {
    const { item, episode: current } = this.attrs;
    const season = item.seasons.find((s) => s.number === this.open);

    return (
      <section className="MarqueeSeasons">
        <h4 className="MarqueeHero-sectionTitle">Seasons</h4>
        <ul className="MarqueeSeasons-list" role="tablist">
          {item.seasons.map((s) => (
            <li>
              <button
                type="button"
                role="tab"
                aria-selected={s.number === this.open ? 'true' : 'false'}
                className={classList('MarqueeSeasons-season', { active: s.number === this.open })}
                onclick={() => (this.open = this.open === s.number ? null : s.number)}
              >
                <img src={s.poster} alt="" loading="lazy" />
                <span>
                  <b>Season {s.number}</b>
                  <small>
                    {s.year} · {s.episodes.length} episodes
                  </small>
                  <small>
                    <i className="fas fa-star" aria-hidden="true" /> {s.score}%
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {season && (
          <ol className="MarqueeSeasons-episodes" role="tabpanel">
            {season.episodes.map((e) => (
              <li>
                <button
                  type="button"
                  className={classList('MarqueeSeasons-episode', { current: e === current })}
                  onclick={() => app.modal.show(EpisodeModal, { item, season, episode: e })}
                >
                  <img src={e.thumb} alt="" loading="lazy" />
                  <span>
                    <b>
                      <em>E{pad(e.n)}</em> {e.title}
                    </b>
                    <small>
                      {e.date} · {e.runtime} · <i className="fas fa-star" aria-hidden="true" /> {e.score}%
                    </small>
                    <span className="MarqueeSeasons-overview">{e.overview}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>
    );
  }
}
