// Tracks spun-but-not-yet-collected quests, plus per-quest completion state.
// Entries stick around indefinitely until completed — there's no rolling
// time window anymore. A completed entry stays visible for the rest of the
// current visit (so the "collected" state is still readable), then is
// pruned the next time the player actually leaves and comes back — see
// pruneCompletedEntriesOncePerSession() below. Independent of the quest
// spin limiter's own bookkeeping, but driven by the same spins.
const TODAYS_QUESTS_KEY = 'jsq-todays-quests';
const TODAYS_QUESTS_PRUNED_FLAG_KEY = 'jsq-todays-quests-pruned-this-session';
const QUEST_COMPLETE_COOLDOWN_MS = 15 * 60 * 1000;

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
  return state;
}

function writeTodaysQuestsState(state) {
  try {
    localStorage.setItem(TODAYS_QUESTS_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore — today's quests just won't persist
  }
}

// Runs once per browser session (sessionStorage, so a same-tab reload
// doesn't count as "leaving"): drops any already-completed entries so they
// vanish the next time the player actually returns to the site, without
// yanking them away mid-visit right after being collected.
function pruneCompletedEntriesOncePerSession() {
  let alreadyPruned = false;
  try {
    alreadyPruned = sessionStorage.getItem(TODAYS_QUESTS_PRUNED_FLAG_KEY) === '1';
  } catch (e) {
    // ignore — worst case, pruning just runs again
  }
  if (alreadyPruned) return;
  const state = getTodaysQuestsState();
  const remaining = state.entries.filter((e) => !e.completed);
  if (remaining.length !== state.entries.length) {
    writeTodaysQuestsState({ entries: remaining });
  }
  try {
    sessionStorage.setItem(TODAYS_QUESTS_PRUNED_FLAG_KEY, '1');
  } catch (e) {
    // ignore
  }
}
pruneCompletedEntriesOncePerSession();

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
