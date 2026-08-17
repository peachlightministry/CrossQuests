// Cross Points: shared currency balance, displayed in the nav on every page.
const CROSS_POINTS_KEY = 'jsq-cross-points';
let crossIconUidCounter = 0;

function getPoints() {
  try {
    const raw = localStorage.getItem(CROSS_POINTS_KEY);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

function addPoints(amount) {
  const next = getPoints() + amount;
  try {
    localStorage.setItem(CROSS_POINTS_KEY, String(next));
  } catch (e) {
    // ignore — balance just won't persist
  }
  refreshCrossPointsDisplay();
  return next;
}

// Returns a self-contained cross icon SVG with a unique gradient id, safe to
// use multiple times on the same page.
function crossIconSVG(size) {
  crossIconUidCounter += 1;
  const gradId = `crossGrad-${crossIconUidCounter}`;
  return `<svg class="cross-icon" viewBox="0 0 24 24" width="${size || 18}" height="${size || 18}" aria-hidden="true">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFD54F"/>
        <stop offset="100%" stop-color="#E8912B"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="11" fill="url(#${gradId})"/>
    <path d="M11 5h2v5h5v2h-5v7h-2v-7H6v-2h5V5z" fill="white"/>
  </svg>`;
}

function refreshCrossPointsDisplay() {
  const el = document.getElementById('cross-points-value');
  if (el) el.textContent = getPoints();
}

refreshCrossPointsDisplay();
