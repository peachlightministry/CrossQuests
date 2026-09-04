// Daily login streak: counts consecutive calendar days (local time) the
// player has visited while signed in. Missing a day resets it to 1 on the
// next visit, rather than to 0, since that visit itself counts as day one
// of a new streak.
const STREAK_COUNT_KEY = 'jsq-streak-count';
const STREAK_LAST_DATE_KEY = 'jsq-streak-last-date';

function dateStringFor(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function todayDateString() {
  return dateStringFor(new Date());
}

function yesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateStringFor(d);
}

function getStreakCount() {
  try {
    const n = parseInt(localStorage.getItem(STREAK_COUNT_KEY) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

function refreshStreakBadge() {
  const el = document.getElementById('streak-count-value');
  if (el) el.textContent = String(getStreakCount());
}

function showStreakCelebration(count) {
  const backdrop = document.getElementById('streak-modal-backdrop');
  const countEl = document.getElementById('streak-modal-count');
  if (!backdrop) return;
  if (countEl) countEl.textContent = String(count);
  backdrop.classList.add('open');
  if (typeof playSound === 'function') playSound('click', { volume: 0.5 });
}

// Runs once per real calendar day, the first time this player is confirmed
// signed in that day — never more than once, and never for a page visit
// that isn't actually a "login" in the sense of an authenticated session.
function checkDailyStreak() {
  const today = todayDateString();
  let lastDate = null;
  try {
    lastDate = localStorage.getItem(STREAK_LAST_DATE_KEY);
  } catch (e) {
    // ignore
  }
  if (lastDate === today) {
    refreshStreakBadge();
    return;
  }
  const next = lastDate === yesterdayDateString() ? getStreakCount() + 1 : 1;
  try {
    localStorage.setItem(STREAK_COUNT_KEY, String(next));
    localStorage.setItem(STREAK_LAST_DATE_KEY, today);
  } catch (e) {
    // streak just won't persist
  }
  refreshStreakBadge();
  showStreakCelebration(next);
  if (typeof window.jsqContributeEventPoints === "function" && typeof window.jsqEventPointsInfo === "function") {
    window.jsqContributeEventPoints(window.jsqEventPointsInfo().dailyLogin);
  }
}

window.jsqGetStreakCount = getStreakCount;

const streakBadgeButton = document.getElementById('streak-badge-button');
const streakTooltip = document.getElementById('streak-tooltip');
if (streakBadgeButton && streakTooltip) {
  streakBadgeButton.addEventListener('click', () => {
    streakTooltip.hidden = !streakTooltip.hidden;
  });
  document.addEventListener('click', (e) => {
    if (!streakTooltip.hidden && !streakBadgeButton.contains(e.target) && !streakTooltip.contains(e.target)) {
      streakTooltip.hidden = true;
    }
  });
}

const streakModalBackdrop = document.getElementById('streak-modal-backdrop');
const streakModalClose = document.getElementById('streak-modal-close');
if (streakModalBackdrop && streakModalClose) {
  streakModalClose.addEventListener('click', () => streakModalBackdrop.classList.remove('open'));
  streakModalBackdrop.addEventListener('click', (e) => {
    if (e.target === streakModalBackdrop) streakModalBackdrop.classList.remove('open');
  });
}

refreshStreakBadge();

// Waits for cloud-sync's "local storage is stable" signal rather than the
// raw auth event — a fresh sign-in clears and repopulates local storage
// right after auth fires, which would otherwise wipe a streak write made
// a beat too early.
document.addEventListener('jsq-cloud-ready', () => checkDailyStreak());
