import Component from 'flarum/common/Component';
import { label, pad } from '../fixtures';

/**
 * For a TV show: narrow the discussion to one season, or one episode of it.
 * Changing either rewrites the title to match.
 */
export default class ScopePicker extends Component {
  view() {
    const fields = this.attrs.composer.fields;
    const { item, season, episode } = fields.marquee;

    const set = (s, e) => {
      fields.marquee = { item, season: s, episode: e };
      fields.title(label(item, s, e));
    };

    return (
      <span className="Marquee-scope">
        <select
          className="FormControl"
          aria-label="Season"
          value={season ? String(season.number) : ''}
          onchange={(ev) =>
            set(
              item.seasons.find((s) => String(s.number) === ev.target.value),
              null
            )
          }
        >
          <option value="">Whole show</option>
          {item.seasons.map((s) => (
            <option value={String(s.number)}>
              Season {s.number} ({s.year})
            </option>
          ))}
        </select>
        {season && (
          <select
            className="FormControl"
            aria-label="Episode"
            value={episode ? String(episode.n) : ''}
            onchange={(ev) => set(season, season.episodes.find((e) => String(e.n) === ev.target.value) || null)}
          >
            <option value="">Whole season</option>
            {season.episodes.map((e) => (
              <option value={String(e.n)}>
                E{pad(e.n)} · {e.title}
              </option>
            ))}
          </select>
        )}
      </span>
    );
  }
}
