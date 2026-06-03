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

async function searchMulti(query, page = 1) {
  const data = await tmdbFetch('/search/multi', { query, page });
  return data.results.filter((r) => r.media_type === 'tv' || r.media_type === 'movie');
}

async function searchTv(query, page = 1) {
  const data = await tmdbFetch('/search/tv', { query, page });
  return data.results;
}

async function searchMovie(query, page = 1) {
  const data = await tmdbFetch('/search/movie', { query, page });
  return data.results;
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
