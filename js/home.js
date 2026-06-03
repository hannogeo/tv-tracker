import { auth, getUserEntries, updateEntry, removeEntry } from './firebase.js';
import { showToast, showConfirmModal, showModal, closeModal, getStatusLabel, renderTrackedCard } from './ui.js';

let scrollPositions = {};

function renderHomePage() {
  const container = document.getElementById('page-container');
  const user = auth.currentUser;
  container.innerHTML = `
    <div class="home-page">
      <p class="welcome">Welcome${user.displayName ? `, ${user.displayName}` : ''}</p>
      <h1 class="home-title">My Library</h1>
      <div class="tabs">
        <button class="tab-btn active" data-tab="tv">My Series</button>
        <button class="tab-btn" data-tab="movie">My Movies</button>
      </div>
      <div id="homeContent">
        <div class="home-loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;

  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadHomeTab(btn.dataset.tab);
    });
  });

  loadHomeTab('tv');
}

async function loadHomeTab(type) {
  const content = document.getElementById('homeContent');
  content.innerHTML = '<div class="home-loading"><div class="spinner"></div></div>';

  try {
    const uid = auth.currentUser.uid;
    const allEntries = await getUserEntries(uid);
    const filtered = allEntries.filter((e) => e.type === type);
    const sections = getSections(filtered, type);
    renderSections(content, sections, type);
    attachHomeEvents(content, uid);
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error loading entries.</p></div>`;
  }
}

function getSections(entries, type) {
  const order = ['watching', 'plan_to_watch', 'completed', 'dropped', 'on_hold'];
  const labels = {
    watching: 'Watching',
    plan_to_watch: 'Plan to Watch',
    completed: 'Completed',
    dropped: 'Dropped',
    on_hold: 'On Hold',
  };
  const grouped = {};
  entries.forEach((e) => {
    const s = e.status || 'plan_to_watch';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(e);
  });
  return order
    .filter((key) => grouped[key] && grouped[key].length > 0)
    .map((key) => ({ key, label: labels[key], items: grouped[key] }));
}

function renderSections(container, sections, type) {
  if (sections.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Nothing here yet</h3>
        <p>Search for something to add!</p>
        <a href="#/search" class="btn btn-primary">Go to Search</a>
      </div>
    `;
    return;
  }

  let html = '';
  sections.forEach((section) => {
    html += `
      <div class="status-section">
        <div class="status-section-title">
          ${section.label}
          <span class="count">(${section.items.length})</span>
        </div>
        <div class="card-grid" data-section="${section.key}">
          ${section.items.map((entry) => renderTrackedCard(entry)).join('')}
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}

function attachHomeEvents(container, uid) {
  container.querySelectorAll('.content-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-menu-btn') || e.target.closest('.episode-plus') || e.target.closest('.card-dropdown')) return;
      const id = card.dataset.id;
      const type = card.dataset.type;
      window.location.hash = `#/details/${id}&type=${type}`;
    });
  });

  container.querySelectorAll('[data-action="card-menu"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = `${btn.dataset.id}_${btn.dataset.type}`;
      const dropdown = container.querySelector(`[data-dropdown="${key}"]`);
      const allDropdowns = container.querySelectorAll('.card-dropdown');
      allDropdowns.forEach((d) => {
        if (d !== dropdown) d.classList.remove('open');
      });
      dropdown.classList.toggle('open');
    });
  });

  container.addEventListener('click', (e) => {
    if (!e.target.closest('.card-dropdown') && !e.target.closest('.card-menu-btn')) {
      container.querySelectorAll('.card-dropdown').forEach((d) => d.classList.remove('open'));
    }
  });

  container.querySelectorAll('[data-action="episode-plus"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      try {
        const entries = await getUserEntries(uid);
        const entry = entries.find((en) => en.tmdbId === id && en.type === type);
        if (!entry) return;
        const current = entry.episodesWatched || 0;
        const total = entry.totalEpisodes || 0;
        let newEp = current + 1;
        let newStatus = entry.status;
        let toastMsg = `+1 episode (${newEp}/${total})`;
        if (newEp >= total && total > 0) {
          newEp = total;
          newStatus = 'completed';
          toastMsg = 'Completed! All episodes watched.';
        }
        await updateEntry(uid, id, type, { episodesWatched: newEp, status: newStatus });
        showToast(toastMsg, 'success');
        loadHomeTab(type);
      } catch (err) {
        showToast('Failed to update episode', 'error');
      }
    });
  });

  container.querySelectorAll('[data-action="edit-status"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const entries = await getUserEntries(uid);
      const entry = entries.find((en) => en.tmdbId === id && en.type === type);
      if (!entry) return;
      showStatusEditModal(uid, entry);
    });
  });

  container.querySelectorAll('[data-action="edit-progress"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const entries = await getUserEntries(uid);
      const entry = entries.find((en) => en.tmdbId === id && en.type === type);
      if (!entry) return;
      showProgressEditModal(uid, entry);
    });
  });

  container.querySelectorAll('[data-action="remove-entry"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const entriesPromise = getUserEntries(uid);
      entriesPromise.then((entries) => {
        const entry = entries.find((en) => en.tmdbId === id && en.type === type);
        if (!entry) return;
        showConfirmModal(
          `Are you sure you want to remove <strong>${entry.title}</strong> from your list? This cannot be undone.`,
          async () => {
            await removeEntry(uid, id, type);
            showToast('Removed from list', 'success');
            loadHomeTab(type);
          }
        );
      });
    });
  });
}

function showStatusEditModal(uid, entry) {
  const statuses = ['watching', 'plan_to_watch', 'completed', 'dropped', 'on_hold'];
  const html = `
    <div class="modal-header">
      <h3>Edit Status</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;font-size:14px;color:var(--text-secondary);"><strong>${entry.title}</strong></p>
      <div class="form-group">
        <label for="editStatusSelect">Status</label>
        <select id="editStatusSelect" class="form-select">
          ${statuses.map((s) => `<option value="${s}" ${s === entry.status ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveStatusBtn">Save</button>
    </div>
  `;
  showModal(html);
  document.getElementById('saveStatusBtn').addEventListener('click', async () => {
    const status = document.getElementById('editStatusSelect').value;
    const btn = document.getElementById('saveStatusBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    try {
      await updateEntry(uid, entry.tmdbId, entry.type, { status });
      closeModal();
      showToast('Status updated', 'success');
      loadHomeTab(entry.type);
    } catch (err) {
      showToast('Failed to update status', 'error');
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}

function showProgressEditModal(uid, entry) {
  const total = entry.totalEpisodes || 0;
  const html = `
    <div class="modal-header">
      <h3>Edit Progress</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;font-size:14px;color:var(--text-secondary);"><strong>${entry.title}</strong></p>
      <div class="form-group">
        <label for="editProgressInput">Episodes Watched (0 - ${total})</label>
        <input type="number" id="editProgressInput" class="form-number" min="0" max="${total}" value="${entry.episodesWatched || 0}" />
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveProgressBtn">Save</button>
    </div>
  `;
  showModal(html);
  document.getElementById('saveProgressBtn').addEventListener('click', async () => {
    const val = parseInt(document.getElementById('editProgressInput').value) || 0;
    const btn = document.getElementById('saveProgressBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';
    try {
      const clamped = Math.min(val, total);
      const data = { episodesWatched: clamped };
      if (clamped >= total && total > 0) data.status = 'completed';
      await updateEntry(uid, entry.tmdbId, entry.type, data);
      closeModal();
      showToast('Progress updated', 'success');
      loadHomeTab(entry.type);
    } catch (err) {
      showToast('Failed to update progress', 'error');
      btn.disabled = false;
      btn.textContent = 'Save';
    }
  });
}

function saveScrollPosition(key) {
  scrollPositions[key] = window.scrollY;
}

function restoreScrollPosition(key) {
  if (scrollPositions[key] !== undefined) {
    requestAnimationFrame(() => window.scrollTo(0, scrollPositions[key]));
  }
}

export { renderHomePage, saveScrollPosition, restoreScrollPosition };
