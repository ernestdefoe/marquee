// Prototype sample data. The real build fetches this from TMDB / IGDB once,
// when a discussion is posted, and stores it on the forum.
import { tmdb } from './tmdb';
import TLOU_SEASONS from './fixtures-tlou';

const steam = (app, file) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${app}/${file}.jpg`;

const person = (name, role, photo) => ({ name, role, photo: photo && tmdb('w185', photo) });

export const SOURCES = {
  movie: { label: 'Movie', source: 'TMDB', tag: 'movies', placeholder: 'Search for a movie by title' },
  tv: { label: 'TV', source: 'TMDB', tag: 'tv', placeholder: 'Search for a TV show by title' },
  game: { label: 'Game', source: 'IGDB', tag: 'games', placeholder: 'Search for a game by title' },
};

export const ITEMS = [
  {
    id: 'tmdb-movie-693134',
    type: 'movie',
    title: 'Dune: Part Two',
    year: 2024,
    poster: tmdb('w342', '6izwz7rsy95ARzTR3poZ8H6c5pp'),
    backdrop: tmdb('w1280', 'eZ239CUp1d6OryZEBPnO2n87gMG'),
    meta: ['1 March 2024', 'PG-13', '2h 46m'],
    genres: ['Science Fiction', 'Adventure'],
    score: 81,
    tagline: 'Long live the fighters.',
    credits: [
      ['Director', 'Denis Villeneuve'],
      ['Screenplay', 'Denis Villeneuve, Jon Spaihts'],
      ['Based on', 'Dune by Frank Herbert'],
    ],
    cast: [
      person('Timothée Chalamet', 'Paul Atreides', 'dFxpwRpmzpVfP1zjluH68DeQhyj'),
      person('Zendaya', 'Chani', 'qGkBlyn1AwQpuFnRARMRwj0iHZp'),
      person('Rebecca Ferguson', 'Lady Jessica', 'ra53cM1aNmdH0aFhj8yBqPOj2fb'),
      person('Javier Bardem', 'Stilgar', 'zfRID0jx8DKBluPGU9xtk9sZWUt'),
      person('Josh Brolin', 'Gurney Halleck', 'sX2etBbIkxRaCsATyw5ZpOVMPTD'),
      person('Austin Butler', 'Feyd-Rautha', 'atdAs4pFGjUQ4m2W8kJYly7N6cC'),
    ],
    overview:
      'Paul Atreides unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.',
    url: 'https://www.themoviedb.org/movie/693134',
  },
  {
    id: 'tmdb-movie-438631',
    type: 'movie',
    title: 'Dune',
    year: 2021,
    poster: tmdb('w342', 'v1tRXZ4JtD2Iv6fjkPvT4GiwslV'),
    backdrop: tmdb('w1280', 'zRKQW58MBEY078AxkHxEJzUskCl'),
    meta: ['22 October 2021', 'PG-13', '2h 35m'],
    genres: ['Science Fiction', 'Adventure'],
    score: 78,
    tagline: 'It begins.',
    credits: [
      ['Director', 'Denis Villeneuve'],
      ['Screenplay', 'Jon Spaihts, Denis Villeneuve, Eric Roth'],
      ['Based on', 'Dune by Frank Herbert'],
    ],
    cast: [
      person('Timothée Chalamet', 'Paul Atreides', 'dFxpwRpmzpVfP1zjluH68DeQhyj'),
      person('Rebecca Ferguson', 'Lady Jessica', 'ra53cM1aNmdH0aFhj8yBqPOj2fb'),
      person('Oscar Isaac', 'Leto Atreides', 'dW5U5yrIIPmMjRThR9KT2xH6nTz'),
      person('Jason Momoa', 'Duncan Idaho', '3troAR6QbSb6nUFMDu61YCCWLKa'),
      person('Stellan Skarsgård', 'Baron Harkonnen', 'mW7xmtGV4y79kQGn0zkKVGDMAmw'),
    ],
    overview:
      'Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe to ensure the future of his family and his people.',
    url: 'https://www.themoviedb.org/movie/438631',
  },
  {
    id: 'tmdb-movie-841',
    type: 'movie',
    title: 'Dune',
    year: 1984,
    poster: tmdb('w342', '4kJmUCE7mkVJjXa7A0g2rY4IGTm'),
    backdrop: tmdb('w1280', '5wJ2tckpvwcxGCAgZiccodwEJpf'),
    meta: ['14 December 1984', 'PG-13', '2h 17m'],
    genres: ['Science Fiction', 'Adventure'],
    score: 63,
    tagline: 'A world beyond your experience, beyond your imagination.',
    credits: [
      ['Director', 'David Lynch'],
      ['Screenplay', 'David Lynch'],
      ['Based on', 'Dune by Frank Herbert'],
    ],
    cast: [
      person('Kyle MacLachlan', 'Paul Atreides', '7gNyx8fYAUdOp2jpCEH3dyFbeV'),
      person('Francesca Annis', 'Lady Jessica', 'rtbYkuenkq8Kfc5LwzWYtVD3eNH'),
      person('Patrick Stewart', 'Gurney Halleck', 'ufqtnLh3JJjPbEgxEag3MM5nZyv'),
      person('Linda Hunt', 'Shadout Mapes', 'leiVNArKBQTmE5ROovNJWiW9kfk'),
      person('José Ferrer', 'Padishah Emperor', 'mMOxqZz7Te7SHTd7AGqpjyyykb7'),
    ],
    overview:
      'In the year 10,191, the most precious substance in the universe is the spice Melange. Paul Atreides and his family take control of the desert planet Arrakis, the only source of the spice.',
    url: 'https://www.themoviedb.org/movie/841',
  },
  {
    id: 'tmdb-tv-100088',
    type: 'tv',
    title: 'The Last of Us',
    year: 2023,
    poster: tmdb('w342', 'dmo6TYuuJgaYinXBPjrgG9mB5od'),
    backdrop: tmdb('w1280', 'lY2DhbA7Hy44fAKddr06UrXWWaQ'),
    meta: ['2023–', 'HBO', '2 seasons'],
    genres: ['Drama', 'Sci-Fi & Fantasy'],
    score: 86,
    tagline: 'When you’re lost in the darkness, look for the light.',
    credits: [
      ['Created by', 'Craig Mazin, Neil Druckmann'],
      ['Network', 'HBO'],
      ['Status', 'Returning series'],
    ],
    cast: [
      person('Bella Ramsey', 'Ellie Williams', 'vDbgxc7RYawpB1wK7JDEj62j06H'),
      person('Pedro Pascal', 'Joel Miller', 'oKcMbVn0NJTNzQt0ClKKvVXkm60'),
      person('Gabriel Luna', 'Tommy Miller', 'bIPORtYxTJPEUJIThbZrpqf4A11'),
      person('Isabela Merced', 'Dina', '7O5GWIH8IHwU4kGZIhC3JkGDiZr'),
      person('Young Mazino', 'Jesse', 'cRuVRx1DMe2hBkz5pssVqdpCtaQ'),
      person('Rutina Wesley', 'Maria', 'ujpdNAKxlv6TRI2mm0k3eSSZJkB'),
    ],
    overview:
      'Twenty years after modern civilization has been destroyed, Joel, a hardened survivor, is hired to smuggle Ellie, a 14-year-old girl, out of an oppressive quarantine zone. What starts as a small job soon becomes a brutal, heartbreaking journey.',
    url: 'https://www.themoviedb.org/tv/100088',
    seasons: TLOU_SEASONS,
  },
  {
    id: 'igdb-elden-ring',
    type: 'game',
    title: 'Elden Ring',
    year: 2022,
    poster: steam(1245620, 'library_600x900'),
    backdrop: steam(1245620, 'library_hero'),
    meta: ['25 February 2022', 'Single player', 'Online co-op'],
    genres: ['Role-playing (RPG)', 'Adventure'],
    critic: 95,
    users: 89,
    platforms: ['PC', 'PlayStation 5', 'PlayStation 4', 'Xbox Series X|S', 'Xbox One'],
    credits: [
      ['Developer', 'FromSoftware'],
      ['Publisher', 'Bandai Namco Entertainment'],
      ['Worldbuilding', 'George R. R. Martin'],
    ],
    overview:
      'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between. A vast open world where open fields and huge dungeons connect seamlessly.',
    url: 'https://www.igdb.com/games/elden-ring',
  },
  {
    id: 'igdb-baldurs-gate-3',
    type: 'game',
    title: "Baldur's Gate 3",
    year: 2023,
    poster: steam(1086940, 'library_600x900'),
    backdrop: steam(1086940, 'library_hero'),
    meta: ['3 August 2023', 'Single player', 'Co-op up to 4'],
    genres: ['Role-playing (RPG)', 'Turn-based strategy'],
    critic: 96,
    users: 93,
    platforms: ['PC', 'PlayStation 5', 'Xbox Series X|S', 'Mac'],
    credits: [
      ['Developer', 'Larian Studios'],
      ['Publisher', 'Larian Studios'],
      ['Based on', 'Dungeons & Dragons'],
    ],
    overview:
      'Gather your party and return to the Forgotten Realms in a tale of fellowship and betrayal, sacrifice and survival, and the lure of absolute power.',
    url: 'https://www.igdb.com/games/baldurs-gate-3',
  },
  {
    id: 'igdb-the-last-of-us-part-i',
    type: 'game',
    title: 'The Last of Us Part I',
    year: 2022,
    poster: steam(1888930, 'library_600x900'),
    backdrop: steam(1888930, 'library_hero'),
    meta: ['2 September 2022', 'Single player'],
    genres: ['Adventure', 'Shooter'],
    critic: 89,
    users: 88,
    platforms: ['PlayStation 5', 'PC'],
    credits: [
      ['Developer', 'Naughty Dog'],
      ['Publisher', 'Sony Interactive Entertainment'],
      ['Series', 'The Last of Us'],
    ],
    overview:
      'Experience the emotional storytelling and unforgettable characters in The Last of Us, rebuilt from the ground up. In a ravaged civilization, Joel is hired to smuggle 14-year-old Ellie out of a military quarantine zone.',
    url: 'https://www.igdb.com/games/the-last-of-us-part-i',
  },
  {
    id: 'igdb-the-last-of-us-part-ii-remastered',
    type: 'game',
    title: 'The Last of Us Part II Remastered',
    year: 2024,
    poster: steam(2531310, 'library_600x900'),
    backdrop: steam(2531310, 'library_hero'),
    meta: ['19 January 2024', 'Single player'],
    genres: ['Adventure', 'Shooter'],
    critic: 91,
    users: 85,
    platforms: ['PlayStation 5', 'PC'],
    credits: [
      ['Developer', 'Naughty Dog'],
      ['Publisher', 'Sony Interactive Entertainment'],
      ['Series', 'The Last of Us'],
    ],
    overview:
      'Five years after their dangerous journey across the post-pandemic United States, Ellie and Joel have settled down in Jackson, Wyoming, until a violent event disrupts that peace.',
    url: 'https://www.igdb.com/games/the-last-of-us-part-ii-remastered',
  },
  {
    id: 'igdb-hades-ii',
    type: 'game',
    title: 'Hades II',
    year: 2025,
    poster: steam(1145350, 'library_600x900'),
    backdrop: steam(1145350, 'library_hero'),
    meta: ['25 September 2025', 'Single player'],
    genres: ['Roguelike', 'Action'],
    critic: 94,
    users: 90,
    platforms: ['PC', 'Mac', 'Nintendo Switch', 'Nintendo Switch 2'],
    credits: [
      ['Developer', 'Supergiant Games'],
      ['Publisher', 'Supergiant Games'],
      ['Series', 'Hades'],
    ],
    overview:
      'Battle beyond the Underworld using dark sorcery to take on the Titan of Time in this bewitching sequel to the award-winning rogue-like dungeon crawler.',
    url: 'https://www.igdb.com/games/hades-ii',
  },
];

export const pad = (n) => String(n).padStart(2, '0');

/** The discussion title for a show, one of its seasons, or one episode. */
export const label = (item, season, episode) => {
  const base = `${item.title} (${item.year})`;
  if (episode) return `${base} S${pad(season.number)}E${pad(episode.n)}: ${episode.title}`;
  if (season) return `${base} Season ${season.number}`;
  return base;
};

/**
 * What a discussion is linked to: { item, season?, episode? }.
 * Stand-in for the stored link: the real build keeps the ids on the discussion.
 */
export const forDiscussion = (discussion) => {
  const title = discussion?.title?.();
  if (!title) return undefined;
  for (const item of ITEMS) {
    if (label(item) === title) return { item };
    for (const season of item.seasons || []) {
      if (label(item, season) === title) return { item, season };
      const episode = season.episodes.find((e) => label(item, season, e) === title);
      if (episode) return { item, season, episode };
    }
  }
};

export const episodeUrl = (item, season, episode) => `${item.url}/season/${season.number}/episode/${episode.n}`;

// Stand-in for the forum's search endpoint.
export const search = (query, type) => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return ITEMS.filter((item) => (!type || item.type === type) && item.title.toLowerCase().includes(q));
};
