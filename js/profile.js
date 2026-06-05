import { auth, getUserProfile, getUserEntries, updateAvatarConfig, updateEntry } from './firebase.js';
import { generateAvatarSVG, updateNavbarAvatar, showToast, generateDefaultConfig } from './ui.js';
import { getMovieDetails } from './tmdb.js';

function renderProfilePage() {
  const container = document.getElementById('page-container');
  container.innerHTML = `
    <div class="profile-page">
      <h1 class="page-title">Profile</h1>
      <div id="profileContent">
        <div class="home-loading"><div class="spinner"></div></div>
      </div>
    </div>
  `;
  loadProfile();
}

async function loadProfile() {
  const content = document.getElementById('profileContent');
  try {
    const uid = auth.currentUser.uid;
    const profile = await getUserProfile(uid);
    const entries = await getUserEntries(uid);
    await backfillRuntimes(uid, entries);
    const stats = calculateStats(entries);

    const avatarConfig = profile?.avatar || null;
    const seed = profile?.avatarSeed || uid;
    const avatarInput = avatarConfig || seed;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:20px;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid var(--border);">
        <div style="position:relative;flex-shrink:0;">
          <img src="${generateAvatarSVG(avatarInput, 80)}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;display:block;" id="profileAvatar" />
        </div>
        <div>
          <h2 style="font-size:20px;font-weight:700;">${profile?.username || auth.currentUser.displayName || 'User'}</h2>
          <button id="editAvatarBtn" class="btn btn-sm" style="margin-top:8px;">Edit Avatar</button>
        </div>
      </div>
      <h3 style="margin-bottom:20px;">Statistics</h3>
      <div class="profile-stat-section">
        <div class="profile-stat-section-label">Series</div>
        <div class="profile-stats-row">
          <div class="profile-stat-card">
            <div class="stat-value">${stats.series.total}</div>
            <div class="stat-label">Total</div>
          </div>
          <div class="profile-stat-card">
            <div class="stat-value">${stats.series.episodesWatched}</div>
            <div class="stat-label">Episodes Watched</div>
          </div>
        </div>
      </div>
      <div class="profile-stats-status">
        ${renderStatusItem('Watching', stats.series.watching, stats.series.total, 'var(--status-watching)')}
        ${renderStatusItem('Plan to Watch', stats.series.plan_to_watch, stats.series.total, 'var(--status-plan)')}
        ${renderStatusItem('Completed', stats.series.completed, stats.series.total, 'var(--status-completed)')}
        ${renderStatusItem('Dropped', stats.series.dropped, stats.series.total, 'var(--status-dropped)')}
        ${renderStatusItem('On Hold', stats.series.on_hold, stats.series.total, 'var(--status-hold)')}
      </div>
      <div class="profile-stat-section">
        <div class="profile-stat-section-label">Movies</div>
        <div class="profile-stats-row">
          <div class="profile-stat-card">
            <div class="stat-value">${stats.movies.total}</div>
            <div class="stat-label">Total</div>
          </div>
          ${stats.movies.totalRuntime ? `
          <div class="profile-stat-card">
            <div class="stat-value">${formatRuntime(stats.movies.totalRuntime)}</div>
            <div class="stat-label">Total Runtime</div>
          </div>` : ''}
        </div>
      </div>
      <div class="profile-stats-status">
        ${renderStatusItem('Watching', stats.movies.watching, stats.movies.total, 'var(--status-watching)')}
        ${renderStatusItem('Plan to Watch', stats.movies.plan_to_watch, stats.movies.total, 'var(--status-plan)')}
        ${renderStatusItem('Completed', stats.movies.completed, stats.movies.total, 'var(--status-completed)')}
        ${renderStatusItem('Dropped', stats.movies.dropped, stats.movies.total, 'var(--status-dropped)')}
        ${renderStatusItem('On Hold', stats.movies.on_hold, stats.movies.total, 'var(--status-hold)')}
      </div>
    `;

    document.getElementById('editAvatarBtn').addEventListener('click', () => {
      openAvatarEditor(uid, avatarConfig, seed);
    });
  } catch (err) {
    content.innerHTML = '<div class="empty-state"><p>Failed to load profile.</p></div>';
  }
}

const SHAPE_NAMES = [
  'Triangle', 'Circle', 'Diamond', 'Wave', 'Cross',
  'Star', 'Heart', 'Arrows', 'Hexagon', 'Ring',
];

const COLOR_ROW_BOLD = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6',
  '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#1a1a2e',
];
const COLOR_ROW_PASTEL = [
  '#ffffff', '#fed7aa', '#fef08a', '#bbf7d0', '#ccfbf1',
  '#bfdbfe', '#e9d5ff', '#fecaca', '#d1d5db', '#f3f4f6',
];

function swatchRowHTML(colors, selected) {
  return colors.map(c =>
    `<button class="color-swatch${c === selected ? ' active' : ''}" style="background:${c};${c === '#ffffff' ? 'border:2px solid #d1d5db;' : ''}"></button>`
  ).join('');
}

function shapeThumbSVG(idx, size) {
  return generateAvatarSVG({ shape: idx, bg: '#e5e7eb', fg: '#374151' }, size);
}

function openAvatarEditor(uid, existingConfig, seed) {
  let config;
  if (existingConfig) {
    config = existingConfig;
  } else {
    const def = generateDefaultConfig(seed);
    config = { shape: def.shape, bg: def.bg, fg: def.fg };
  }
  const currentShape = config.shape !== undefined ? config.shape : 0;
  const prevBg = config.bg || '#14b8a6';
  const prevFg = config.fg || '#ffffff';

  let selectedShape = currentShape;
  let selectedBg = prevBg;
  let selectedFg = prevFg;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  const shapeThumbs = SHAPE_NAMES.map((name, i) => {
    const url = shapeThumbSVG(i, 48);
    const active = i === selectedShape ? ' style="border-color:var(--accent);"' : '';
    return `<button class="preset-thumb" data-index="${i}"${active}><img src="${url}" alt="${name}" title="${name}" style="width:48px;height:48px;border-radius:6px;display:block;"/></button>`;
  }).join('');

  overlay.innerHTML = `
    <div class="modal" style="max-width:480px;">
      <div class="modal-header">
        <h3>Edit Avatar</h3>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:6px;">Pick a pattern</p>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:16px;">${shapeThumbs}</div>
        <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:flex-start;">
          <div style="flex:1;min-width:180px;">
            <div style="margin-bottom:10px;">
              <p style="font-size:12px;color:var(--text-secondary);margin-bottom:3px;">Background</p>
              <div class="avatar-color-picker" data-color-group="bg" style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:grid;grid-template-columns:repeat(10,28px);gap:4px;">${swatchRowHTML(COLOR_ROW_BOLD, selectedBg)}</div>
                <div style="display:grid;grid-template-columns:repeat(10,28px);gap:4px;">${swatchRowHTML(COLOR_ROW_PASTEL, selectedBg)}</div>
              </div>
            </div>
            <div>
              <p style="font-size:12px;color:var(--text-secondary);margin-bottom:3px;">Foreground</p>
              <div class="avatar-color-picker" data-color-group="fg" style="display:flex;flex-direction:column;gap:3px;">
                <div style="display:grid;grid-template-columns:repeat(10,28px);gap:4px;">${swatchRowHTML(COLOR_ROW_BOLD, selectedFg)}</div>
                <div style="display:grid;grid-template-columns:repeat(10,28px);gap:4px;">${swatchRowHTML(COLOR_ROW_PASTEL, selectedFg)}</div>
              </div>
            </div>
          </div>
          <div style="text-align:center;">
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">Preview</p>
            <img id="avatarPreview" src="" alt="Preview" style="width:100px;height:100px;border-radius:50%;object-fit:cover;display:block;border:2px solid var(--border);margin:0 auto;"/>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" id="avatarEditorCancel">Cancel</button>
        <button class="btn" id="avatarEditorSave">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const previewEl = overlay.querySelector('#avatarPreview');

  function updatePreview() {
    const svg = generateAvatarSVG({ shape: selectedShape, bg: selectedBg, fg: selectedFg }, 100);
    previewEl.src = svg;
  }

  function selectShape(index) {
    selectedShape = index;
    overlay.querySelectorAll('.preset-thumb').forEach(b => b.style.borderColor = 'transparent');
    overlay.querySelector(`.preset-thumb[data-index="${index}"]`).style.borderColor = 'var(--accent)';
    updatePreview();
  }

  overlay.querySelectorAll('.preset-thumb').forEach(btn => {
    btn.addEventListener('click', () => selectShape(parseInt(btn.dataset.index)));
  });

  overlay.querySelector('.modal-close').addEventListener('click', close);
  overlay.querySelector('#avatarEditorCancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  function setupColorPickers(containerSelector, setter) {
    const container = overlay.querySelector(containerSelector);
    if (!container) return;
    container.querySelectorAll('.color-swatch').forEach(el => {
      el.addEventListener('click', () => {
        container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        setter(el.style.backgroundColor);
        updatePreview();
      });
    });
  }

  setupColorPickers('[data-color-group="bg"]', (c) => { selectedBg = c; });
  setupColorPickers('[data-color-group="fg"]', (c) => { selectedFg = c; });

  overlay.querySelector('#avatarEditorSave').addEventListener('click', async () => {
    const configToSave = { shape: selectedShape, bg: selectedBg, fg: selectedFg };
    try {
      await updateAvatarConfig(uid, configToSave);
      document.getElementById('profileAvatar').src = generateAvatarSVG(configToSave, 80);
      updateNavbarAvatar(generateAvatarSVG(configToSave, 64));
      showToast('Avatar saved');
      close();
    } catch {
      showToast('Failed to save avatar');
    }
  });

  function close() {
    overlay.remove();
  }

  updatePreview();
}

function formatRuntime(minutes) {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function renderStatusItem(label, count, total, color) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return `
    <div class="profile-status-item">
      <div class="status-dot" style="background:${color};"></div>
      <div class="status-info">
        <div class="status-label">${label}</div>
        <div class="status-count" style="color:${color};">${count}</div>
        <div class="status-bar"><div class="status-bar-fill" style="width:${pct}%;background:${color};"></div></div>
      </div>
    </div>
  `;
}

function calculateStats(entries) {
  const make = () => ({ total: 0, episodesWatched: 0, totalRuntime: 0, watching: 0, plan_to_watch: 0, completed: 0, dropped: 0, on_hold: 0 });
  const series = make();
  const movies = make();
  entries.forEach((e) => {
    const bucket = e.type === 'tv' ? series : movies;
    bucket.total++;
    bucket.episodesWatched += e.episodesWatched || 0;
    if (e.type !== 'tv') bucket.totalRuntime += e.runtime || 0;
    if (bucket.hasOwnProperty(e.status)) bucket[e.status]++;
  });
  return { series, movies };
}

async function backfillRuntimes(uid, entries) {
  const needsBackfill = entries.filter((e) => !e.runtime && e.type === 'movie' && e.tmdbId);
  if (needsBackfill.length === 0) return;
  const fetches = needsBackfill.map(async (entry) => {
    try {
      const data = await getMovieDetails(entry.tmdbId);
      const runtime = data.runtime || 0;
      if (runtime > 0) {
        entry.runtime = runtime;
        await updateEntry(uid, entry.tmdbId, entry.type, { runtime });
      }
    } catch {}
  });
  await Promise.allSettled(fetches);
}

export { renderProfilePage };
