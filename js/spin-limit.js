// Generic per-feature spin rate limiter backed by localStorage.
function createSpinLimiter({ storageKey, maxSpins, windowMs }) {
  function readState() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { remaining: maxSpins, resetAt: null };
      const parsed = JSON.parse(raw);
      if (typeof parsed.remaining !== 'number') return { remaining: maxSpins, resetAt: null };
      return parsed;
    } catch (e) {
      return { remaining: maxSpins, resetAt: null };
    }
  }

  function writeState(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // storage unavailable — limiter just won't persist across reloads
    }
  }

  function getState() {
    let state = readState();
    if (state.resetAt && Date.now() >= state.resetAt) {
      state = { remaining: maxSpins, resetAt: null };
      writeState(state);
    }
    return state;
  }

  function canSpin() {
    return getState().remaining > 0;
  }

  function useSpin() {
    const state = getState();
    if (state.remaining <= 0) return state;
    state.remaining -= 1;
    if (state.remaining <= 0) {
      state.resetAt = Date.now() + windowMs;
    }
    writeState(state);
    return state;
  }

  function msUntilReset() {
    const state = getState();
    if (!state.resetAt) return 0;
    return Math.max(0, state.resetAt - Date.now());
  }

  return { getState, canSpin, useSpin, msUntilReset };
}

// TEMPORARY testing helper — grants 1 extra spin to both limiters at once. Remove later.
function grantTestSpin() {
  for (const [key, max] of [['jsq-quest-spin-limit', 2], ['jsq-belief-spin-limit', 1]]) {
    try {
      const state = JSON.parse(localStorage.getItem(key) || 'null') || { remaining: max, resetAt: null };
      state.remaining = Math.min(max, (state.remaining || 0) + 1);
      state.resetAt = null;
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}
