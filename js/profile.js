import { auth, getUserProfile, getUserEntries, deleteUserData } from './firebase.js';
import { renderChangePassword } from './auth.js';
import { showToast, showConfirmModal, showModal, closeModal, getInitials } from './ui.js';

function renderProfilePage() {
  const container = document.getElementById('page-container');
  const user = auth.currentUser;
  container.innerHTML = `
    <div class="profile-page">
      <h1 class="page-title">Profile</h1>
      <div id="profileContent">
        <div class="home-loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;
  loadProfile(container);
}

async function loadProfile(container) {
  const content = document.getElementById('profileContent');

  try {
    const uid = auth.currentUser.uid;
    const profile = await getUserProfile(uid);
    const entries = await getUserEntries(uid);

    const stats = calculateStats(entries);

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--border);">
        <div class="avatar-placeholder" style="width:64px;height:64px;font-size:28px;border-radius:50%;">${getInitials(profile?.email || auth.currentUser.email)}</div>
        <div>
          <h2 style="font-size:20px;font-weight:700;">${profile?.username || auth.currentUser.displayName || 'User'}</h2>
          <p style="color:var(--text-secondary);font-size:14px;">${profile?.email || auth.currentUser.email}</p>
        </div>
      </div>

      <h3 style="margin-bottom:16px;">Statistics</h3>
      <div class="details-info-grid" style="margin-bottom:32px;">
        <div class="info-item">
          <div class="info-label">Total Series</div>
          <div class="info-value">${stats.totalSeries}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Total Movies</div>
          <div class="info-value">${stats.totalMovies}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Episodes Watched</div>
          <div class="info-value">${stats.totalEpisodes}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Watching</div>
          <div class="info-value" style="color:var(--status-watching);">${stats.watching}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Plan to Watch</div>
          <div class="info-value" style="color:var(--status-plan);">${stats.plan_to_watch}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Completed</div>
          <div class="info-value" style="color:var(--status-completed);">${stats.completed}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Dropped</div>
          <div class="info-value" style="color:var(--status-dropped);">${stats.dropped}</div>
        </div>
        <div class="info-item">
          <div class="info-label">On Hold</div>
          <div class="info-value" style="color:var(--status-hold);">${stats.on_hold}</div>
        </div>
      </div>

      <div id="changePasswordSection"></div>

      <div style="margin-top:40px;padding-top:24px;border-top:1px solid var(--border);">
        <button class="btn btn-danger" id="deleteAccountBtn">Delete Account</button>
      </div>
    `;

    renderChangePassword();

    document.getElementById('deleteAccountBtn').addEventListener('click', () => {
      showConfirmModal(
        'Are you sure you want to delete your account? All your data will be permanently lost.',
        async () => {
          try {
            await deleteUserData(uid);
            const user = auth.currentUser;
            await user.delete();
            showToast('Account deleted', 'info');
          } catch (err) {
            if (err.code === 'auth/requires-recent-login') {
              showReauthModal();
            } else {
              showToast('Failed to delete account', 'error');
            }
          }
        }
      );
    });
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><p>Failed to load profile.</p></div>';
  }
}

function calculateStats(entries) {
  const stats = {
    totalSeries: 0,
    totalMovies: 0,
    totalEpisodes: 0,
    watching: 0,
    plan_to_watch: 0,
    completed: 0,
    dropped: 0,
    on_hold: 0,
  };
  entries.forEach((e) => {
    if (e.type === 'tv') stats.totalSeries++;
    else stats.totalMovies++;
    stats.totalEpisodes += e.episodesWatched || 0;
    if (stats.hasOwnProperty(e.status)) stats[e.status]++;
  });
  return stats;
}

function showReauthModal() {
  const html = `
    <div class="modal-header">
      <h3>Re-authentication Required</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:16px;">Please enter your password again to continue.</p>
      <div class="form-group">
        <label for="reauthPassword">Password</label>
        <div class="input-with-toggle">
          <input type="password" id="reauthPassword" class="form-input" required />
          <button type="button" class="toggle-pw" data-toggle="reauthPassword">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
        <div class="error-text" id="reauthError"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-danger" id="reauthBtn">Delete Account</button>
    </div>
  `;
  showModal(html);
  document.querySelectorAll('.toggle-pw').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.innerHTML = isPassword
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    });
  });
  document.getElementById('reauthBtn').addEventListener('click', async () => {
    const password = document.getElementById('reauthPassword').value;
    const errorEl = document.getElementById('reauthError');
    const btn = document.getElementById('reauthBtn');
    if (!password) { errorEl.textContent = 'Password is required'; return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Deleting...';
    try {
      const user = auth.currentUser;
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, password);
      await user.reauthenticateWithCredential(cred);
      await deleteUserData(user.uid);
      await user.delete();
      closeModal();
      showToast('Account deleted', 'info');
    } catch (err) {
      errorEl.textContent = 'Incorrect password';
      btn.disabled = false;
      btn.textContent = 'Delete Account';
    }
  });
}

export { renderProfilePage };
