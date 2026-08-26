// Equippable titles: earned from the Notifications panel's special unlocks,
// equipped from Settings, and shown next to the player's name on the Event
// leaderboard. More get added here as new unlocks are handwritten in.
const TITLES = [
  { id: 'prepared', name: 'Prepared', color: '#1565C0' },
  { id: 'questbound', name: 'Questbound', color: '#2E7D32' },
  { id: 'mythic-truth-seeker', name: 'Mythic Truth Seeker', color: '#6A1B9A' },
];

const CLAIMED_TITLES_KEY = 'jsq-claimed-titles';
const EQUIPPED_TITLE_KEY = 'jsq-equipped-title';

function getClaimedTitles() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLAIMED_TITLES_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw : []);
  } catch (e) {
    return new Set();
  }
}

function isTitleClaimed(id) {
  return getClaimedTitles().has(id);
}

function claimTitle(id) {
  if (!TITLES.some((t) => t.id === id) || isTitleClaimed(id)) return false;
  const claimed = getClaimedTitles();
  claimed.add(id);
  try {
    localStorage.setItem(CLAIMED_TITLES_KEY, JSON.stringify([...claimed]));
  } catch (e) {
    // ignore
  }
  return true;
}

function getEquippedTitle() {
  try {
    const id = localStorage.getItem(EQUIPPED_TITLE_KEY);
    return id && isTitleClaimed(id) ? id : null;
  } catch (e) {
    return null;
  }
}

function setEquippedTitle(id) {
  try {
    if (id && isTitleClaimed(id)) {
      localStorage.setItem(EQUIPPED_TITLE_KEY, id);
    } else {
      localStorage.removeItem(EQUIPPED_TITLE_KEY);
    }
  } catch (e) {
    // ignore
  }
}

function titleInfo(id) {
  return TITLES.find((t) => t.id === id) || null;
}

window.TITLES = TITLES;
window.jsqIsTitleClaimed = isTitleClaimed;
window.jsqClaimTitle = claimTitle;
window.jsqGetEquippedTitle = getEquippedTitle;
window.jsqSetEquippedTitle = setEquippedTitle;
window.jsqTitleInfo = titleInfo;
