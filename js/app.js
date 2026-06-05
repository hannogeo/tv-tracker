import { auth } from './firebase.js';
import { renderLoginPage, renderRegisterPage, handleLogout } from './auth.js';
import { renderHomePage } from './home.js';
import { renderSearchPage } from './search.js';
import { renderBrowsePage } from './browse.js';
import { renderDetailsPage } from './details.js';
import { renderSettingsPage, loadTheme } from './settings.js';
import { renderProfilePage } from './profile.js';
import { showPageLoader, hidePageLoader, setNavActive, setupNavbar, getInitials, showConfirmModal, getAvatarUrl, updateNavbarAvatar, generateAvatarSVG } from './ui.js';
import { getUserProfile } from './firebase.js';
import { searchMulti, formatSearchResult } from './tmdb.js';

let currentRoute = '';
let navSearchTimeout = null;

function initApp() {
  loadTheme();
  setupNavbar();
  setupNavSearch();

  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    showConfirmModal('Are you sure you want to sign out?', async () => {
      await handleLogout();
    });
  });

  auth.onAuthStateChanged((user) => {
    updateNavbar(user);
    handleRoute(user);
  });

  window.addEventListener('hashchange', () => {
    const user = auth.currentUser;
    handleRoute(user);
  });
}

async function updateNavbar(user) {
  const navbar = document.getElementById('navbar');
  const navUser = document.getElementById('navUser');
  const navSearch = document.getElementById('navSearch');

  if (user) {
    navbar.style.display = 'block';
    navUser.style.display = 'block';
    if (navSearch) navSearch.style.display = 'block';
    const profile = await getUserProfile(user.uid).catch(() => null);
    if (profile?.avatar) {
      updateNavbarAvatar(generateAvatarSVG(profile.avatar, 64));
    } else {
      const seed = profile?.avatarSeed || user.uid;
      updateNavbarAvatar(getAvatarUrl(seed));
    }
  } else {
    navbar.style.display = 'none';
    if (navSearch) navSearch.style.display = 'none';
  }
}

function setupNavSearch() {
  const input = document.getElementById('navSearchInput');
  const dropdown = document.getElementById('navSearchDropdown');
  if (!input) return;

  input.addEventListener('input', () => {
    clearTimeout(navSearchTimeout);
    const q = input.value.trim();
    if (q.length < 2) {
      dropdown.classList.remove('open');
      return;
    }
    navSearchTimeout = setTimeout(() => doNavSearch(q), 300);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim();
      if (q.length > 0) {
        dropdown.classList.remove('open');
        input.blur();
        window.location.hash = `#/search?q=${encodeURIComponent(q)}`;
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-search')) {
      dropdown.classList.remove('open');
    }
  });
}

async function doNavSearch(query) {
  const dropdown = document.getElementById('navSearchDropdown');
  dropdown.innerHTML = '<div class="quick-loading"><div class="spinner spinner-sm"></div></div>';
  dropdown.classList.add('open');

  try {
    const results = await searchMulti(query);
    const formatted = results.slice(0, 5).map(formatSearchResult);
    if (formatted.length === 0) {
      dropdown.innerHTML = '<div class="quick-empty">No results found</div>';
      return;
    }
    let html = '';
    formatted.forEach((item) => {
      html += `
        <div class="quick-result-card" data-id="${item.tmdbId}" data-type="${item.mediaType}">
          <div class="quick-result-poster">
            ${item.posterPath
              ? `<img src="https://image.tmdb.org/t/p/w92${item.posterPath}" alt="${item.title}" loading="lazy" />`
              : `<div class="quick-result-fallback">${item.title}</div>`}
          </div>
          <div class="quick-result-info">
            <div class="quick-result-title">${item.title}</div>
            <div class="quick-result-meta">
              ${item.year ? `<span>${item.year}</span>` : ''}
              <span class="media-badge ${item.mediaType}">${item.mediaType === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
          </div>
        </div>
      `;
    });
    html += `<a href="#/search?q=${encodeURIComponent(query)}" class="quick-view-all">View all results &rarr;</a>`;
    dropdown.innerHTML = html;

    dropdown.querySelectorAll('.quick-result-card').forEach((card) => {
      card.addEventListener('click', () => {
        dropdown.classList.remove('open');
        document.getElementById('navSearchInput').value = '';
        window.location.hash = `#/details/${card.dataset.id}&type=${card.dataset.type}`;
      });
    });
  } catch {
    dropdown.innerHTML = '<div class="quick-empty">Search failed</div>';
  }
}

function handleRoute(user) {
  const hash = window.location.hash || '#/home';
  const path = hash;

  if (!user) {
    if (path === '#/login' || path === '#/register' || path === '#/' || path === '') {

    } else {
      window.location.hash = '#/login';
      return;
    }
  } else {
    if (path === '#/login' || path === '#/register' || path === '#/' || path === '') {
      window.location.hash = '#/home';
      return;
    }
  }

  if (path === currentRoute) return;
  currentRoute = path;

  const navDropdown = document.getElementById('navSearchDropdown');
  if (navDropdown) navDropdown.classList.remove('open');
  const navInput = document.getElementById('navSearchInput');
  if (navInput) navInput.value = '';

  window.scrollTo(0, 0);

  showPageLoader();

  setTimeout(() => {
    routePage(path);
  }, 50);
}

function routePage(path) {
  if (path === '#/login' || path === '#/' || path === '') {
    renderLoginPage();
    setNavActive('');
  } else if (path === '#/register') {
    renderRegisterPage();
    setNavActive('');
  } else if (path === '#/home') {
    renderHomePage();
    setNavActive('home');
  } else if (path === '#/browse') {
    renderBrowsePage();
    setNavActive('browse');
  } else if (path === '#/search' || path.startsWith('#/search?')) {
    const params = new URLSearchParams(path.split('?')[1] || '');
    renderSearchPage(params.get('q') || '');
    setNavActive('search');
  } else if (path === '#/profile') {
    renderProfilePage();
    setNavActive('');
  } else if (path === '#/settings') {
    renderSettingsPage();
    setNavActive('');
  } else if (path.startsWith('#/details/')) {
    const match = path.match(/#\/details\/(\d+)&type=(tv|movie)/);
    if (match) {
      renderDetailsPage(parseInt(match[1]), match[2]);
      setNavActive('');
    } else {
      renderNotFound();
    }
  } else {
    renderNotFound();
  }

  hidePageLoader();
}

function renderNotFound() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="not-found">
      <h1>404</h1>
      <p>Page not found</p>
      <a href="#/home" class="btn btn-primary">Back to Home</a>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', initApp);
