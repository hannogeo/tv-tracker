import { auth, getUserEntries, updateEntry, removeEntry } from './firebase.js';
import { showToast, showConfirmModal, showModal, closeModal, getStatusLabel, renderTrackedCard, initDatePicker } from './ui.js';

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
    const sections = getSections(filtered);
    renderSections(content, sections);
    attachHomeEvents(content, uid);
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><p>Error loading entries.</p></div>`;
  }
}

function getSections(entries) {
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

function renderSections(container, sections) {
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

  container.querySelectorAll('[data-action="edit-entry"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id);
      const type = btn.dataset.type;
      const entries = await getUserEntries(uid);
      const entry = entries.find((en) => en.tmdbId === id && en.type === type);
      if (!entry) return;
      showEditEntryModal(uid, entry, type);
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

function showEditEntryModal(uid, entry, currentTab) {
  const isTv = entry.type === 'tv';
  const statuses = ['watching', 'plan_to_watch', 'completed', 'dropped', 'on_hold'];
  const total = entry.totalEpisodes || 0;
  const currentRating = entry.userRating || '';

  const ratingNumbers = [1,2,3,4,5,6,7,8,9,10].map((n) =>
    `<div class="rating-num ${currentRating === n ? 'active' : ''}" data-value="${n}">${n}</div>`
  ).join('');

  const html = `
    <div class="modal-header">
      <h3>Edit ${entry.title}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="editStatusSel">Status</label>
        <select id="editStatusSel" class="form-select">
          ${statuses.map((s) => `<option value="${s}" ${s === entry.status ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
        </select>
      </div>
      ${isTv ? `
        <div class="form-group">
          <label for="editEpInput">Episodes Watched (0 - ${total})</label>
          <input type="number" id="editEpInput" class="form-number" min="0" max="${total}" value="${entry.episodesWatched || 0}" />
        </div>
      ` : ''}
      <div class="form-group">
        <label>My Rating</label>
        <div class="rating-picker" id="ratingPicker">
          <div class="rating-num" data-value="">—</div>
          ${ratingNumbers}
        </div>
      </div>
      <div class="form-group">
        <label for="editStartDate">Started</label>
        <input type="date" id="editStartDate" class="form-input" value="${entry.startDate || ''}" />
      </div>
      <div class="form-group">
        <label for="editFinishedDate">Finished</label>
        <input type="date" id="editFinishedDate" class="form-input" value="${entry.finishedDate || ''}" />
      </div>
      <div class="form-group">
        <label for="editNotesInput">Notes</label>
        <textarea id="editNotesInput" class="form-input" rows="3" style="resize:vertical;font-family:inherit;">${entry.notes || ''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveEditBtn">Save Changes</button>
    </div>
  `;

  showModal(html);

  initDatePicker(document.getElementById('editStartDate'));
  initDatePicker(document.getElementById('editFinishedDate'));

  let selectedRating = currentRating;
  document.querySelectorAll('#ratingPicker .rating-num').forEach((el) => {
    el.addEventListener('click', () => {
      document.querySelectorAll('#ratingPicker .rating-num').forEach((e) => e.classList.remove('active'));
      el.classList.add('active');
      selectedRating = el.dataset.value ? parseInt(el.dataset.value) : null;
    });
  });

  document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const status = document.getElementById('editStatusSel').value;
    let episodesWatched = entry.episodesWatched || 0;
    if (isTv) {
      episodesWatched = parseInt(document.getElementById('editEpInput').value) || 0;
      if (episodesWatched > total) episodesWatched = total;
    }
    const notes = document.getElementById('editNotesInput').value.trim() || '';
    const startDate = document.getElementById('editStartDate').value || '';
    const finishedDate = document.getElementById('editFinishedDate').value || '';

    const btn = document.getElementById('saveEditBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

    try {
      const data = { status, episodesWatched, userRating: selectedRating, notes, startDate, finishedDate };
      if (episodesWatched >= total && total > 0) data.status = 'completed';
      await updateEntry(uid, entry.tmdbId, entry.type, data);
      closeModal();
      showToast('Entry updated', 'success');
      loadHomeTab(currentTab || entry.type);
    } catch (err) {
      showToast('Failed to update entry', 'error');
      btn.disabled = false;
      btn.textContent = 'Save Changes';
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
