// Perfectionist upgrade tracking: a calendar-day counter (not tied to the
// 12h spin-limit windows) that awards a bonus point the first time, each
// day, that the player has completed both side quests and conquered a
// belief. Shared between index.html (quest completion) and beliefs.html
// (belief conquest) via localStorage.
const PERFECTIONIST_KEY = 'jsq-perfectionist';

function getPerfectionistState() {
  const today = new Date().toDateString();
  let state = null;
  try {
    const raw = localStorage.getItem(PERFECTIONIST_KEY);
    state = raw ? JSON.parse(raw) : null;
  } catch (e) {
    state = null;
  }
  if (!state || state.date !== today) {
    state = { date: today, questCompletions: 0, beliefConquered: false, bonusAwarded: false };
  }
  return state;
}

function writePerfectionistState(state) {
  try {
    localStorage.setItem(PERFECTIONIST_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore — bonus just won't persist
  }
}

function maybeAwardPerfectionistBonus(state) {
  if (!isUpgradeOwned('perfectionist')) return state;
  if (state.bonusAwarded) return state;
  if (state.questCompletions >= 2 && state.beliefConquered) {
    addPoints(1);
    state.bonusAwarded = true;
  }
  return state;
}

function recordQuestCompletionForPerfectionist() {
  let state = getPerfectionistState();
  state.questCompletions += 1;
  state = maybeAwardPerfectionistBonus(state);
  writePerfectionistState(state);
}

function recordBeliefConquestForPerfectionist() {
  let state = getPerfectionistState();
  state.beliefConquered = true;
  state = maybeAwardPerfectionistBonus(state);
  writePerfectionistState(state);
}
