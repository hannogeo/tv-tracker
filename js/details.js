import { auth, getEntry, addEntry, updateEntry } from './firebase.js';
import { getTvDetails, getMovieDetails, formatTvDetails, formatMovieDetails, getBackdropUrl, getPosterUrl } from './tmdb.js';
import { showToast, showModal, closeModal, getStatusLabel, initDatePicker } from './ui.js';

function renderDetailsPage(tmdbId, type) {
  const container = document.getElementById('page-container');
  container.innerHTML = '<div class="page-loader"><div class="spinner"></div></div>';

  loadDetails(container, tmdbId, type);
}

async function loadDetails(container, tmdbId, type) {
  try {
    const rawData = type === 'tv' ? await getTvDetails(tmdbId) : await getMovieDetails(tmdbId);
    const details = type === 'tv' ? formatTvDetails(rawData) : formatMovieDetails(rawData);

    let userEntry = null;
    if (auth.currentUser) {
      userEntry = await getEntry(auth.currentUser.uid, tmdbId, type);
    }

    renderDetailsContent(container, details, userEntry, type);
  } catch (err) {
    container.innerHTML = `
      <div class="not-found">
        <h1>404</h1>
        <p>Could not load details.</p>
        <a href="#/home" class="btn btn-primary">Back to Home</a>
      </div>
    `;
  }
}

function renderDetailsContent(container, details, userEntry, type) {
  const backdropUrl = getBackdropUrl(details.backdropPath);
  const posterUrl = getPosterUrl(details.posterPath);

  const isTv = type === 'tv';
  const isInList = !!userEntry;

  let userInfoHtml = '';
  if (isInList) {
    if (userEntry.userRating) {
      userInfoHtml += `<div class="info-item"><div class="info-label">My Rating</div><div class="info-value" style="color:#f1c40f;">★ ${userEntry.userRating}/10</div></div>`;
    }
    if (userEntry.startDate) {
      userInfoHtml += `<div class="info-item"><div class="info-label">Started</div><div class="info-value">${userEntry.startDate}</div></div>`;
    }
    if (userEntry.finishedDate) {
      userInfoHtml += `<div class="info-item"><div class="info-label">Finished</div><div class="info-value">${userEntry.finishedDate}</div></div>`;
    }
    if (userEntry.notes) {
      userInfoHtml += `<div class="info-item" style="grid-column:1/-1;"><div class="info-label">My Notes</div><div class="info-value" style="font-weight:400;white-space:pre-wrap;">${userEntry.notes}</div></div>`;
    }
  }

  container.innerHTML = `
    <div class="details-page">
      <div class="backdrop-wrapper">
        ${backdropUrl ? `<img class="backdrop-img" src="${backdropUrl}" alt="${details.title}" />` : '<div style="height:100%;background:var(--bg-card);"></div>'}
        <div class="backdrop-gradient"></div>
        <div class="backdrop-content">
          <div class="details-poster-wrapper">
            ${posterUrl
              ? `<img class="details-poster" src="${posterUrl}" alt="${details.title}" />`
              : `<div class="poster-fallback details-poster" style="height:210px;">${details.title}</div>`}
          </div>
          <div class="details-header-info">
            <h1 class="details-title">${details.title}</h1>
            <div class="details-meta">
              ${details.year ? `<span>${details.year}</span>` : ''}
              ${details.releaseDate ? `<span>${details.releaseDate}</span>` : ''}
              ${details.voteAverage ? `<span class="details-rating">★ ${details.voteAverage.toFixed(1)}</span>` : ''}
              <span class="media-badge ${type}">${isTv ? 'TV' : 'Movie'}</span>
            </div>
            <div class="details-genres">
              ${(details.genres || []).map((g) => `<span class="genre-tag">${g}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
      <div class="details-body">
        ${details.overview ? `<p class="details-overview">${details.overview}</p>` : ''}
        <div class="details-info-grid">
          ${isTv ? `
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${details.status}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Seasons</div>
              <div class="info-value">${details.totalSeasons}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Total Episodes</div>
              <div class="info-value">${details.totalEpisodes}</div>
            </div>
          ` : `
            <div class="info-item">
              <div class="info-label">Runtime</div>
              <div class="info-value">${details.runtime} min</div>
            </div>
            <div class="info-item">
              <div class="info-label">Release Date</div>
              <div class="info-value">${details.releaseDate || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status</div>
              <div class="info-value">${details.status}</div>
            </div>
          `}
          ${userInfoHtml}
        </div>
        <div class="details-actions">
          ${isInList
            ? `
              <button class="btn btn-primary" id="editEntryBtn">
                ${getStatusLabel(userEntry.status)} ${isTv ? `- ${userEntry.episodesWatched || 0}/${details.totalEpisodes || 0} ep` : ''}
                <span style="margin-left:4px;">✎</span>
              </button>
            `
            : `<button class="btn btn-primary" id="addEntryBtn">+ Add to List</button>`
          }
        </div>
        <div class="tmdb-attribution">
          <svg width="20" height="20" viewBox="0 0 64 64" style="flex-shrink:0;">
            <rect x="6" y="14" width="52" height="34" rx="5" fill="var(--accent)"/>
            <rect x="12" y="20" width="40" height="22" rx="3" fill="var(--bg-card)"/>
            <polygon points="27,25 27,37 37,31" fill="var(--accent)"/>
          </svg>
          Data provided by <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database (TMDB)</a>
        </div>
      </div>
    </div>
  `;

  if (isInList) {
    container.querySelector('#editEntryBtn').addEventListener('click', () => {
      showAddEditModal(details, userEntry, true);
    });
  } else {
    container.querySelector('#addEntryBtn').addEventListener('click', () => {
      showAddEditModal(details, null, false);
    });
  }
}

function showAddEditModal(details, userEntry, isEdit) {
  const isTv = details.type === 'tv';
  const statuses = ['watching', 'plan_to_watch', 'completed', 'dropped', 'on_hold'];
  const currentStatus = userEntry ? userEntry.status : 'plan_to_watch';
  const currentEp = userEntry ? (userEntry.episodesWatched || 0) : 0;
  const totalEp = details.totalEpisodes || 0;
  const currentRating = userEntry ? (userEntry.userRating || '') : '';
  const currentNotes = userEntry ? (userEntry.notes || '') : '';
  const currentStartDate = userEntry ? (userEntry.startDate || '') : '';
  const currentFinishedDate = userEntry ? (userEntry.finishedDate || '') : '';

  const ratingOptions = ['', 1,2,3,4,5,6,7,8,9,10].map((v) =>
    `<option value="${v}" ${String(currentRating) === String(v) ? 'selected' : ''}>${v === '' ? 'Not rated' : v}</option>`
  ).join('');

  const html = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit Entry' : 'Add to List'}</h3>
      <button class="modal-close" onclick="closeModal()">&times;</button>
    </div>
    <div class="modal-body">
      <p style="margin-bottom:16px;font-size:14px;color:var(--text-secondary);"><strong>${details.title}</strong></p>
      <div class="form-group">
        <label for="detailStatusSelect">Status</label>
        <select id="detailStatusSelect" class="form-select">
          ${statuses.map((s) => `<option value="${s}" ${s === currentStatus ? 'selected' : ''}>${getStatusLabel(s)}</option>`).join('')}
        </select>
      </div>
      ${isTv ? `
        <div class="form-group">
          <label for="detailEpInput">Episodes Watched (0 - ${totalEp})</label>
          <input type="number" id="detailEpInput" class="form-number" min="0" max="${totalEp}" value="${currentEp}" />
        </div>
      ` : ''}
      <div class="form-group">
        <label for="detailRating">My Rating</label>
        <select id="detailRating" class="form-select">
          ${ratingOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="detailStartDate">Started</label>
        <input type="date" id="detailStartDate" class="form-input" value="${currentStartDate}" />
      </div>
      <div class="form-group">
        <label for="detailFinishedDate">Finished</label>
        <input type="date" id="detailFinishedDate" class="form-input" value="${currentFinishedDate}" />
      </div>
      <div class="form-group">
        <label for="detailNotes">Notes</label>
        <textarea id="detailNotes" class="form-input" rows="3" style="resize:vertical;font-family:inherit;">${currentNotes}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" id="saveDetailBtn">${isEdit ? 'Save Changes' : 'Add to List'}</button>
    </div>
  `;

  showModal(html);
  initDatePicker(document.getElementById('detailStartDate'));
  initDatePicker(document.getElementById('detailFinishedDate'));
  const saveBtn = document.getElementById('saveDetailBtn');
  saveBtn.addEventListener('click', async () => {
    const status = document.getElementById('detailStatusSelect').value;
    let episodesWatched = 0;
    if (isTv) {
      episodesWatched = parseInt(document.getElementById('detailEpInput').value) || 0;
      if (episodesWatched > totalEp) episodesWatched = totalEp;
    }
    const userRating = parseInt(document.getElementById('detailRating').value) || null;
    const notes = document.getElementById('detailNotes').value.trim() || '';
    const startDate = document.getElementById('detailStartDate').value || '';
    const finishedDate = document.getElementById('detailFinishedDate').value || '';

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner spinner-sm"></span> Saving...';

    try {
      const uid = auth.currentUser.uid;
      const runtime = details.runtime || 0;

      const data = {
        tmdbId: details.tmdbId,
        type: details.type,
        title: details.title,
        posterPath: details.posterPath,
        year: details.year || '',
        status,
        episodesWatched,
        totalEpisodes: totalEp,
        runtime,
        userRating,
        notes,
        startDate,
        finishedDate,
      };

      if (isEdit) {
        await updateEntry(uid, details.tmdbId, details.type, { status, episodesWatched, runtime, userRating, notes, startDate, finishedDate });
        showToast('Entry updated', 'success');
      } else {
        await addEntry(uid, data);
        showToast('Added to list', 'success');
      }

      closeModal();
      renderDetailsPage(details.tmdbId, details.type);
    } catch (err) {
      showToast('Failed to save', 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = isEdit ? 'Save Changes' : 'Add to List';
    }
  });
}

export { renderDetailsPage };
