import type Media from './models';

/** A person on a card or in an episode: cast, guest star or author. */
export interface Person {
  name: string;
  role?: string | null;
  photo?: string | null;
}

/** One season as the show's details list it. */
export interface SeasonSummary {
  number: number;
  name: string;
  year?: number | null;
  episodes: number;
  poster?: string | null;
  score?: number | null;
}

/** An episode as far as a title needs it: its number, and its name once known. */
export interface EpisodeRef {
  n: number;
  title?: string;
}

/** One episode, as a season's data lists it. */
export interface Episode extends EpisodeRef {
  title: string;
  date?: string | null;
  runtime?: number | null;
  still?: string | null;
  score?: number | null;
  overview?: string | null;
  directors: string[];
  writers: string[];
  guests: Person[];
}

/** A season with its episodes (GET /marquee/media/{id}/seasons/{number}). */
export interface SeasonData {
  number: number;
  name?: string;
  poster?: string | null;
  overview?: string | null;
  url: string;
  episodes: Episode[];
}

export interface Track {
  n: number;
  title: string;
  artist?: string | null;
  explicit?: boolean;
  duration: number;
}

export type TimeToBeat = Partial<Record<'hastily' | 'normally' | 'completely', number>>;

/** Names for a credit line: one, several, or none. */
export type Names = string | string[] | null | undefined;

/**
 * A title's details. Each source fills the fields of its kind (movie, tv,
 * game, music, book); the card reads only its own kind's.
 */
export interface MediaDetails {
  poster?: string | null;
  backdrop?: string | null;
  backdropShot?: boolean;
  url: string;
  overview?: string | null;
  untranslated?: { have: string; want: string } | null;
  wikipedia?: { url?: string } | null;
  translation?: { by?: string } | null;
  trailer?: string | null;
  year?: number | null;
  endYear?: number | null;
  date?: string | null;
  status?: string | null;
  certification?: string | null;
  tagline?: string | null;
  score?: number | null;
  runtime?: number | null;
  genres: string[];
  genreSlugs?: string[];
  networks: string[];
  seasons?: SeasonSummary[];
  crew: Record<string, Names>;
  cast: Person[];
  // Games
  modes?: string[];
  modeSlugs?: string[];
  critic?: number | null;
  users?: number | null;
  type?: string | null;
  platforms: string[];
  screenshots?: string[];
  timeToBeat?: TimeToBeat | null;
  // Music
  recordType?: string;
  trackCount?: number;
  duration: number;
  fans?: number | null;
  artist?: Names;
  label?: Names;
  tracks?: Track[];
  // Books
  subtitle?: string | null;
  rating?: number | null;
  ratingCount: number;
  readers?: number | null;
  subjects: string[];
  authors?: Names;
  originalTitle?: Names;
  publisher?: string | null;
  published?: string | null;
  isbn?: Names;
  pages?: number | null;
  editions: number;
  people: Person[];
}

/** The plain object the composer (and the change-link window) keeps for a picked title. */
export interface PickedTitle {
  id: string | null;
  kind: string;
  externalId: string;
  title: string;
  year: number | null;
  poster: string | null;
  artist: string | null;
  seasons: SeasonSummary[] | null;
  season: number | null;
  episode: EpisodeRef | null;
}

/** What a posted discussion is linked to. */
export interface DiscussionLink {
  media: Media;
  season: number | null;
  episode: number | null;
  seasonData: SeasonData | null;
}

/** A search result (GET /marquee/search). */
export interface SearchResult {
  id: string;
  title: string;
  year: number | null;
  poster: string | null;
  artist?: string | null;
  developer?: string | null;
  subtitle?: string | null;
  platforms?: string[];
  tracks?: number;
  type?: string | null;
}

/** A title stored by POST /marquee/media. */
export interface StoredMedia {
  id: string;
  seasons: SeasonSummary[] | null;
  year?: number | null;
  artist?: string | null;
}
