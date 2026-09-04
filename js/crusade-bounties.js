// The Crusade's bounty system: 5 active slots drawn from a rarity-weighted
// pool of 16 possible bounties, tracked entirely client-side (auto-mirrored
// to Firestore like any other localStorage key via cloud-sync.js — no new
// Firestore rules needed). Runs on every page so time-on-site and action
// hooks (quest spins/completions, lie slaying, shop purchases) can update
// bounty progress no matter where the player is; only renders a visible
// panel where #crusade-bounties-panel exists (the Event page).
const BOUNTY_TIERS = {
  common: { label: 'Common', points: 5, weight: 45, color: '#2E7D32' },
  rare: { label: 'Rare', points: 15, weight: 28, color: '#1565C0' },
  legendary: { label: 'Legendary', points: 30, weight: 18, color: '#C62828' },
  mythical: { label: 'Mythical', points: 115, weight: 9, color: '#6A1B9A' },
};

function countConqueredSafe() {
  return typeof countConquered === 'function' ? countConquered() : 0;
}
function totalQuestsCompletedSafe() {
  return typeof getTotalQuestsCompletedEver === 'function' ? getTotalQuestsCompletedEver() : 0;
}
function totalDiscoveredSafe() {
  return typeof totalDiscovered === 'function' ? totalDiscovered() : 0;
}
function coinsBalanceSafe() {
  return typeof getPoints === 'function' ? getPoints() : 0;
}
function streakCountSafe() {
  return typeof window.jsqGetStreakCount === 'function' ? window.jsqGetStreakCount() : 0;
}
function timeOnSiteMsSafe() {
  return getTimeOnSiteMs();
}

// kind: 'count' — progress = statKey() - slot.snapshot, taken at assignment.
// kind: 'threshold' — progress = statKey() right now, no snapshot needed.
// kind: 'event' — flips true the instant a matching hook fires while active.
const BOUNTIES = [
  { id: 'slay-2-lies', tier: 'common', description: 'Slay 2 lies.', kind: 'count', statKey: countConqueredSafe, threshold: 2 },
  { id: 'complete-rarer-than-mustard', tier: 'common', description: 'Complete a side quest rarer than Mustard Seed.', kind: 'event', trigger: 'quest-completed', predicate: (p) => p.rarity && p.rarity.id !== 'mustard-seed' },
  { id: 'acquire-10-coins', tier: 'common', description: 'Acquire 10 coins.', kind: 'count', statKey: coinsBalanceSafe, threshold: 10 },
  { id: 'collect-2-new-quests', tier: 'common', description: 'Collect 2 new quests to your index.', kind: 'count', statKey: totalDiscoveredSafe, threshold: 2 },

  { id: 'buy-something', tier: 'rare', description: 'Buy something from the Shop.', kind: 'event', trigger: 'shop-purchase' },
  { id: 'complete-6-quests', tier: 'rare', description: 'Complete 6 side quests.', kind: 'count', statKey: totalQuestsCompletedSafe, threshold: 6 },
  { id: 'streak-3', tier: 'rare', description: 'Acquire a daily streak of 3.', kind: 'threshold', statKey: streakCountSafe, threshold: 3 },
  { id: 'spend-15-min', tier: 'rare', description: 'Spend 15 minutes on the website.', kind: 'count', statKey: timeOnSiteMsSafe, threshold: 15 * 60 * 1000 },

  { id: 'streak-5', tier: 'legendary', description: 'Have a daily streak of 5.', kind: 'threshold', statKey: streakCountSafe, threshold: 5 },
  { id: 'slay-5-lies', tier: 'legendary', description: 'Slay 5 lies.', kind: 'count', statKey: countConqueredSafe, threshold: 5 },
  { id: 'roll-rarer-than-30', tier: 'legendary', description: 'Roll a side quest rarer than 1 in 30.', kind: 'event', trigger: 'quest-logged', predicate: (p) => p.rarity && p.rarity.oddsN > 30 },
  { id: 'complete-at-least-widows-mite', tier: 'legendary', description: "Complete a side quest at least as rare as Widow's Mite.", kind: 'event', trigger: 'quest-completed', predicate: (p) => p.rarity && p.rarity.oddsN >= 10 },
  { id: 'index-12-new-quests', tier: 'legendary', description: 'Index 12 new side quests.', kind: 'count', statKey: totalDiscoveredSafe, threshold: 12 },

  { id: 'roll-rarest', tier: 'mythical', description: 'Roll the rarest quest (1 in 110).', kind: 'event', trigger: 'quest-logged', predicate: (p) => p.rarity && p.rarity.id === 'burning-bush' },
  { id: 'complete-rarest', tier: 'mythical', description: 'Complete the rarest quest (1 in 110).', kind: 'event', trigger: 'quest-completed', predicate: (p) => p.rarity && p.rarity.id === 'burning-bush' },
  { id: 'spend-1-hour', tier: 'mythical', description: 'Spend 1 hour on the website.', kind: 'count', statKey: timeOnSiteMsSafe, threshold: 60 * 60 * 1000 },
];

// Splits each tier's total appearance weight evenly across its own bounties,
// so "chance of getting some Mythical bounty" stays constant regardless of
// how many Mythical bounties exist.
const TIER_COUNTS = BOUNTIES.reduce((acc, b) => {
  acc[b.tier] = (acc[b.tier] || 0) + 1;
  return acc;
}, {});
BOUNTIES.forEach((b) => {
  b.weight = BOUNTY_TIERS[b.tier].weight / TIER_COUNTS[b.tier];
});

const BOUNTY_STATE_KEY = 'jsq-crusade-bounties';
const REFRESH_LIMIT_KEY = 'jsq-crusade-bounty-refresh';
const TIME_ONSITE_KEY = 'jsq-crusade-time-onsite-ms';
const REFRESH_WINDOW_MS = 12 * 60 * 60 * 1000;
const SLOT_REFILL_MS = 2 * 60 * 60 * 1000;
const SLOT_COUNT = 5;
const TIME_TICK_MS = 10000;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function formatShortDuration(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ---- Time on site (cumulative across visits, all-time) ----

function getTimeOnSiteMs() {
  try {
    const n = parseInt(localStorage.getItem(TIME_ONSITE_KEY) || '0', 10);
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}

function addTimeOnSite(ms) {
  try {
    localStorage.setItem(TIME_ONSITE_KEY, String(getTimeOnSiteMs() + ms));
  } catch (e) {
    // ignore
  }
}

// ---- Event-active cache (written by event-points.js) ----

function isEventActive() {
  try {
    return !!JSON.parse(localStorage.getItem('jsq-event-cache') || '{}').active;
  } catch (e) {
    return false;
  }
}

function getCachedEventStartAt() {
  try {
    return JSON.parse(localStorage.getItem('jsq-event-cache') || '{}').startAt || 0;
  } catch (e) {
    return 0;
  }
}

// ---- Refresh token: 1 available at a time, granted fresh every 12h ----

function getRefreshLimiterState() {
  let raw = null;
  try {
    raw = JSON.parse(localStorage.getItem(REFRESH_LIMIT_KEY) || 'null');
  } catch (e) {
    raw = null;
  }
  if (!raw || typeof raw.windowStart !== 'number' || typeof raw.used !== 'number' || Date.now() - raw.windowStart >= REFRESH_WINDOW_MS) {
    raw = { windowStart: Date.now(), used: 0 };
    try {
      localStorage.setItem(REFRESH_LIMIT_KEY, JSON.stringify(raw));
    } catch (e) {
      // ignore
    }
  }
  return raw;
}

function canRefreshBounty() {
  return getRefreshLimiterState().used < 1;
}

function useRefreshToken() {
  const raw = getRefreshLimiterState();
  raw.used = 1;
  try {
    localStorage.setItem(REFRESH_LIMIT_KEY, JSON.stringify(raw));
  } catch (e) {
    // ignore
  }
}

function msUntilNextRefreshToken() {
  return Math.max(0, getRefreshLimiterState().windowStart + REFRESH_WINDOW_MS - Date.now());
}

// ---- Weighted sampling ----

function weightedPickBounties(count, excludeIds) {
  const available = BOUNTIES.filter((b) => !excludeIds.includes(b.id));
  const picks = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const totalWeight = available.reduce((sum, b) => sum + b.weight, 0);
    let r = Math.random() * totalWeight;
    let idx = 0;
    for (; idx < available.length - 1; idx++) {
      r -= available[idx].weight;
      if (r <= 0) break;
    }
    picks.push(available[idx]);
    available.splice(idx, 1);
  }
  return picks;
}

function createSlot(def) {
  return {
    bountyId: def.id,
    assignedAt: Date.now(),
    snapshot: def.kind === 'count' ? def.statKey() : 0,
    completed: false,
    completedAt: null,
    emptyUntil: null,
  };
}

function initialSlots() {
  return weightedPickBounties(SLOT_COUNT, []).map(createSlot);
}

// ---- Bounty state (per active event, keyed by its startAt) ----

function readRawBountyState() {
  try {
    return JSON.parse(localStorage.getItem(BOUNTY_STATE_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function writeBountyState(state) {
  try {
    localStorage.setItem(BOUNTY_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    // ignore
  }
}

function getBountyState(eventStartAt) {
  let state = readRawBountyState();
  if (!state || state.eventStartAt !== eventStartAt || !Array.isArray(state.slots) || state.slots.length !== SLOT_COUNT) {
    state = { eventStartAt, slots: initialSlots() };
    writeBountyState(state);
  }
  return state;
}

function bountyDef(id) {
  return BOUNTIES.find((b) => b.id === id) || null;
}

// ---- Core progress/completion check, called from every action hook and a
// periodic tick (for count/threshold bounties, which have no single
// triggering moment) ----

function checkAndUpdateBounties(eventType, payload) {
  if (!isEventActive()) {
    renderBounties();
    return;
  }
  const startAt = getCachedEventStartAt();
  const state = getBountyState(startAt);
  let changed = false;

  state.slots.forEach((slot, i) => {
    if (slot.emptyUntil && Date.now() >= slot.emptyUntil) {
      const excludeIds = state.slots.filter((s, j) => j !== i && s.bountyId).map((s) => s.bountyId);
      const [fresh] = weightedPickBounties(1, excludeIds);
      if (fresh) {
        state.slots[i] = createSlot(fresh);
        changed = true;
      }
    }
  });

  state.slots.forEach((slot) => {
    if (!slot.bountyId || slot.completed) return;
    const def = bountyDef(slot.bountyId);
    if (!def) return;
    let done = false;
    if (def.kind === 'event') {
      done = eventType === def.trigger && (!def.predicate || def.predicate(payload || {}));
    } else if (def.kind === 'threshold') {
      done = def.statKey() >= def.threshold;
    } else if (def.kind === 'count') {
      done = def.statKey() - slot.snapshot >= def.threshold;
    }
    if (done) {
      slot.completed = true;
      slot.completedAt = Date.now();
      slot.emptyUntil = Date.now() + SLOT_REFILL_MS;
      changed = true;
      if (typeof window.jsqContributeEventPoints === 'function') {
        window.jsqContributeEventPoints(BOUNTY_TIERS[def.tier].points);
      }
      if (typeof playSound === 'function') playSound('conquered', { volume: 0.5 });
    }
  });

  if (changed) writeBountyState(state);
  renderBounties();
}
window.jsqCheckBounties = checkAndUpdateBounties;

function refreshBountySlot(index) {
  if (!canRefreshBounty()) return;
  const startAt = getCachedEventStartAt();
  const state = getBountyState(startAt);
  if (!state.slots[index] || state.slots[index].completed) return;
  const excludeIds = state.slots.filter((s, j) => j !== index && s.bountyId).map((s) => s.bountyId);
  const [fresh] = weightedPickBounties(1, excludeIds);
  if (!fresh) return;
  state.slots[index] = createSlot(fresh);
  writeBountyState(state);
  useRefreshToken();
  if (typeof playSound === 'function') playSound('click', { volume: 0.4 });
  renderBounties();
}

// ---- Rendering (only where the panel container exists — the Event page) ----

function renderBountyProgress(def, slot) {
  if (def.kind === 'count') {
    const raw = def.statKey() - slot.snapshot;
    const shown = def.threshold >= 3600000 ? formatShortDuration(Math.min(raw, def.threshold)) + ' / ' + formatShortDuration(def.threshold) : `${Math.max(0, Math.min(raw, def.threshold))} / ${def.threshold}`;
    return `<span class="bounty-progress">${shown}</span>`;
  }
  if (def.kind === 'threshold') {
    const current = def.statKey();
    return `<span class="bounty-progress">${Math.min(current, def.threshold)} / ${def.threshold}</span>`;
  }
  return `<span class="bounty-progress">In progress…</span>`;
}

function renderBountyCard(slot, index, refreshAvailable) {
  const def = bountyDef(slot.bountyId);
  if (!def) return '';
  const tier = BOUNTY_TIERS[def.tier];
  if (slot.completed) {
    const msLeft = Math.max(0, (slot.emptyUntil || 0) - Date.now());
    return `
      <div class="bounty-card completed" style="border-left-color:${tier.color}">
        <span class="bounty-tier" style="color:${tier.color}">${tier.label} · +${tier.points}</span>
        <span class="bounty-desc">${escapeHtml(def.description)}</span>
        <span class="bounty-status">✅ Completed — new bounty in ${formatShortDuration(msLeft)}</span>
      </div>`;
  }
  return `
    <div class="bounty-card" style="border-left-color:${tier.color}">
      <span class="bounty-tier" style="color:${tier.color}">${tier.label} · +${tier.points}</span>
      <span class="bounty-desc">${escapeHtml(def.description)}</span>
      ${renderBountyProgress(def, slot)}
      ${refreshAvailable ? `<button class="bounty-refresh-button" data-index="${index}" title="Swap for a new bounty">🔄 Refresh</button>` : ''}
    </div>`;
}

function renderBounties() {
  const panel = document.getElementById('crusade-bounties-panel');
  if (!panel) return;
  if (!isEventActive()) {
    panel.innerHTML = '';
    return;
  }
  const startAt = getCachedEventStartAt();
  const state = getBountyState(startAt);
  const refreshAvailable = canRefreshBounty();
  const refreshStatusText = refreshAvailable
    ? '🔄 1 bounty refresh available'
    : `🔄 Next refresh in ${formatShortDuration(msUntilNextRefreshToken())}`;

  panel.innerHTML = `
    <div class="crusade-bounties-block">
      <h3 class="crusade-bounties-title">🎯 Bounties</h3>
      <p class="crusade-bounties-refresh-status">${refreshStatusText}</p>
      <div class="crusade-bounties-grid">
        ${state.slots.map((slot, i) => renderBountyCard(slot, i, refreshAvailable)).join('')}
      </div>
    </div>`;

  panel.querySelectorAll('.bounty-refresh-button').forEach((btn) => {
    btn.addEventListener('click', () => refreshBountySlot(parseInt(btn.dataset.index, 10)));
  });
}

// ---- Wiring ----

setInterval(() => {
  if (document.visibilityState === 'visible') {
    addTimeOnSite(TIME_TICK_MS);
  }
  checkAndUpdateBounties('tick', {});
}, TIME_TICK_MS);

document.addEventListener('jsq-cloud-ready', () => checkAndUpdateBounties('tick', {}));
document.addEventListener('jsq-event-config-changed', () => checkAndUpdateBounties('tick', {}));
checkAndUpdateBounties('tick', {});
