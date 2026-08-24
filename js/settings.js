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

const settingsButton = document.getElementById('settings-button');
const settingsBackdrop = document.getElementById('settings-modal-backdrop');
const settingsClose = document.getElementById('settings-modal-close');

if (settingsButton && settingsBackdrop && settingsClose) {
  settingsButton.addEventListener('click', () => {
    renderPaletteSwatches();
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
