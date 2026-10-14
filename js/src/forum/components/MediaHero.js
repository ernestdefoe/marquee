import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import listItems from 'flarum/common/helpers/listItems';
import classList from 'flarum/common/utils/classList';
import tagsLabel from 'ext:flarum/tags/common/helpers/tagsLabel';
import SeasonBrowser from './SeasonBrowser';
import EpisodeModal from './EpisodeModal';
import { SOURCES, label, episodeUrl } from '../fixtures';
import { startDiscussion } from '../startDiscussion';

const ring = ({ value, label, kind }) => (
  <div className={classList('MarqueeHero-score', kind && `MarqueeHero-score--${kind}`)}>
    <span className="MarqueeHero-ring" style={{ '--v': value }}>
      <b>{value}</b>
    </span>
    <span className="MarqueeHero-scoreLabel">{label}</span>
  </div>
);

/** What the hero is about: the whole title, one season, or one episode. */
function subject({ item, season, episode }) {
  if (episode) {
    return {
      poster: season.poster,
      backdrop: episode.still,
      meta: [`Season ${season.number}, Episode ${episode.n}`, episode.date, episode.runtime],
      score: ring({ value: episode.score, label: ['TMDB', <br />, 'episode score'] }),
      credits: [
        ['Directed by', episode.directors.join(', ')],
        ['Written by', episode.writers.join(', ')],
        ['Network', item.credits.find(([k]) => k === 'Network')?.[1]],
      ],
      overview: episode.overview,
      people: ['Guest stars', episode.guests],
      url: episodeUrl(item, season, episode),
    };
  }

  if (season) {
    return {
      poster: season.poster,
      backdrop: item.backdrop,
      meta: [`Season ${season.number}`, season.year, `${season.episodes.length} episodes`, item.genres.join(', ')],
      score: ring({ value: season.score, label: ['TMDB', <br />, 'season score'] }),
      credits: item.credits,
      overview: season.overview,
      people: ['Cast', item.cast],
      url: `${item.url}/season/${season.number}`,
    };
  }

  return {
    poster: item.poster,
    backdrop: item.backdrop,
    meta: [...item.meta, item.genres.join(', ')],
    score:
      item.type === 'game'
        ? [
            ring({ value: item.critic, label: ['Critic', <br />, 'rating'], kind: 'critic' }),
            ring({ value: item.users, label: ['IGDB member', <br />, 'rating'], kind: 'users' }),
            <ul className="MarqueeHero-chips">
              {item.platforms.map((p) => (
                <li>{p}</li>
              ))}
            </ul>,
          ]
        : [ring({ value: item.score, label: ['TMDB', <br />, 'user score'] }), item.tagline && <p className="MarqueeHero-tagline">{item.tagline}</p>],
    credits: item.credits,
    overview: item.overview,
    people: item.cast && ['Cast', item.cast],
    url: item.url,
  };
}

/**
 * Replaces the discussion hero when the discussion is linked to a movie,
 * show (or one of its seasons or episodes) or game. Keeps the core title and
 * badge classes so themes still apply.
 */
export default class MediaHero extends Component {
  view() {
    const { discussion, link } = this.attrs;
    const { item, season, episode } = link;
    const source = SOURCES[item.type];
    const s = subject(link);
    const badges = discussion.badges().toArray();
    const tags = discussion.tags?.();
    const scoped = season || episode;

    return (
      <header className={classList('Hero DiscussionHero MarqueeHero', `MarqueeHero--${item.type}`, { 'MarqueeHero--episode': episode })}>
        <div className="MarqueeHero-backdrop" style={{ backgroundImage: `url(${s.backdrop})` }} />
        <div className="container MarqueeHero-inner">
          <img className="MarqueeHero-poster" src={s.poster} alt="" fetchpriority="high" />
          <div className="MarqueeHero-body">
            <ul className="DiscussionHero-items">
              {tags && tags.length ? <li className="item-tags">{tagsLabel(tags, { link: true })}</li> : null}
              {badges.length ? (
                <li className="item-badges">
                  <ul className="DiscussionHero-badges badges">{listItems(badges)}</ul>
                </li>
              ) : null}
              {scoped ? (
                <li className="MarqueeHero-parent">
                  <i className="fas fa-tv" aria-hidden="true" /> {label(item)}
                </li>
              ) : null}
            </ul>
            <h1 className="DiscussionHero-title">{discussion.title()}</h1>
            <ul className="MarqueeHero-meta">
              {s.meta.map((part) => (
                <li>{part}</li>
              ))}
            </ul>

            <div className="MarqueeHero-scores">{s.score}</div>

            <dl className="MarqueeHero-credits">
              {s.credits
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>

            <p className="MarqueeHero-overview">{s.overview}</p>

            {s.people && s.people[1].length ? (
              <div>
                <h4 className="MarqueeHero-sectionTitle">{s.people[0]}</h4>
                <ul className="MarqueeHero-cast">
                  {s.people[1].map((c) => (
                    <li>
                      <img src={c.photo} alt="" loading="lazy" />
                      <b>{c.name}</b>
                      <span>{c.role}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {item.seasons && <SeasonBrowser item={item} season={season} episode={episode} />}

            <div className="MarqueeHero-links">
              <a className="Button Button--primary" href={s.url} target="_blank" rel="noopener noreferrer">
                View on {source.source}
              </a>
              {episode ? (
                <button type="button" className="Button" onclick={() => app.modal.show(EpisodeModal, { item, season, episode })}>
                  <i className="fas fa-info-circle" aria-hidden="true" /> Episode details
                </button>
              ) : (
                <a className="Button" href={s.url} target="_blank" rel="noopener noreferrer">
                  <i className="fas fa-play" aria-hidden="true" /> Trailer
                </a>
              )}
              {scoped ? (
                <button type="button" className="Button" onclick={() => startDiscussion({ item })}>
                  <i className="fas fa-tv" aria-hidden="true" /> Discuss the whole show
                </button>
              ) : null}
              <span className="MarqueeHero-attribution">
                {source.source === 'TMDB' ? 'Data and images from TMDB. Not endorsed or certified by TMDB.' : 'Game data from IGDB.com'}
              </span>
            </div>
          </div>
        </div>
      </header>
    );
  }
}
