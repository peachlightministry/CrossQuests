// Generic per-feature spin rate limiter backed by localStorage. Tracks a
// window start time and how many spins have been used inside that window,
// so the cap is always exactly maxSpins per windowMs — whether or not all
// of them get used. (An earlier version only started the reset countdown
// once every spin was used, so using just 1 of 2 spins and never touching
// the 2nd left you stuck at "1 remaining" forever instead of refreshing to
// a full 2 after 12h.)
function isUnlimitedSpins() {
  try {
    return localStorage.getItem('jsq-dev-unlimited-spins') === '1';
  } catch (e) {
    return false;
  }
}

function createSpinLimiter({ storageKey, maxSpins, windowMs }) {
  function readRaw() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (typeof parsed.windowStart !== 'number' || typeof parsed.used !== 'number') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeRaw(state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {
      // storage unavailable — limiter just won't persist across reloads
    }
  }

  function currentWindow() {
    const raw = readRaw();
    if (raw && Date.now() - raw.windowStart < windowMs) return raw;
    const fresh = { windowStart: Date.now(), used: 0 };
    writeRaw(fresh);
    return fresh;
  }

  function getState() {
    const raw = currentWindow();
    if (isUnlimitedSpins()) {
      return { remaining: 999, resetAt: raw.windowStart + windowMs };
    }
    return {
      remaining: Math.max(0, maxSpins - raw.used),
      resetAt: raw.windowStart + windowMs,
    };
  }

  function canSpin() {
    return getState().remaining > 0;
  }

  function useSpin() {
    const raw = currentWindow();
    if (raw.used < maxSpins) {
      raw.used += 1;
      writeRaw(raw);
    }
    return getState();
  }

  function msUntilReset() {
    return Math.max(0, getState().resetAt - Date.now());
  }

  return { getState, canSpin, useSpin, msUntilReset };
}

// Grants 1 extra spin to both limiters at once. Used by the Inbox when
// claiming a gifted spin.
function grantTestSpin() {
  for (const key of ['jsq-quest-spin-limit', 'jsq-belief-spin-limit']) {
    try {
      const raw = JSON.parse(localStorage.getItem(key) || 'null');
      const state = raw && typeof raw.used === 'number' ? raw : { windowStart: Date.now(), used: 0 };
      state.used = Math.max(0, state.used - 1);
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
