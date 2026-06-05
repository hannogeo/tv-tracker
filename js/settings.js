import { auth, getUserProfile, getUserEntries, deleteUserData } from './firebase.js';
import { showToast, showConfirmModal, showModal, closeModal, getInitials } from './ui.js';

const ACCENT_COLORS = [
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
];

function loadTheme() {
  const saved = localStorage.getItem('tv-tracker-theme');
  const accent = localStorage.getItem('tv-tracker-accent');
  if (saved === 'light') {
    document.documentElement.classList.add('theme-light');
  }
  if (accent) {
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-hover', adjustBrightness(accent, -10));
  }
}

function setTheme(theme) {
  document.documentElement.classList.toggle('theme-light', theme === 'light');
  localStorage.setItem('tv-tracker-theme', theme);
}

function setAccentColor(hex) {
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-hover', adjustBrightness(hex, -10));
  localStorage.setItem('tv-tracker-accent', hex);
}

function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function renderSettingsPage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="settings-page">
      <h1 class="page-title">Settings</h1>
      <div class="settings-tabs">
        <button class="settings-tab active" data-stab="appearance">Appearance Settings</button>
        <button class="settings-tab" data-stab="account">Profile Settings</button>
      </div>
      <div id="settingsContent">
        <div class="home-loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  container.querySelectorAll('.settings-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.settings-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderSettingsTab(btn.dataset.stab);
    });
  });

  renderSettingsTab('appearance');
}

function renderSettingsTab(tab) {
  const content = document.getElementById('settingsContent');

  if (tab === 'appearance') {
    renderAppearanceTab(content);
  } else if (tab === 'account') {
    renderAccountTab(content);
  }
}

function renderAppearanceTab(container) {
  const isDark = !document.documentElement.classList.contains('theme-light');
  const currentAccent = localStorage.getItem('tv-tracker-accent') || '#14b8a6';

  container.innerHTML = `
    <div class="settings-card">
      <h3>Theme</h3>
      <p class="settings-desc">Choose between dark and light mode.</p>
      <div class="theme-toggle-row">
        <span class="toggle-label">Dark Mode</span>
        <label class="toggle-switch">
          <input type="checkbox" id="themeToggle" ${isDark ? 'checked' : ''} />
          <span class="toggle-track"></span>
        </label>
      </div>
    </div>
    <div class="settings-card">
      <h3>Accent Color</h3>
      <p class="settings-desc">Customize the primary accent color used throughout the app.</p>
      <div class="accent-picker">
        ${ACCENT_COLORS.map((c) =>
          `<div class="accent-swatch ${c.value === currentAccent ? 'active' : ''}" style="background:${c.value}" data-color="${c.value}" title="${c.name}"></div>`
        ).join('')}
      </div>
    </div>
  `;

  document.getElementById('themeToggle').addEventListener('change', (e) => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  container.querySelectorAll('.accent-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      container.querySelectorAll('.accent-swatch').forEach((s) => s.classList.remove('active'));
      swatch.classList.add('active');
      setAccentColor(swatch.dataset.color);
      showToast('Accent color updated', 'success');
    });
  });
}

async function renderAccountTab(container) {
  container.innerHTML = '<div class="home-loading"><div class="spinner"></div></div>';

  try {
    const uid = auth.currentUser.uid;
    const profile = await getUserProfile(uid);
    const entries = await getUserEntries(uid);

    const stats = calculateStats(entries);

    container.innerHTML = `
      <div class="settings-card">
        <h3>Change Username</h3>
        <p class="settings-desc">Update your display name.</p>
        <form id="changeUsernameForm">
          <div class="form-group">
            <input type="text" id="suUsername" class="form-input" value="${profile?.username || ''}" required />
            <div class="error-text" id="suUsernameError"></div>
          </div>
          <button type="submit" class="btn btn-primary" id="suBtn">Save</button>
        </form>
      </div>

      <div class="settings-card">
        <h3>Change Email</h3>
        <p class="settings-desc">Update your email address.</p>
        <form id="changeEmailForm">
          <div class="form-group">
            <input type="email" id="suEmail" class="form-input" value="${profile?.email || auth.currentUser.email || ''}" required />
            <div class="error-text" id="suEmailError"></div>
          </div>
          <button type="submit" class="btn btn-primary" id="seBtn">Save</button>
        </form>
      </div>

      <div class="settings-card">
        <h3>Change Password</h3>
        <p class="settings-desc">Update your account password.</p>
        <form id="changePwForm">
          <div class="form-group">
            <label for="cpCurrent">Current Password</label>
            <div class="input-with-toggle">
              <input type="password" id="cpCurrent" class="form-input" required autocomplete="current-password" />
              <button type="button" class="toggle-pw" data-toggle="cpCurrent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="error-text" id="cpCurrentError"></div>
          </div>
          <div class="form-group">
            <label for="cpNew">New Password</label>
            <div class="input-with-toggle">
              <input type="password" id="cpNew" class="form-input" required autocomplete="new-password" />
              <button type="button" class="toggle-pw" data-toggle="cpNew">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="error-text" id="cpNewError"></div>
          </div>
          <div class="form-group">
            <label for="cpConfirm">Confirm New Password</label>
            <div class="input-with-toggle">
              <input type="password" id="cpConfirm" class="form-input" required autocomplete="new-password" />
              <button type="button" class="toggle-pw" data-toggle="cpConfirm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
            <div class="error-text" id="cpConfirmError"></div>
          </div>
          <div class="success-text" id="cpSuccess" style="display:none;"></div>
          <button type="submit" class="btn btn-primary" id="cpBtn">Change Password</button>
        </form>
      </div>

      <div class="settings-card settings-danger-zone">
        <h3>Delete Account</h3>
        <p class="settings-desc">Permanently delete your account and all data. This cannot be undone.</p>
        <button class="btn btn-danger" id="delAccountBtn">Delete Account</button>
      </div>
    `;

    setupPasswordToggles();
    attachAccountEvents(uid, entries);
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><p>Failed to load account settings.</p></div>';
  }
}

function attachAccountEvents(uid, entries) {
  document.getElementById('changeUsernameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('suUsername').value.trim();
    const btn = document.getElementById('suBtn');
    if (!username) { document.getElementById('suUsernameError').textContent = 'Username is required'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    try {
      const profile = await getUserProfile(uid);
      await firebase.firestore().collection('users').doc(uid).update({ username });
      await auth.currentUser.updateProfile({ displayName: username });
      showToast('Username updated', 'success');
    } catch (err) {
      document.getElementById('suUsernameError').textContent = 'Failed to update username';
    }
    btn.disabled = false;
    btn.textContent = 'Save';
  });

  document.getElementById('changeEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('suEmail').value.trim();
    const btn = document.getElementById('seBtn');
    const errorEl = document.getElementById('suEmailError');
    errorEl.textContent = '';
    if (!email) { errorEl.textContent = 'Email is required'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    try {
      await auth.currentUser.updateEmail(email);
      await firebase.firestore().collection('users').doc(uid).update({ email });
      showToast('Email updated', 'success');
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        showReauthModal(() => auth.currentUser.updateEmail(email).then(() => {
          firebase.firestore().collection('users').doc(uid).update({ email });
          showToast('Email updated', 'success');
        }));
      } else {
        errorEl.textContent = 'Failed to update email';
      }
    }
    btn.disabled = false;
    btn.textContent = 'Save';
  });

  document.getElementById('changePwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const current = document.getElementById('cpCurrent').value;
    const newPw = document.getElementById('cpNew').value;
    const confirm = document.getElementById('cpConfirm').value;
    const btn = document.getElementById('cpBtn');
    const successEl = document.getElementById('cpSuccess');
    clearErrors('cpCurrentError', 'cpNewError', 'cpConfirmError');
    successEl.style.display = 'none';
    let hasError = false;
    if (!current) { document.getElementById('cpCurrentError').textContent = 'Required'; hasError = true; }
    if (!newPw) { document.getElementById('cpNewError').textContent = 'Required'; hasError = true; }
    else if (newPw.length < 8) { document.getElementById('cpNewError').textContent = 'At least 8 characters'; hasError = true; }
    if (newPw !== confirm) { document.getElementById('cpConfirmError').textContent = 'Passwords do not match'; hasError = true; }
    if (hasError) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Changing...';
    try {
      const user = auth.currentUser;
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, current);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPw);
      successEl.textContent = 'Password changed successfully!';
      successEl.style.display = 'block';
      document.getElementById('changePwForm').reset();
      showToast('Password changed', 'success');
    } catch (err) {
      document.getElementById('cpCurrentError').textContent = err.code === 'auth/wrong-password' ? 'Current password is incorrect' : 'Failed to change password';
    }
    btn.disabled = false;
    btn.textContent = 'Change Password';
  });

  document.getElementById('delAccountBtn').addEventListener('click', () => {
    showConfirmModal(
      'Are you sure you want to delete your account? All your tracked shows, movies, ratings, and notes will be permanently lost. This cannot be undone.',
      () => showDeleteConfirmStep(uid)
    );
  });
}

function showDeleteConfirmStep(uid) {
  const html = `
    <div class="modal-header">
      <h3>Confirm Deletion</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;">Type <strong>DELETE</strong> below and enter your password to permanently delete your account.</p>
      <div class="form-group">
        <label for="delConfirmText">Type "DELETE" to confirm</label>
        <input type="text" id="delConfirmText" class="form-input" placeholder="DELETE" autocomplete="off" />
        <div class="error-text" id="delTextError"></div>
      </div>
      <div class="form-group">
        <label for="delPassword">Password</label>
        <div class="input-with-toggle">
          <input type="password" id="delPassword" class="form-input" required autocomplete="current-password" />
          <button type="button" class="toggle-pw" data-toggle="delPassword">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="delPwError"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="delFinalBtn">Permanently Delete</button>
    </div>
  `;
  showModal(html);
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
    });
  });
  document.getElementById('delFinalBtn').addEventListener('click', async () => {
    const text = document.getElementById('delConfirmText').value.trim();
    const password = document.getElementById('delPassword').value;
    const textErr = document.getElementById('delTextError');
    const pwErr = document.getElementById('delPwError');
    textErr.textContent = '';
    pwErr.textContent = '';
    if (text !== 'DELETE') { textErr.textContent = 'Type DELETE to confirm'; return; }
    if (!password) { pwErr.textContent = 'Password is required'; return; }
    const btn = document.getElementById('delFinalBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Deleting...';
    try {
      const user = auth.currentUser;
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(cred);
      await deleteUserData(uid);
      await user.delete();
      closeModal();
      showToast('Account deleted', 'info');
    } catch (err) {
      pwErr.textContent = 'Incorrect password';
      btn.disabled = false;
      btn.textContent = 'Permanently Delete';
    }
  });
}

function showReauthModal(afterReauth) {
  const html = `
    <div class="modal-header">
      <h3>Re-authentication Required</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;">Please enter your password to continue.</p>
      <div class="form-group">
        <label for="reauthPw">Password</label>
        <div class="input-with-toggle">
          <input type="password" id="reauthPw" class="form-input" required />
          <button type="button" class="toggle-pw" data-toggle="reauthPw">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="reauthError"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="reauthBtn">Continue</button>
    </div>
  `;
  showModal(html);
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
    });
  });
  document.getElementById('reauthBtn').addEventListener('click', async () => {
    const password = document.getElementById('reauthPw').value;
    const errorEl = document.getElementById('reauthError');
    const btn = document.getElementById('reauthBtn');
    if (!password) { errorEl.textContent = 'Password is required'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span>...';
    try {
      const user = auth.currentUser;
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(cred);
      closeModal();
      await afterReauth();
    } catch (err) {
      errorEl.textContent = 'Incorrect password';
      btn.disabled = false;
      btn.textContent = 'Continue';
    }
  });
}

function calculateStats(entries) {
  const stats = {
    totalSeries: 0, totalMovies: 0, totalEpisodes: 0,
    watching: 0, plan_to_watch: 0, completed: 0, dropped: 0, on_hold: 0,
  };
  entries.forEach((e) => {
    if (e.type === 'tv') stats.totalSeries++; else stats.totalMovies++;
    stats.totalEpisodes += e.episodesWatched || 0;
    if (stats.hasOwnProperty(e.status)) stats[e.status]++;
  });
  return stats;
}

function setupPasswordToggles() {
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
    });
  });
}

function clearErrors(...ids) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

export { renderSettingsPage, loadTheme, setTheme, setAccentColor };
