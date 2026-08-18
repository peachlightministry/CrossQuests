// Tracks the quests spun in the current 12h window, plus per-quest completion
// state. Independent of the quest spin limiter's own bookkeeping, but driven
// by the same spins.
const TODAYS_QUESTS_KEY = 'jsq-todays-quests';
const TODAYS_QUESTS_WINDOW_MS = 12 * 60 * 60 * 1000;
const QUEST_COMPLETE_COOLDOWN_MS = 15 * 60 * 1000;

function getTodaysQuestsState() {
  let state = null;
  try {
    const raw = localStorage.getItem(TODAYS_QUESTS_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) {
    state = null;
  }
  if (!state || typeof state.windowStart !== 'number' || Date.now() - state.windowStart >= TODAYS_QUESTS_WINDOW_MS) {
    state = { windowStart: Date.now(), entries: [] };
  }
  if (!Array.isArray(state.entries)) state.entries = [];
  return state;
}

function writeTodaysQuestsState(state) {
  try {
    localStorage.setItem(TODAYS_QUESTS_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore — today's quests just won't persist
  }
}

function addTodaysQuestEntry(rarity, quest) {
  const state = getTodaysQuestsState();
  state.entries.push({
    questId: quest.id,
    rarityId: rarity.id,
    spunAt: Date.now(),
    completed: false,
    completedAt: null,
  });
  writeTodaysQuestsState(state);
  return state;
}

// Used by the Divine Gambling reroll: swaps the most recently added entry
// for a fresh one instead of appending, so a free reroll doesn't inflate
// the day's quest count.
function replaceLastTodaysQuestEntry(rarity, quest) {
  const state = getTodaysQuestsState();
  const newEntry = {
    questId: quest.id,
    rarityId: rarity.id,
    spunAt: Date.now(),
    completed: false,
    completedAt: null,
  };
  if (state.entries.length > 0) {
    state.entries[state.entries.length - 1] = newEntry;
  } else {
    state.entries.push(newEntry);
  }
  writeTodaysQuestsState(state);
  return state;
}

function completeTodaysQuestEntryAt(index) {
  const state = getTodaysQuestsState();
  const entry = state.entries[index];
  if (!entry || entry.completed) return null;
  entry.completed = true;
  entry.completedAt = Date.now();
  writeTodaysQuestsState(state);
  return entry;
}

function canCompleteEntry(entry) {
  return !entry.completed && Date.now() - entry.spunAt >= QUEST_COMPLETE_COOLDOWN_MS;
}

function msUntilEntryReady(entry) {
  return Math.max(0, entry.spunAt + QUEST_COMPLETE_COOLDOWN_MS - Date.now());
}

function findRarityAndQuest(rarityId, questId) {
  const rarity = RARITIES.find((r) => r.id === rarityId);
  if (!rarity) return null;
  const quest = rarity.quests.find((q) => q.id === questId);
  if (!quest) return null;
  return { rarity, quest };
}
