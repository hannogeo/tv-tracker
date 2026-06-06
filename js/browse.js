import { discover, formatSearchResult, MOVIE_GENRES, TV_GENRES } from './tmdb.js';
import { renderSkeletonCards, initCustomSelect } from './ui.js';

let currentType = 'tv';
let currentGenre = '';
let currentPage = 1;
let maxPages = 1;
let isLoading = false;
let allLoaded = false;
let observer = null;

function renderBrowsePage() {
  const container = document.getElementById('page-container');
  currentPage = 1;
  maxPages = 1;
  isLoading = false;
  allLoaded = false;
  if (observer) { observer.disconnect(); observer = null; }

  container.innerHTML = `
    <div class="browse-page">
      <h1 class="page-title">Browse</h1>
      <div class="browse-filters">
        <div class="browse-type-tabs">
          <button class="browse-type-btn active" data-type="tv">TV Series</button>
          <button class="browse-type-btn" data-type="movie">Movies</button>
        </div>
        <div class="browse-filter-row">
          <div class="browse-filter-group">
            <label class="browse-filter-label">Genre</label>
            <select id="browseGenre" class="browse-select">
              <option value="">All Genres</option>
            </select>
          </div>
        </div>
      </div>
      <div class="browse-grid" id="browseGrid"></div>
      <div id="browseSentinel" class="browse-sentinel"></div>
      <div id="browseEndMsg" class="browse-end-msg" style="display:none;">SON😭 why are you scrolling this far go touch grass or sum</div>
    </div>
  `;

  const genreEl = document.getElementById('browseGenre');

  function populateGenreSelect(type) {
    const genres = type === 'tv' ? TV_GENRES : MOVIE_GENRES;
    genreEl.innerHTML = '<option value="">All Genres</option>' + genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    genreEl.value = currentGenre;
  }

  container.querySelectorAll('.browse-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentType = btn.dataset.type;
      currentPage = 1;
      allLoaded = false;
      const genres = currentType === 'tv' ? TV_GENRES : MOVIE_GENRES;
      const genreValid = !currentGenre || genres.some(g => String(g.id) === currentGenre);
      if (!genreValid) currentGenre = '';
      container.querySelectorAll('.browse-type-btn').forEach(b => b.classList.toggle('active', b.dataset.type === btn.dataset.type));
      populateGenreSelect(currentType);
      loadBrowse(true);
    });
  });

  genreEl.addEventListener('change', () => {
    currentGenre = genreEl.value;
    currentPage = 1;
    allLoaded = false;
    loadBrowse(true);
  });

  populateGenreSelect('tv');
  const genreCustom = initCustomSelect(genreEl);
  const origPopulate = populateGenreSelect;
  populateGenreSelect = function(type) {
    origPopulate(type);
    if (genreCustom) genreCustom.update();
  };
  loadBrowse(true);
  setupInfiniteScroll();
  setupCardClickDelegation();
}

function setupCardClickDelegation() {
  const grid = document.getElementById('browseGrid');
  if (grid) grid.addEventListener('click', (e) => {
    const card = e.target.closest('.content-card');
    if (card) window.location.hash = `#/details/${card.dataset.id}&type=${card.dataset.type}`;
  });
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('browseSentinel');
  if (!sentinel) return;
  function stopLoading() {
    allLoaded = true;
    if (sentinel) sentinel.style.display = 'none';
    const endMsg = document.getElementById('browseEndMsg');
    if (endMsg) endMsg.style.display = 'block';
  }

  observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !isLoading && !allLoaded) {
      currentPage++;
      if (currentPage > maxPages) { stopLoading(); return; }
      if ((currentPage - 1) * 20 >= 200) { stopLoading(); return; }
      loadBrowse(false);
    }
  }, { rootMargin: '400px' });
  observer.observe(sentinel);
}

async function loadBrowse(replace) {
  if (isLoading) return;
  isLoading = true;
  const grid = document.getElementById('browseGrid');
  const sentinel = document.getElementById('browseSentinel');

  if (replace) {
    grid.innerHTML = '<div class="browse-skeleton">' + renderSkeletonCards(12) + '</div>';
  }

  try {
    const { results, totalPages } = await discover(currentType, {
      sortBy: 'popularity.desc',
      genreId: currentGenre || undefined,
      page: currentPage,
    });
    maxPages = Math.min(totalPages, Math.ceil(200 / 20));

    const formatted = results.slice(0, 20).map(r => ({ ...r, media_type: currentType })).map(formatSearchResult);

    if (formatted.length === 0 && replace) {
      grid.innerHTML = '<div class="browse-empty">No results found</div>';
      isLoading = false;
      if (sentinel) sentinel.style.display = 'none';
      return;
    }

    function cardHTML(item, i) {
      const rank = (currentPage - 1) * 20 + i + 1;
      const posterUrl = item.posterPath ? `https://image.tmdb.org/t/p/w342${item.posterPath}` : null;
      return `<div class="content-card" data-id="${item.tmdbId}" data-type="${item.mediaType}">
        <div class="poster-wrapper">
          <span class="browse-rank">${rank}</span>
          ${posterUrl ? `<img src="${posterUrl}" alt="${item.title}" loading="lazy" />` : `<div class="poster-fallback">${item.title}</div>`}
        </div>
        <div class="card-body">
          <div class="card-title">${item.title}</div>
          <div class="card-meta">
            ${item.year ? `<span>${item.year}</span>` : ''}
            <span class="media-badge ${item.mediaType}">${item.mediaType === 'tv' ? 'TV' : 'Movie'}</span>
          </div>
        </div>
      </div>`;
    }

    if (replace) {
      grid.innerHTML = '<div class="card-grid">' + formatted.map(cardHTML).join('') + '</div>';
    } else {
      const existing = grid.querySelector('.card-grid');
      if (existing) existing.insertAdjacentHTML('beforeend', formatted.map(cardHTML).join(''));
    }

    if ((currentPage * 20) >= 200 || currentPage >= maxPages) {
      const sentinel = document.getElementById('browseSentinel');
      const endMsg = document.getElementById('browseEndMsg');
      allLoaded = true;
      if (sentinel) sentinel.style.display = 'none';
      if (endMsg) endMsg.style.display = 'block';
    }
  } catch {
    if (replace) grid.innerHTML = '<div class="browse-empty">Failed to load</div>';
  }

  isLoading = false;
}

export { renderBrowsePage };
