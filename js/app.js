import { auth } from './firebase.js';
import { renderLoginPage, renderRegisterPage, handleLogout } from './auth.js';
import { renderHomePage } from './home.js';
import { renderSearchPage } from './search.js';
import { renderDetailsPage } from './details.js';
import { renderSettingsPage, loadTheme } from './settings.js';
import { renderProfilePage } from './profile.js';
import { showPageLoader, hidePageLoader, setNavActive, setupNavbar, getInitials, showConfirmModal, getAvatarUrl, updateNavbarAvatar, generateAvatarSVG } from './ui.js';
import { getUserProfile } from './firebase.js';

let currentRoute = '';

function initApp() {
  loadTheme();
  setupNavbar();

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

  if (user) {
    navbar.style.display = 'block';
    navUser.style.display = 'block';
    const profile = await getUserProfile(user.uid).catch(() => null);
    if (profile?.avatar) {
      updateNavbarAvatar(generateAvatarSVG(profile.avatar, 64));
    } else {
      const seed = profile?.avatarSeed || user.uid;
      updateNavbarAvatar(getAvatarUrl(seed));
    }
  } else {
    navbar.style.display = 'none';
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
