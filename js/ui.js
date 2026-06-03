function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showModal(html) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');
  overlay.style.display = 'flex';
  content.innerHTML = html;
  const closeBtn = content.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', handleModalEscape);
  return content;
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.style.display = 'none';
  document.getElementById('modal-content').innerHTML = '';
  document.removeEventListener('keydown', handleModalEscape);
}

function handleModalEscape(e) {
  if (e.key === 'Escape') closeModal();
}

function showConfirmModal(message, onConfirm) {
  const html = `
    <div class="modal-header">
      <h3>Confirm</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p class="confirm-message">${message}</p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="confirmBtn">Confirm</button>
    </div>
  `;
  showModal(html);
  document.getElementById('confirmBtn').addEventListener('click', async () => {
    closeModal();
    await onConfirm();
  });
}

function showPageLoader() {
  document.getElementById('page-loader').style.display = 'flex';
  document.getElementById('page-container').innerHTML = '';
}

function hidePageLoader() {
  document.getElementById('page-loader').style.display = 'none';
}

function setNavActive(route) {
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.dataset.route === route);
  });
}

function setupNavbar() {
  const hamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  const avatarBtn = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('dropdownMenu');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
      dropdown.classList.remove('open');
    });
  });

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });

  dropdown.addEventListener('click', (e) => e.stopPropagation());
}

function renderSkeletonCards(count = 12) {
  return Array.from(
    { length: count },
    () => `
      <div class="search-skeleton-card">
        <div class="skeleton skeleton-poster"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `
  ).join('');
}

function renderPosterCard(item, extra = '') {
  const posterUrl = item.posterPath
    ? `https://image.tmdb.org/t/p/w342${item.posterPath}`
    : null;
  const year = item.year || '';
  const title = item.title || 'Unknown';

  return `
    <div class="content-card" data-id="${item.tmdbId}" data-type="${item.type || item.mediaType}" ${extra}>
      <div class="poster-wrapper">
        ${posterUrl
          ? `<img src="${posterUrl}" alt="${title}" loading="lazy" />`
          : `<div class="poster-fallback">${title}</div>`}
      </div>
      <div class="card-body">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          ${year ? `<span>${year}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderTrackedCard(entry) {
  const posterUrl = entry.posterPath
    ? `https://image.tmdb.org/t/p/w342${entry.posterPath}`
    : null;
  const statusLabel = entry.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  const isTv = entry.type === 'tv';

  let progressHtml = '';
  if (isTv && entry.totalEpisodes > 0) {
    progressHtml = `
      <div class="episode-progress">
        <span>${entry.episodesWatched || 0} / ${entry.totalEpisodes} ep</span>
        <button class="episode-plus" data-action="episode-plus" data-id="${entry.tmdbId}" data-type="${entry.type}" title="+1 episode">+</button>
      </div>
    `;
  }

  let ratingHtml = '';
  if (entry.userRating) {
    ratingHtml = `<div class="card-rating">★ ${entry.userRating}/10</div>`;
  }

  return `
    <div class="content-card" data-id="${entry.tmdbId}" data-type="${entry.type}">
      <div class="poster-wrapper">
        ${posterUrl
          ? `<img src="${posterUrl}" alt="${entry.title}" loading="lazy" />`
          : `<div class="poster-fallback">${entry.title}</div>`}
        <span class="card-status status-badge ${entry.status}">${statusLabel}</span>
        <button class="card-menu-btn" data-action="card-menu" data-id="${entry.tmdbId}" data-type="${entry.type}">⋮</button>
        <div class="card-dropdown" data-dropdown="${entry.tmdbId}_${entry.type}">
          <button class="card-dropdown-item" data-action="edit-status" data-id="${entry.tmdbId}" data-type="${entry.type}">Edit Status</button>
          ${isTv ? `<button class="card-dropdown-item" data-action="edit-progress" data-id="${entry.tmdbId}" data-type="${entry.type}">Edit Progress</button>` : ''}
          <button class="card-dropdown-item" data-action="edit-rating" data-id="${entry.tmdbId}" data-type="${entry.type}">Edit Rating</button>
          <button class="card-dropdown-item" data-action="edit-notes" data-id="${entry.tmdbId}" data-type="${entry.type}">Edit Notes</button>
          <button class="card-dropdown-item danger" data-action="remove-entry" data-id="${entry.tmdbId}" data-type="${entry.type}">Remove</button>
        </div>
      </div>
      <div class="card-body">
        <div class="card-title">${entry.title}</div>
        <div class="card-meta">
          <span class="media-badge ${entry.type}">${entry.type === 'tv' ? 'TV' : 'Movie'}</span>
          ${entry.year ? `<span>${entry.year}</span>` : ''}
        </div>
        ${ratingHtml}
        ${progressHtml}
      </div>
    </div>
  `;
}

function getStatusLabel(status) {
  const labels = {
    watching: 'Watching',
    plan_to_watch: 'Plan to Watch',
    completed: 'Completed',
    dropped: 'Dropped',
    on_hold: 'On Hold',
  };
  return labels[status] || status;
}

function getInitials(email) {
  return (email || '?').charAt(0).toUpperCase();
}

window.closeModal = closeModal;

export {
  showToast,
  showModal,
  closeModal,
  showConfirmModal,
  showPageLoader,
  hidePageLoader,
  setNavActive,
  setupNavbar,
  renderSkeletonCards,
  renderPosterCard,
  renderTrackedCard,
  getStatusLabel,
  getInitials,
};
