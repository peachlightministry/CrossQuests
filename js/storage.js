// Tracks which quests the player has discovered, saved in the browser (localStorage).
const STORAGE_KEY = 'jsq-discovered-quests';

function getDiscoveredIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (e) {
    return new Set();
  }
}

function markDiscovered(questId) {
  const ids = getDiscoveredIds();
  const isNew = !ids.has(questId);
  ids.add(questId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch (e) {
    // storage unavailable — progress just won't persist
  }
  return isNew;
}

function isDiscovered(questId) {
  return getDiscoveredIds().has(questId);
}

function countDiscoveredInRarity(rarity) {
  const ids = getDiscoveredIds();
  return rarity.quests.filter((q) => ids.has(q.id)).length;
}

function hasDiscoveredAnyInRarity(rarity) {
  return countDiscoveredInRarity(rarity) > 0;
}

function totalDiscovered() {
  return getDiscoveredIds().size;
}

function totalQuests() {
  return RARITIES.reduce((sum, r) => sum + r.quests.length, 0);
}
