import { auth } from './firebase.js';
import { renderLoginPage, renderRegisterPage, handleLogout } from './auth.js';
import { renderHomePage } from './home.js';
import { renderSearchPage } from './search.js';
import { renderDetailsPage } from './details.js';
import { renderProfilePage } from './profile.js';
import { showPageLoader, hidePageLoader, setNavActive, setupNavbar, getInitials } from './ui.js';

let currentRoute = '';
let isInitialized = false;

function initApp() {
  setupNavbar();

  document.getElementById('logoutBtn').addEventListener('click', handleLogout);

  auth.onAuthStateChanged((user) => {
    if (!isInitialized) {
      isInitialized = true;
    }

    updateNavbar(user);
    handleRoute(user);
  });

  window.addEventListener('hashchange', () => {
    const user = auth.currentUser;
    handleRoute(user);
  });
}

function updateNavbar(user) {
  const navbar = document.getElementById('navbar');
  const avatarPlaceholder = document.getElementById('avatarPlaceholder');
  const navUser = document.getElementById('navUser');

  if (user) {
    navbar.style.display = 'block';
    navUser.style.display = 'block';
    const email = user.email || '';
    avatarPlaceholder.textContent = getInitials(email);
  } else {
    navbar.style.display = 'none';
  }
}

function handleRoute(user) {
  const hash = window.location.hash || '#/home';
  const route = hash.split('?')[0].split('&')[0];
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

  const pageContainer = document.getElementById('page-container');
  pageContainer.scrollTop = 0;
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
  } else if (path === '#/search') {
    renderSearchPage();
    setNavActive('search');
  } else if (path.startsWith('#/profile')) {
    renderProfilePage();
    setNavActive('');
  } else if (path.startsWith('#/details/')) {
    const match = path.match(/#\/details\/(\d+)&type=(tv|movie)/);
    if (match) {
      const tmdbId = match[1];
      const type = match[2];
      renderDetailsPage(parseInt(tmdbId), type);
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
