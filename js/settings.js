const PALETTES = [
  {
    id: 'golden-peach',
    name: 'Golden Peach',
    preview: 'linear-gradient(180deg, #ffffff 0%, #fff3da 55%, #ffe6b0 100%)',
  },
  {
    id: 'sky-dawn',
    name: 'Sky Dawn',
    preview: 'linear-gradient(180deg, #ffffff 0%, #e3f4fd 55%, #cdeafc 100%)',
  },
  {
    id: 'rose-quartz',
    name: 'Rose Quartz',
    preview: 'linear-gradient(180deg, #ffffff 0%, #ffe9ec 55%, #ffd7dc 100%)',
  },
  {
    id: 'classic-cream',
    name: 'Classic Cream',
    preview: 'linear-gradient(180deg, #fff8e7 0%, #eaf6ff 100%)',
  },
];

const PALETTE_KEY = 'jsq-color-palette';
const DEFAULT_PALETTE = 'golden-peach';

function getSelectedPalette() {
  try {
    const stored = localStorage.getItem(PALETTE_KEY);
    return PALETTES.some((p) => p.id === stored) ? stored : DEFAULT_PALETTE;
  } catch (e) {
    return DEFAULT_PALETTE;
  }
}

function applyPalette(id) {
  PALETTES.forEach((p) => document.body.classList.remove(`palette-${p.id}`));
  if (id !== DEFAULT_PALETTE) {
    document.body.classList.add(`palette-${id}`);
  }
}

function setPalette(id) {
  try {
    localStorage.setItem(PALETTE_KEY, id);
  } catch (e) {
    // storage unavailable -- palette just won't persist
  }
  applyPalette(id);
  renderPaletteSwatches();
}

function renderPaletteSwatches() {
  const grid = document.getElementById('palette-swatch-grid');
  if (!grid) return;
  const selected = getSelectedPalette();
  grid.innerHTML = PALETTES.map(
    (p) => `
      <button class="palette-swatch${p.id === selected ? ' selected' : ''}" data-id="${p.id}" style="background:${p.preview}">
        <span class="palette-swatch-name">${p.name}</span>
      </button>
    `
  ).join('');
  grid.querySelectorAll('.palette-swatch').forEach((btn) => {
    btn.addEventListener('click', () => setPalette(btn.dataset.id));
  });
}

// Apply immediately on load so there's no flash of the wrong palette.
applyPalette(getSelectedPalette());

const FONTS = [
  { id: 'nunito', name: 'Nunito', preview: "'Nunito', -apple-system, sans-serif", family: "'Nunito', -apple-system, sans-serif" },
  { id: 'lora', name: 'Lora', preview: "'Lora', Georgia, serif", family: "'Lora', Georgia, serif" },
  { id: 'quicksand', name: 'Quicksand', preview: "'Quicksand', -apple-system, sans-serif", family: "'Quicksand', -apple-system, sans-serif" },
];

const FONT_KEY = 'jsq-body-font';
const DEFAULT_FONT = 'nunito';

function getSelectedFont() {
  try {
    const stored = localStorage.getItem(FONT_KEY);
    return FONTS.some((f) => f.id === stored) ? stored : DEFAULT_FONT;
  } catch (e) {
    return DEFAULT_FONT;
  }
}

function applyFont(id) {
  const font = FONTS.find((f) => f.id === id) || FONTS[0];
  document.documentElement.style.setProperty('--font-body', font.family);
}

function setFont(id) {
  try {
    localStorage.setItem(FONT_KEY, id);
  } catch (e) {
    // storage unavailable -- font choice just won't persist
  }
  applyFont(id);
  renderFontSwatches();
}

function renderFontSwatches() {
  const grid = document.getElementById('font-swatch-grid');
  if (!grid) return;
  const selected = getSelectedFont();
  grid.innerHTML = FONTS.map(
    (f) => `
      <button class="font-swatch${f.id === selected ? ' selected' : ''}" data-id="${f.id}" style="font-family:${f.preview}">
        ${f.name}
      </button>
    `
  ).join('');
  grid.querySelectorAll('.font-swatch').forEach((btn) => {
    btn.addEventListener('click', () => setFont(btn.dataset.id));
  });
}

applyFont(getSelectedFont());

function renderTitleSwatches() {
  const grid = document.getElementById('title-swatch-grid');
  if (!grid || typeof window.TITLES === 'undefined') return;
  const equipped = window.jsqGetEquippedTitle ? window.jsqGetEquippedTitle() : null;
  const owned = window.TITLES.filter((t) => window.jsqIsTitleClaimed && window.jsqIsTitleClaimed(t.id));
  if (owned.length === 0) {
    grid.innerHTML = '<p class="title-swatch-empty">No titles unlocked yet — check the 🔔 Notifications panel.</p>';
    return;
  }
  const noneButton = `<button class="title-swatch${!equipped ? ' selected' : ''}" data-id="">No Title</button>`;
  grid.innerHTML =
    noneButton +
    owned
      .map(
        (t) => `<button class="title-swatch${equipped === t.id ? ' selected' : ''}" data-id="${t.id}" style="color:${t.color}">${t.name}</button>`
      )
      .join('');
  grid.querySelectorAll('.title-swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.jsqSetEquippedTitle(btn.dataset.id || null);
      renderTitleSwatches();
    });
  });
}

const accountEmailEl = document.getElementById('jsq-account-email');
const blurToggle = document.getElementById('jsq-account-blur-toggle');
if (accountEmailEl && blurToggle) {
  blurToggle.addEventListener('click', () => {
    accountEmailEl.classList.toggle('blurred');
  });
}

const settingsButton = document.getElementById('settings-button');
const settingsBackdrop = document.getElementById('settings-modal-backdrop');
const settingsClose = document.getElementById('settings-modal-close');

if (settingsButton && settingsBackdrop && settingsClose) {
  settingsButton.addEventListener('click', () => {
    renderPaletteSwatches();
    renderFontSwatches();
    renderTitleSwatches();
    settingsBackdrop.classList.add('open');
  });

  settingsClose.addEventListener('click', () => {
    settingsBackdrop.classList.remove('open');
  });

  settingsBackdrop.addEventListener('click', (e) => {
    if (e.target === settingsBackdrop) settingsBackdrop.classList.remove('open');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') settingsBackdrop.classList.remove('open');
  });
}
