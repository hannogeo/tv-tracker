const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_KEY = CONFIG.tmdb.apiKey;
const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

async function tmdbFetch(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

function getPosterUrl(path) {
  return path ? `${POSTER_BASE}${path}` : null;
}

function getBackdropUrl(path) {
  return path ? `${BACKDROP_BASE}${path}` : null;
}

const COMMON_CORRECTIONS = {
  'gide': 'guide', 'muder': 'murder', 'muderer': 'murderer',
  'recieve': 'receive', 'reciept': 'receipt', 'reciepe': 'recipe',
  'beleive': 'believe', 'beleif': 'belief', 'wierd': 'weird',
  'freind': 'friend', 'calender': 'calendar', 'ocured': 'occurred',
  'ocurred': 'occurred', 'ocur': 'occur', 'thier': 'their',
  'theif': 'thief', 'yeild': 'yield', 'acheive': 'achieve',
  'acheiving': 'achieving', 'adress': 'address', 'alot': 'a lot',
  'beggining': 'beginning', 'begining': 'beginning', 'definately': 'definitely',
  'definatly': 'definitely', 'definetly': 'definitely', 'dissapoint': 'disappoint',
  'dissapear': 'disappear', 'embarass': 'embarrass', 'enviroment': 'environment',
  'goverment': 'government', 'happend': 'happened', 'harrass': 'harass',
  'imaginery': 'imaginary', 'jewlery': 'jewelry', 'jewellery': 'jewellery',
  'knowlege': 'knowledge', 'libary': 'library', 'lisence': 'license',
  'maintainance': 'maintenance', 'neccessary': 'necessary', 'neighbour': 'neighbor',
  'occassion': 'occasion', 'occured': 'occurred', 'oppertunity': 'opportunity',
  'paralel': 'parallel', 'paralell': 'parallel', 'priviledge': 'privilege',
  'priveledge': 'privilege', 'pronounciation': 'pronunciation',
  'rythm': 'rhythm', 'scedule': 'schedule', 'schedual': 'schedule',
  'seperate': 'separate', 'succesful': 'successful', 'sucessful': 'successful',
  'tommorow': 'tomorrow', 'tommorrow': 'tomorrow', 'truely': 'truly',
  'untill': 'until', 'vegatarian': 'vegetarian', 'vegeterian': 'vegetarian',
  'vigorous': 'vigorous', 'writting': 'writing', 'wathever': 'whatever',
};

const STOP_WORDS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'by', 'with', 'is', 'it', 'its']);

function correctQuery(query) {
  const words = query.trim().toLowerCase().split(/\s+/);
  let changed = false;
  const corrected = words.map(w => {
    const c = COMMON_CORRECTIONS[w];
    if (c) { changed = true; return c; }
    return w;
  }).join(' ');
  return { corrected, changed };
}

function stripStopWords(query) {
  return query.split(/\s+/).filter(w => !STOP_WORDS.has(w)).join(' ');
}

async function trySearch(endpoint, query, page = 1) {
  const data = await tmdbFetch(endpoint, { query, page });
  return data.results;
}

function getSwapVariants(word) {
  const variants = [];
  for (let i = 0; i < word.length - 1; i++) {
    const chars = word.split('');
    const tmp = chars[i];
    chars[i] = chars[i + 1];
    chars[i + 1] = tmp;
    variants.push(chars.join(''));
  }
  return variants;
}

async function searchWithFuzzy(endpoint, query, page, filter) {
  const doSearch = async (q) => {
    const results = await trySearch(endpoint, q, page);
    return filter ? results.filter(filter) : results;
  };

  let results = await doSearch(query);
  if (results.length > 0) return results;

  const { corrected, changed } = correctQuery(query);
  if (changed) {
    results = await doSearch(corrected);
    if (results.length > 0) return results;
  }

  const stripped = stripStopWords(corrected);
  if (stripped && stripped !== corrected) {
    results = await doSearch(stripped);
    if (results.length > 0) return results;
  }

  const words = query.trim().toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const swaps = getSwapVariants(words[i]);
    for (const swp of swaps) {
      const variant = [...words];
      variant[i] = swp;
      results = await doSearch(variant.join(' '));
      if (results.length > 0) return results;
    }
  }

  return [];
}

async function searchMulti(query, page = 1) {
  return searchWithFuzzy('/search/multi', query, page, (r) => r.media_type === 'tv' || r.media_type === 'movie');
}

async function searchTv(query, page = 1) {
  return searchWithFuzzy('/search/tv', query, page, null);
}

async function searchMovie(query, page = 1) {
  return searchWithFuzzy('/search/movie', query, page, null);
}

async function getTvDetails(id) {
  return tmdbFetch(`/tv/${id}`);
}

async function getMovieDetails(id) {
  return tmdbFetch(`/movie/${id}`);
}

function formatTvDetails(data) {
  return {
    tmdbId: data.id,
    type: 'tv',
    title: data.name,
    year: (data.first_air_date || '').split('-')[0],
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    overview: data.overview,
    genres: (data.genres || []).map((g) => g.name),
    voteAverage: data.vote_average,
    totalEpisodes: data.number_of_episodes || 0,
    totalSeasons: data.number_of_seasons || 0,
    status: data.status === 'Returning Series' ? 'Ongoing' : data.status || 'Unknown',
    releaseDate: data.first_air_date || '',
  };
}

function formatMovieDetails(data) {
  return {
    tmdbId: data.id,
    type: 'movie',
    title: data.title,
    year: (data.release_date || '').split('-')[0],
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    overview: data.overview,
    genres: (data.genres || []).map((g) => g.name),
    voteAverage: data.vote_average,
    runtime: data.runtime || 0,
    status: data.status || 'Unknown',
    releaseDate: data.release_date || '',
  };
}

function formatSearchResult(item) {
  return {
    tmdbId: item.id,
    mediaType: item.media_type,
    title: item.title || item.name,
    year: (item.release_date || item.first_air_date || '').split('-')[0],
    posterPath: item.poster_path,
    backdropPath: item.backdrop_path,
    overview: item.overview || '',
    voteAverage: item.vote_average,
  };
}

export {
  getPosterUrl,
  getBackdropUrl,
  searchMulti,
  searchTv,
  searchMovie,
  getTvDetails,
  getMovieDetails,
  formatTvDetails,
  formatMovieDetails,
  formatSearchResult,
};
