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
  return FALSE_BELIEFS.filter((b) => !b.locked).length;
}

// Beliefs are single-use: once drawn, a belief is retired from the spin
// pool forever, whether or not it ends up conquered.
const BELIEF_SPUN_KEY = 'jsq-spun-beliefs';

function getSpunBeliefIds() {
  try {
    const raw = localStorage.getItem(BELIEF_SPUN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markSpun(beliefId) {
  const ids = getSpunBeliefIds();
  ids.add(beliefId);
  try {
    localStorage.setItem(BELIEF_SPUN_KEY, JSON.stringify([...ids]));
  } catch (e) {
    // storage unavailable — progress just won't persist
  }
}

// At most one belief can be "pending" (spun but not yet conquered) at a
// time — spinning again is blocked until it's resolved.
const BELIEF_PENDING_KEY = 'jsq-pending-belief';

function getPendingBeliefId() {
  try {
    return localStorage.getItem(BELIEF_PENDING_KEY) || null;
  } catch (e) {
    return null;
  }
}

function setPendingBeliefId(beliefId) {
  try {
    if (beliefId) {
      localStorage.setItem(BELIEF_PENDING_KEY, beliefId);
    } else {
      localStorage.removeItem(BELIEF_PENDING_KEY);
    }
  } catch (e) {
    // storage unavailable — the gate just won't persist across reloads
  }
}
