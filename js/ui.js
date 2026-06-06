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

  let datesHtml = '';
  if (entry.startDate || entry.finishedDate) {
    const parts = [];
    if (entry.startDate) parts.push(`Started ${entry.startDate}`);
    if (entry.finishedDate) parts.push(`Finished ${entry.finishedDate}`);
    datesHtml = `<div class="card-dates">${parts.join(' · ')}</div>`;
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
          <button class="card-dropdown-item" data-action="edit-entry" data-id="${entry.tmdbId}" data-type="${entry.type}">Edit</button>
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
        ${datesHtml}
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

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function generateDefaultConfig(seed) {
  const h = hashString(seed);
  const shapeNames = ['#ef4444','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#8b5cf6','#ec4899','#1a1a2e','#6b7280'];
  const pastelNames = ['#ffffff','#fecaca','#fed7aa','#fef08a','#bbf7d0','#ccfbf1','#bfdbfe','#e9d5ff','#d1d5db','#f1f5f9'];
  const shapeIdx = h % SHAPE_IDS.length;
  const bgIdx = (h >> 5) % 10;
  const fgIdx = (h >> 10) % 10;
  return {
    shape: SHAPE_IDS[shapeIdx],
    bg: shapeNames[bgIdx],
    fg: pastelNames[fgIdx],
  };
}

const SHAPE_IDS = ['triangle', 'circle', 'square', 'diamond', 'hexagon'];

const SHAPES = [
  function triangle(fg, s) {
    return `<polygon points="${s/2},${s*0.18} ${s*0.85},${s*0.82} ${s*0.15},${s*0.82}" fill="${fg}" opacity="0.85"/>`;
  },
  function circle(fg, s) {
    return `<circle cx="${s/2}" cy="${s/2}" r="${s*0.34}" fill="${fg}" opacity="0.85"/>`;
  },
  function square(fg, s) {
    const m = s * 0.18;
    return `<rect x="${m}" y="${m}" width="${s - m * 2}" height="${s - m * 2}" rx="${s * 0.04}" fill="${fg}" opacity="0.85"/>`;
  },
  function diamond(fg, s) {
    return `<polygon points="${s/2},${s*0.15} ${s*0.85},${s/2} ${s/2},${s*0.85} ${s*0.15},${s/2}" fill="${fg}" opacity="0.85"/>`;
  },
  function hexagon(fg, s) {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * 2 * Math.PI) / 6 - Math.PI / 2;
      pts.push(`${s/2 + s*0.38*Math.cos(a)},${s/2 + s*0.38*Math.sin(a)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="${fg}" opacity="0.85"/>`;
  },
];

function getShapeIndex(shape) {
  if (typeof shape === 'number') {
    const oldMap = { 0: 'triangle', 1: 'circle', 2: 'diamond', 8: 'hexagon' };
    return SHAPE_IDS.indexOf(oldMap[shape] || 'triangle');
  }
  const idx = SHAPE_IDS.indexOf(shape);
  return idx >= 0 ? idx : 0;
}

function generateAvatarSVG(input, size = 64) {
  let bg, fg, svg;
  if (typeof input === 'string') {
    const def = generateDefaultConfig(input);
    bg = def.bg;
    fg = def.fg;
    svg = SHAPES[getShapeIndex(def.shape)](fg, size);
  } else if (input.shape !== undefined) {
    bg = input.bg;
    fg = input.fg;
    svg = SHAPES[getShapeIndex(input.shape)](fg, size);
  } else {
    bg = input.bg;
    fg = input.fg;
    svg = SHAPES[0](fg, size);
  }
  const r = size / 8;
  return `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/>${svg}</svg>`)}`;
}

function getAvatarUrl(seed) {
  return generateAvatarSVG(seed || 'default');
}

function updateNavbarAvatar(avatarUrl) {
  const img = document.getElementById('avatarImg');
  if (img) {
    img.src = avatarUrl;
    img.style.display = 'block';
  }
  const placeholder = document.getElementById('avatarPlaceholder');
  if (placeholder) placeholder.style.display = 'none';
}

function initDatePicker(inputEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'date-picker-wrap';

  const display = document.createElement('button');
  display.type = 'button';
  display.className = 'date-field-btn';
  const hasValue = !!inputEl.value;
  display.innerHTML = `<span class="date-field-text${hasValue ? '' : ' empty'}">${hasValue ? formatDateDisplay(inputEl.value) : 'Select date'}</span>
    <svg class="date-field-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;

  const popup = document.createElement('div');
  popup.className = 'date-picker-popup';
  popup.style.display = 'none';

  let viewDate = inputEl.value ? new Date(inputEl.value + 'T00:00:00') : new Date();
  let selectedDate = inputEl.value || '';

  function renderCalendar() {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const dayNames = ['S','M','T','W','T','F','S'];

    let html = `<div class="dp-header">
      <button class="dp-nav" data-dir="-1">‹</button>
      <span class="dp-month-year">${monthNames[month]} ${year}</span>
      <button class="dp-nav" data-dir="1">›</button>
    </div>
    <div class="dp-weekdays">${dayNames.map(d => `<span>${d}</span>`).join('')}</div>
    <div class="dp-days">`;

    for (let i = 0; i < firstDay; i++) {
      html += '<span class="dp-empty"></span>';
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const classes = ['dp-day'];
      if (dateStr === selectedDate) classes.push('selected');
      if (dateStr === todayStr) classes.push('today');
      html += `<span class="${classes.join(' ')}" data-date="${dateStr}">${d}</span>`;
    }
    html += '</div>';
    popup.innerHTML = html;

    popup.querySelectorAll('.dp-nav').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        viewDate.setMonth(viewDate.getMonth() + parseInt(btn.dataset.dir));
        renderCalendar();
      });
    });

    popup.querySelectorAll('.dp-day').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedDate = el.dataset.date;
        inputEl.value = selectedDate;
        const textEl = display.querySelector('.date-field-text');
        textEl.textContent = formatDateDisplay(selectedDate);
        textEl.classList.remove('empty');
        popup.style.display = 'none';
      });
    });
  }

  display.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.style.display === 'block') {
      popup.style.display = 'none';
      return;
    }
    viewDate = inputEl.value ? new Date(inputEl.value + 'T00:00:00') : new Date();
    selectedDate = inputEl.value || '';
    renderCalendar();
    popup.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      popup.style.display = 'none';
    }
  });

  inputEl.style.display = 'none';
  wrapper.appendChild(display);
  wrapper.appendChild(popup);
  inputEl.parentNode.insertBefore(wrapper, inputEl.nextSibling);
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return 'Select date';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initCustomSelect(selectEl) {
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrap';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select-btn';
  function updateBtn() {
    const opt = selectEl.options[selectEl.selectedIndex];
    btn.innerHTML = `${opt ? opt.text : 'Select'} <svg class="custom-select-arrow" width="12" height="12" viewBox="0 0 12 12"><path fill="currentColor" d="M6 8L1 3h10z"/></svg>`;
  }
  updateBtn();

  const popup = document.createElement('div');
  popup.className = 'custom-select-popup';
  popup.style.display = 'none';

  function renderOptions() {
    popup.innerHTML = Array.from(selectEl.options).map((opt, i) =>
      `<div class="custom-select-option${opt.selected ? ' selected' : ''}" data-index="${i}">${opt.text}</div>`
    ).join('');
    popup.querySelectorAll('.custom-select-option').forEach(el => {
      el.addEventListener('click', () => {
        selectEl.selectedIndex = parseInt(el.dataset.index);
        updateBtn();
        popup.style.display = 'none';
        selectEl.dispatchEvent(new Event('change'));
      });
    });
  }

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup.style.display === 'block') {
      popup.style.display = 'none';
      return;
    }
    renderOptions();
    popup.style.display = 'block';
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      popup.style.display = 'none';
    }
  });

  selectEl.style.display = 'none';
  wrapper.appendChild(btn);
  wrapper.appendChild(popup);
  selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

  return { update: updateBtn };
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
  generateAvatarSVG,
  getAvatarUrl,
  updateNavbarAvatar,
  generateDefaultConfig,
  getShapeIndex,
  SHAPE_IDS,
  initDatePicker,
  initCustomSelect,
};
