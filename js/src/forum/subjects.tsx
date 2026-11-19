import type Mithril from 'mithril';
import type Media from './models';
import type { Episode, MediaDetails, Names, Person, SeasonData, SeasonSummary, TimeToBeat, Track } from './types';
import classList from 'flarum/common/utils/classList';
import abbreviateNumber from 'flarum/common/utils/abbreviateNumber';
import { t, text, img, date, runtime, igdbTerms, showScores, gameBackdrop } from './util';

/** What the card shows: the whole title, one season, or one episode. */
export interface Subject {
  poster?: string | null;
  backdrop: string | null;
  meta: Mithril.Children[];
  score: Mithril.Children;
  credits: [Mithril.Children, string][];
  overview?: string | null;
  untranslated?: { have: string; want: string } | null;
  /** A heading and the people under it. */
  people?: [Mithril.Children, Person[]];
  extra?: Mithril.Children[];
  url: string;
  linkLabel?: Mithril.Children;
}

// The admin can hide every score and rating (on by default).
const ring = (value: number | null | undefined, label: Mithril.Children, kind?: string) =>
  value && showScores() ? (
    <div className={classList('MarqueeHero-score', kind && `MarqueeHero-score--${kind}`)}>
      <span className="MarqueeHero-ring" style={{ '--v': value }}>
        <b>{value}</b>
      </span>
      <span className="MarqueeHero-scoreLabel">{label}</span>
    </div>
  ) : null;

/**
 * A screenshot stands in when IGDB has no wide artwork, unless the admin chose
 * artwork only, or no image at all. Titles stored before 1.16 have no
 * backdropShot: their screenshot backdrop was the first one shown.
 */
const gameBackdropOf = (d: MediaDetails) => {
  const mode = gameBackdrop();
  if (mode === 'none') return null;
  const shot = d.backdropShot ?? (d.screenshots || []).includes(d.backdrop || '');
  return mode === 'artwork' && shot ? null : img(d.backdrop, 'w1280');
};

const credits = (pairs: [Mithril.Children, Names][]): [Mithril.Children, string][] =>
  pairs.filter(([, names]) => names && names.length).map(([label, names]) => [label, ([] as string[]).concat(names || []).join(', ')]);

const years = (d: MediaDetails) => {
  if (d.endYear && d.endYear !== d.year) return `${d.year}–${d.endYear}`;
  return d.status === 'Returning Series' ? `${d.year}–` : d.year;
};

const timeToBeat = (ttb: TimeToBeat | null | undefined) =>
  ttb ? (
    <div className="MarqueeHero-ttb">
      <h2 className="MarqueeHero-sectionTitle">{t('hero.time_to_beat')}</h2>
      <dl>
        {(['hastily', 'normally', 'completely'] as const)
          .filter((key) => ttb[key])
          .map((key) => (
            <div>
              <dt>{t(`hero.ttb_${key}`)}</dt>
              <dd>{t('hero.hours', { count: ttb[key] })}</dd>
            </div>
          ))}
      </dl>
    </div>
  ) : null;

const screenshots = (list: string[] | null | undefined) =>
  list && list.length ? (
    <div>
      <h2 className="MarqueeHero-sectionTitle">{t('hero.screenshots')}</h2>
      <ul className="MarqueeHero-shots">
        {list.map((shot) => (
          <li>
            <a href={img(shot, 'w1280')} target="_blank" rel="noopener noreferrer">
              <img src={img(shot, 'w300')} alt="" loading="lazy" decoding="async" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  ) : null;

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const tracklist = (tracks: Track[] | null | undefined) =>
  tracks && tracks.length ? (
    <div>
      <h2 className="MarqueeHero-sectionTitle">{t('hero.tracklist')}</h2>
      <ol className="MarqueeTracks">
        {tracks.map((track) => (
          <li>
            <em>{track.n}</em>
            <span className="MarqueeTracks-title">
              {track.title}
              {track.artist ? <small> · {track.artist}</small> : null}
            </span>
            {track.explicit ? (
              <abbr className="MarqueeTracks-explicit" title={text('hero.explicit')}>
                E
              </abbr>
            ) : null}
            <time>{clock(track.duration)}</time>
          </li>
        ))}
      </ol>
    </div>
  ) : null;

/** One episode of a show. */
const episodeSubject = (
  d: MediaDetails,
  season: number | null,
  episode: number,
  ep: Episode,
  seasonData: SeasonData,
  summary: SeasonSummary | null | undefined
): Subject => ({
  poster: seasonData.poster || summary?.poster || d.poster,
  backdrop: ep.still ? img(ep.still, 'w1280') : img(d.backdrop, 'w1280'),
  meta: [t('meta.season_episode', { season, episode }), date(ep.date), runtime(ep.runtime)],
  score: ring(ep.score, t('hero.episode_score')),
  credits: credits([
    [t('credits.directed_by'), ep.directors],
    [t('credits.written_by'), ep.writers],
    [t('credits.network'), d.networks],
  ]),
  overview: ep.overview,
  people: [t('hero.guest_stars'), ep.guests],
  url: `${seasonData.url}/episode/${ep.n}`,
});

/** One season of a show. */
const seasonSubject = (d: MediaDetails, season: number, summary: SeasonSummary, seasonData: SeasonData | null): Subject => ({
  poster: seasonData?.poster || summary.poster || d.poster,
  backdrop: img(d.backdrop, 'w1280'),
  meta: [summary.name, summary.year, t('meta.episodes_count', { count: summary.episodes }), d.genres.join(', ')],
  score: ring(summary.score, t('hero.season_score')),
  credits: credits([
    [t('credits.creator'), d.crew.creator],
    [t('credits.network'), d.networks],
  ]),
  overview: seasonData?.overview || d.overview,
  people: [t('hero.cast'), d.cast],
  url: `${d.url}/season/${season}`,
});

/** The whole title, one builder per kind; anything else is a movie. */
const titleSubjects: Record<string, (d: MediaDetails) => Subject> = {
  tv: (d) => ({
    poster: d.poster,
    backdrop: img(d.backdrop, 'w1280'),
    meta: [years(d), d.certification, d.networks.join(', '), t('meta.seasons_count', { count: (d.seasons || []).length }), d.genres.join(', ')],
    score: [ring(d.score, t('hero.user_score')), d.tagline && <p className="MarqueeHero-tagline">{d.tagline}</p>],
    credits: credits([
      [t('credits.creator'), d.crew.creator],
      [t('credits.network'), d.networks],
      [t('credits.status'), d.status],
    ]),
    overview: d.overview,
    people: [t('hero.cast'), d.cast],
    url: d.url,
  }),
  music: (d) => ({
    poster: d.poster,
    backdrop: img(d.backdrop || d.poster, 'w1280'),
    meta: [
      date(d.date),
      t(`meta.record_${d.recordType}`),
      t('meta.tracks_count', { count: d.trackCount }),
      runtime(Math.round(d.duration / 60)),
      d.genres.join(', '),
    ],
    score: d.fans ? (
      <p className="MarqueeHero-fans">
        <i className="fas fa-heart" aria-hidden="true" /> {t('hero.fans', { count: abbreviateNumber(d.fans) })}
      </p>
    ) : null,
    credits: credits([
      [t('credits.artist'), d.artist],
      [t('credits.label'), d.label],
    ]),
    overview: null,
    extra: [tracklist(d.tracks)],
    url: d.url,
    linkLabel: t('hero.listen_on', { source: 'Deezer' }),
  }),
  book: (d) => ({
    poster: d.poster,
    backdrop: img(d.poster, 'w1280'),
    meta: [
      d.year ? t('meta.first_published', { year: d.year }) : null,
      d.pages ? t('meta.pages_count', { count: d.pages }) : null,
      d.editions > 1 ? t('meta.editions_count', { count: d.editions }) : null,
    ],
    score: [
      d.subtitle && <p className="MarqueeHero-tagline">{d.subtitle}</p>,
      d.rating && showScores() ? (
        <p className="MarqueeHero-fans">
          <i className="fas fa-star" aria-hidden="true" /> {t('hero.book_rating', { rating: d.rating, count: abbreviateNumber(d.ratingCount) })}
        </p>
      ) : null,
      d.readers ? (
        <p className="MarqueeHero-fans">
          <i className="fas fa-bookmark" aria-hidden="true" /> {t('hero.want_to_read', { count: abbreviateNumber(d.readers) })}
        </p>
      ) : null,
      d.subjects.length ? (
        <ul className="MarqueeHero-chips">
          {d.subjects.map((subject) => (
            <li>{subject}</li>
          ))}
        </ul>
      ) : null,
    ],
    credits: credits([
      [t('credits.author'), d.authors],
      [t('credits.original_title'), d.originalTitle],
      [t('credits.publisher'), [d.publisher, d.published].filter(Boolean).join(', ')],
      [t('credits.isbn'), d.isbn],
    ]),
    overview: d.overview,
    untranslated: d.untranslated,
    people: [t('hero.authors'), d.people.some((p) => p.photo) ? d.people : []],
    url: d.url,
  }),
  game: (d) => ({
    poster: d.poster,
    backdrop: gameBackdropOf(d),
    meta: [date(d.date), igdbTerms('mode', d.modes, d.modeSlugs).join(', '), igdbTerms('genre', d.genres, d.genreSlugs).join(', ')],
    score: [
      ring(d.critic, t('hero.critic_rating'), 'critic'),
      ring(d.users, t('hero.member_rating'), 'users'),
      // What this version is (Expansion, Remake…) first, as in search results.
      d.type || d.platforms.length ? (
        <ul className="MarqueeHero-chips">
          {d.type ? <li className="MarqueeHero-type">{t(`picker.type.${d.type}`)}</li> : null}
          {d.platforms.map((p) => (
            <li>{p}</li>
          ))}
        </ul>
      ) : null,
    ],
    credits: credits([
      [t('credits.developer'), d.crew.developer],
      [t('credits.publisher'), d.crew.publisher],
      [t('credits.series'), d.crew.series],
    ]),
    overview: d.overview,
    untranslated: d.untranslated,
    extra: [timeToBeat(d.timeToBeat), screenshots(d.screenshots)],
    url: d.url,
  }),
  movie: (d) => ({
    poster: d.poster,
    backdrop: img(d.backdrop, 'w1280'),
    meta: [date(d.date), d.certification, runtime(d.runtime), d.genres.join(', ')],
    score: [ring(d.score, t('hero.user_score')), d.tagline && <p className="MarqueeHero-tagline">{d.tagline}</p>],
    credits: credits([
      [t('credits.director'), d.crew.director],
      [t('credits.writer'), d.crew.writer],
      [t('credits.based_on'), d.crew.basedOn],
    ]),
    overview: d.overview,
    people: [t('hero.cast'), d.cast],
    url: d.url,
  }),
};

/** What the hero is about: the whole title, one season, or one episode. */
export type SubjectArgs = [Media, MediaDetails, number | null, number | null, SeasonData | null];

export function subject(media: Media, d: MediaDetails, season: number | null, episode: number | null, seasonData: SeasonData | null): Subject {
  const summary = season ? (d.seasons || []).find((s) => s.number === season) : undefined;
  const ep = episode && seasonData ? seasonData.episodes.find((e) => e.n === episode) : undefined;

  if (ep && episode && seasonData) return episodeSubject(d, season, episode, ep, seasonData, summary);
  if (summary && season) return seasonSubject(d, season, summary, seasonData);

  return (titleSubjects[media.kind()] || titleSubjects.movie)(d);
}
