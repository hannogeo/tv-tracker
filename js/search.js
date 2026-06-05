import { searchMulti, searchTv, searchMovie, formatSearchResult } from './tmdb.js';
import { renderSkeletonCards, renderPosterCard } from './ui.js';

let searchTimeout = null;
let currentFilter = 'both';
let currentQuery = '';

function renderSearchPage(initialQuery = '') {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="search-page">
      <h1 class="page-title">Search</h1>
      <div class="search-bar">
        <div class="search-input-wrapper">
          <input type="text" id="searchInput" class="search-input" placeholder="Search for TV series or movies..." autocomplete="off" />
        </div>
      </div>
      <div class="search-filters">
        <button class="filter-btn active" data-filter="both">Both</button>
        <button class="filter-btn" data-filter="tv">Series</button>
        <button class="filter-btn" data-filter="movie">Movies</button>
      </div>
      <div id="searchResults" class="search-results">
        ${initialQuery ? '<div class="search-skeleton-grid">' + renderSkeletonCards(12) + '</div>' : '<div class="search-info">Start typing to search...</div>'}
      </div>
    </div>
  `;

  const input = document.getElementById('searchInput');
  input.focus();

  input.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    currentQuery = input.value.trim();
    if (currentQuery.length < 1) {
      document.getElementById('searchResults').innerHTML = '<div class="search-info">Start typing to search...</div>';
      return;
    }
    searchTimeout = setTimeout(() => performSearch(currentQuery, currentFilter), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && currentQuery.length > 0) {
      clearTimeout(searchTimeout);
      performSearch(currentQuery, currentFilter);
    }
  });

  container.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      if (currentQuery.length > 0) {
        clearTimeout(searchTimeout);
        performSearch(currentQuery, currentFilter);
      }
    });
  });

  if (initialQuery) {
    input.value = initialQuery;
    currentQuery = initialQuery;
    setTimeout(() => performSearch(initialQuery, currentFilter), 50);
  }
}

async function performSearch(query, filter) {
  const resultsEl = document.getElementById('searchResults');
  resultsEl.innerHTML = `<div class="search-skeleton-grid">${renderSkeletonCards(12)}</div>`;

  try {
    let results = [];
    if (filter === 'both') {
      results = await searchMulti(query);
    } else if (filter === 'tv') {
      const tvResults = await searchTv(query);
      results = tvResults.map((r) => ({ ...r, media_type: 'tv' }));
    } else {
      const movieResults = await searchMovie(query);
      results = movieResults.map((r) => ({ ...r, media_type: 'movie' }));
    }

    const formatted = results.map(formatSearchResult);

    if (formatted.length === 0) {
      resultsEl.innerHTML = `<div class="search-info">No results found for "${query}"</div>`;
      return;
    }

    let html = `<div class="results-count">${formatted.length} result${formatted.length > 1 ? 's' : ''}</div>`;
    html += '<div class="card-grid">';
    formatted.forEach((item) => {
      html += `
        <div class="content-card" data-id="${item.tmdbId}" data-type="${item.mediaType}">
          <div class="poster-wrapper">
            ${item.posterPath
              ? `<img src="https://image.tmdb.org/t/p/w342${item.posterPath}" alt="${item.title}" loading="lazy" />`
              : `<div class="poster-fallback">${item.title}</div>`}
          </div>
          <div class="card-body">
            <div class="card-title">${item.title}</div>
            <div class="card-meta">
              ${item.year ? `<span>${item.year}</span>` : ''}
              <span class="media-badge ${item.mediaType}">${item.mediaType === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    resultsEl.innerHTML = html;

    resultsEl.querySelectorAll('.content-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        const type = card.dataset.type;
        window.location.hash = `#/details/${id}&type=${type}`;
      });
    });
  } catch (err) {
    resultsEl.innerHTML = `<div class="search-info">Search failed. Please try again.</div>`;
  }
}

export { renderSearchPage };
