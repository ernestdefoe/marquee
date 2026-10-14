import Component from 'flarum/common/Component';
import listItems from 'flarum/common/helpers/listItems';
import classList from 'flarum/common/utils/classList';
import tagsLabel from 'ext:flarum/tags/common/helpers/tagsLabel';
import { SOURCES } from '../fixtures';

const ring = ({ value, label, kind }) => (
  <div className={classList('MarqueeHero-score', kind && `MarqueeHero-score--${kind}`)}>
    <span className="MarqueeHero-ring" style={{ '--v': value }}>
      <b>{value}</b>
    </span>
    <span className="MarqueeHero-scoreLabel">{label}</span>
  </div>
);

/**
 * Replaces the discussion hero when the discussion is linked to a movie,
 * show or game. Keeps the core title and badge classes so themes still apply.
 */
export default class MediaHero extends Component {
  view() {
    const { discussion, item } = this.attrs;
    const source = SOURCES[item.type];
    const badges = discussion.badges().toArray();
    const tags = discussion.tags?.();

    return (
      <header className={classList('Hero DiscussionHero MarqueeHero', `MarqueeHero--${item.type}`)}>
        <div className="MarqueeHero-backdrop" style={{ backgroundImage: `url(${item.backdrop})` }} />
        <div className="container MarqueeHero-inner">
          <img className="MarqueeHero-poster" src={item.poster} alt="" fetchpriority="high" />
          <div className="MarqueeHero-body">
            <ul className="DiscussionHero-items">
              {tags && tags.length ? <li className="item-tags">{tagsLabel(tags, { link: true })}</li> : null}
              {badges.length ? (
                <li className="item-badges">
                  <ul className="DiscussionHero-badges badges">{listItems(badges)}</ul>
                </li>
              ) : null}
            </ul>
            <h1 className="DiscussionHero-title">{discussion.title()}</h1>
            <ul className="MarqueeHero-meta">
              {[...item.meta, item.genres.join(', ')].map((part) => (
                <li>{part}</li>
              ))}
            </ul>

            <div className="MarqueeHero-scores">
              {item.type === 'game'
                ? [
                    ring({ value: item.critic, label: ['Critic', <br />, 'rating'], kind: 'critic' }),
                    ring({ value: item.users, label: ['IGDB member', <br />, 'rating'], kind: 'users' }),
                    <ul className="MarqueeHero-chips">
                      {item.platforms.map((p) => (
                        <li>{p}</li>
                      ))}
                    </ul>,
                  ]
                : [
                    ring({ value: item.score, label: ['TMDB', <br />, 'user score'] }),
                    item.tagline && <p className="MarqueeHero-tagline">{item.tagline}</p>,
                  ]}
            </div>

            <dl className="MarqueeHero-credits">
              {item.credits.map(([k, v]) => (
                <div>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>

            <p className="MarqueeHero-overview">{item.overview}</p>

            {item.cast && (
              <ul className="MarqueeHero-cast">
                {item.cast.map((c) => (
                  <li>
                    <img src={c.photo} alt="" loading="lazy" />
                    <b>{c.name}</b>
                    <span>{c.role}</span>
                  </li>
                ))}
              </ul>
            )}

            <div className="MarqueeHero-links">
              <a className="Button Button--primary" href={item.url} target="_blank" rel="noopener noreferrer">
                View on {source.source}
              </a>
              <a className="Button" href={item.url} target="_blank" rel="noopener noreferrer">
                <i className="fas fa-play" aria-hidden="true" /> Trailer
              </a>
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
