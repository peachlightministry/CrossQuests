// Tracks which false beliefs the player has marked "conquered", saved in the browser.
const BELIEF_STORAGE_KEY = 'jsq-conquered-beliefs';

function getConqueredBeliefIds() {
  try {
    const raw = localStorage.getItem(BELIEF_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markConquered(beliefId) {
  const ids = getConqueredBeliefIds();
  const isNew = !ids.has(beliefId);
  ids.add(beliefId);
  try {
    localStorage.setItem(BELIEF_STORAGE_KEY, JSON.stringify([...ids]));
  } catch (e) {
    // storage unavailable — progress just won't persist
  }
  return isNew;
}

function isConquered(beliefId) {
  return getConqueredBeliefIds().has(beliefId);
}

function countConquered() {
  return getConqueredBeliefIds().size;
}

function totalBeliefs() {
  return FALSE_BELIEFS.length;
}
