// Renders the live Event page: countdown, today's riddle, and the shared
// community progress bar toward the point goal. Config lives in Firestore
// (event/config) so the countdown and progress stay in sync across every
// player's device.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const NO_EVENT_HTML =
  '<p class="event-status-message">There\'s no event running right now. You\'ll get a notification in your mailbox when there\'s an event scheduled.</p>';

const liveArea = document.getElementById("event-live-area");
let cachedConfig = null;
let tickTimer = null;
let pollTimer = null;

function formatDuration(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function render() {
  if (!liveArea) return;

  if (!cachedConfig || !cachedConfig.active) {
    liveArea.innerHTML = NO_EVENT_HTML;
    return;
  }

  const now = Date.now();
  const startAt = cachedConfig.startAt || 0;
  const endAt = cachedConfig.endAt || 0;
  const goal = cachedConfig.goalPoints || 10000;
  const points = Math.min(goal, cachedConfig.communityPoints || 0);
  const pct = goal > 0 ? Math.min(100, Math.round((points / goal) * 100)) : 0;
  const rewardIssued = !!cachedConfig.rewardIssued;

  if (now < startAt) {
    liveArea.innerHTML = `
      <div class="event-live">
        <div class="event-countdown-block">
          <span class="event-countdown-label">Event starts in</span>
          <span class="event-countdown-value">${formatDuration(startAt - now)}</span>
        </div>
      </div>`;
    return;
  }

  const ended = now > endAt;
  const dayIndex = Math.min(5, Math.max(1, Math.floor((now - startAt) / 86400000) + 1));

  const topBlockHtml = rewardIssued
    ? '<p class="event-goal-banner">🎉 Goal reached — thank you for questing together! Check your inbox for a reward.</p>'
    : ended
    ? `<p class="event-status-message">This event has ended. Final score: ${points.toLocaleString()} / ${goal.toLocaleString()}.</p>`
    : `<div class="event-countdown-block">
        <span class="event-countdown-label">Event ends in</span>
        <span class="event-countdown-value">${formatDuration(endAt - now)}</span>
      </div>`;

  const riddleHtml =
    !ended && cachedConfig.todaysRiddle
      ? `<div class="event-riddle-block">
          <span class="event-riddle-day">Day ${dayIndex} of 5</span>
          <p class="event-riddle-text">🧩 ${cachedConfig.todaysRiddle}</p>
          <p class="event-riddle-hint">Solve it together in our Discord!</p>
        </div>`
      : "";

  liveArea.innerHTML = `
    <div class="event-live">
      ${topBlockHtml}
      ${riddleHtml}
      <div class="event-progress-block">
        <div class="event-progress-label"><span>Community Goal</span><span>${points.toLocaleString()} / ${goal.toLocaleString()}</span></div>
        <div class="event-progress-bar"><div class="event-progress-fill" style="width:${pct}%"></div></div>
      </div>
    </div>`;
}

async function refreshConfig() {
  try {
    const db = window.firebaseDb;
    if (!db) return;
    const snap = await getDoc(doc(db, "event", "config"));
    cachedConfig = snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error("Failed to load event config:", err);
  }
  render();
}

function startTimers() {
  if (tickTimer) clearInterval(tickTimer);
  if (pollTimer) clearInterval(pollTimer);
  tickTimer = setInterval(render, 1000);
  pollTimer = setInterval(refreshConfig, 20000);
}

document.addEventListener("jsq-auth-changed", (e) => {
  if (e.detail.user) {
    refreshConfig();
    startTimers();
  }
});
// Fired by admin-tools.js right after a riddle post or "End Event Now" —
// avoids waiting up to 20s for the next poll to reflect the admin's own edit.
document.addEventListener("jsq-event-config-changed", () => {
  refreshConfig();
});
if (window.jsqFirebaseAuthSettled && window.jsqFirebaseCurrentUser) {
  refreshConfig();
  startTimers();
}
