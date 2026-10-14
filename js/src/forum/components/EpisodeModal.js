import app from 'flarum/forum/app';
import Modal from 'flarum/common/components/Modal';
import Button from 'flarum/common/components/Button';
import { pad, episodeUrl } from '../fixtures';
import { startDiscussion } from '../startDiscussion';

/**
 * One episode's details: still, air date, runtime, score, crew, guest stars
 * and synopsis, with previous / next to move through the season.
 */
export default class EpisodeModal extends Modal {
  oninit(vnode) {
    super.oninit(vnode);
    this.episode = this.attrs.episode;
  }

  className() {
    return 'MarqueeEpisodeModal Modal--large';
  }

  title() {
    return `S${pad(this.attrs.season.number)} · E${pad(this.episode.n)}  ${this.episode.title}`;
  }

  content() {
    const { item, season } = this.attrs;
    const e = this.episode;
    const list = season.episodes;
    const index = list.indexOf(e);

    return [
      <div className="MarqueeEpisode-still" style={{ backgroundImage: `url(${e.still})` }}>
        <span className="MarqueeEpisode-badge">
          {item.title} · Season {season.number}, Episode {e.n}
        </span>
      </div>,
      <div className="Modal-body MarqueeEpisode-body">
        <ul className="MarqueeEpisode-meta">
          <li>{e.date}</li>
          <li>{e.runtime}</li>
          <li>
            <i className="fas fa-star" aria-hidden="true" /> {e.score}% on TMDB
          </li>
        </ul>

        <p className="MarqueeEpisode-overview">{e.overview}</p>

        <dl className="MarqueeEpisode-credits">
          <div>
            <dt>Directed by</dt>
            <dd>{e.directors.join(', ')}</dd>
          </div>
          <div>
            <dt>Written by</dt>
            <dd>{e.writers.join(', ')}</dd>
          </div>
        </dl>

        {e.guests.length ? (
          <div>
            <h4 className="MarqueeEpisode-heading">Guest stars</h4>
            <ul className="MarqueeEpisode-guests">
              {e.guests.map((g) => (
                <li>
                  <img src={g.photo} alt="" loading="lazy" />
                  <span>
                    <b>{g.name}</b>
                    <small>{g.role}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="MarqueeEpisode-actions">
          <Button className="Button" icon="fas fa-chevron-left" disabled={index === 0} onclick={() => (this.episode = list[index - 1])}>
            Previous
          </Button>
          <Button
            className="Button"
            icon="fas fa-chevron-right"
            disabled={index === list.length - 1}
            onclick={() => (this.episode = list[index + 1])}
          >
            Next
          </Button>
          <span className="MarqueeEpisode-spacer" />
          <a className="Button" href={episodeUrl(item, season, e)} target="_blank" rel="noopener noreferrer">
            View on TMDB
          </a>
          <Button
            className="Button Button--primary"
            icon="fas fa-edit"
            onclick={() => {
              app.modal.close();
              startDiscussion({ item, season, episode: e });
            }}
          >
            Discuss this episode
          </Button>
        </div>
      </div>,
    ];
  }
}
