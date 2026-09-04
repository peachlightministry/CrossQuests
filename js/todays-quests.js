// Tracks spun-but-not-yet-claimed quests. An entry sticks around until the
// player marks it done (removed immediately) or abandons it, and otherwise
// auto-expires 7 days after it was spun. Independent of the quest spin
// limiter's own bookkeeping, but driven by the same spins.
const TODAYS_QUESTS_KEY = 'jsq-todays-quests';
const QUEST_COMPLETE_COOLDOWN_MS = 15 * 60 * 1000;
const QUEST_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;

function getTodaysQuestsState() {
  let state = null;
  try {
    const raw = localStorage.getItem(TODAYS_QUESTS_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) {
    state = null;
  }
  if (!state || !Array.isArray(state.entries)) {
    state = { entries: [] };
  }
  const unexpired = state.entries.filter((e) => Date.now() - e.spunAt < QUEST_EXPIRE_MS);
  if (unexpired.length !== state.entries.length) {
    state = { entries: unexpired };
    writeTodaysQuestsState(state);
  }
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
  };
  if (state.entries.length > 0) {
    state.entries[state.entries.length - 1] = newEntry;
  } else {
    state.entries.push(newEntry);
  }
  writeTodaysQuestsState(state);
  return state;
}

// Removes an entry from the list (used for both completing and abandoning
// a quest), returning it so the caller can still act on its rarity/points
// before it's gone.
function removeTodaysQuestEntryAt(index) {
  const state = getTodaysQuestsState();
  const entry = state.entries[index];
  if (!entry) return null;
  state.entries.splice(index, 1);
  writeTodaysQuestsState(state);
  return entry;
}

function canCompleteEntry(entry) {
  return Date.now() - entry.spunAt >= QUEST_COMPLETE_COOLDOWN_MS;
}

function msUntilEntryReady(entry) {
  return Math.max(0, entry.spunAt + QUEST_COMPLETE_COOLDOWN_MS - Date.now());
}

function msUntilEntryExpires(entry) {
  return Math.max(0, entry.spunAt + QUEST_EXPIRE_MS - Date.now());
}

function findRarityAndQuest(rarityId, questId) {
  const rarity = RARITIES.find((r) => r.id === rarityId);
  if (!rarity) return null;
  const quest = rarity.quests.find((q) => q.id === questId);
  if (!quest) return null;
  return { rarity, quest };
}
