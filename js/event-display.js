// Renders the live Event page: name, countdown, today's riddle, the shared
// community progress bar, a per-player contribution leaderboard, and an
// event-info card. Config lives in Firestore (event/config) so all of this
// stays in sync across every player's device.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const NO_EVENT_HTML =
  '<p class="event-status-message">There\'s no event running right now. You\'ll get a notification in your mailbox when there\'s an event scheduled.</p>';

const liveArea = document.getElementById("event-live-area");
let cachedConfig = null;
let tickTimer = null;
let pollTimer = null;

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function formatDuration(ms) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function skinName(id) {
  const c = Array.isArray(window.COSMETICS) ? window.COSMETICS.find((c) => c.id === id) : null;
  return c ? c.name : id;
}

function renderLeaderboard(contributors) {
  const rows = Object.values(contributors || {})
    .filter((c) => c && c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 15);
  if (rows.length === 0) {
    return '<p class="event-leaderboard-empty">No contributions yet — be the first!</p>';
  }
  return `
    <ol class="event-leaderboard-list">
      ${rows
        .map(
          (r, i) => `
        <li class="event-leaderboard-row">
          <span class="event-leaderboard-rank">#${i + 1}</span>
          <span class="event-leaderboard-name">${escapeHtml(r.username || "Anonymous")}</span>
          <span class="event-leaderboard-points">${(r.points || 0).toLocaleString()} pts</span>
        </li>`
        )
        .join("")}
    </ol>`;
}

function renderInfoCard(config) {
  const rewardParts = [];
  if (config.rewardCoins) rewardParts.push(`${config.rewardCoins} coins`);
  if (Array.isArray(config.rewardSkins) && config.rewardSkins.length) {
    rewardParts.push(`${config.rewardSkins.map(skinName).join(", ")} skin`);
  }
  return `
    <div class="event-info-card">
      <div class="event-info-name">${escapeHtml(config.eventName || "Event")}</div>
      ${config.eventDescription ? `<p class="event-info-description">${escapeHtml(config.eventDescription)}</p>` : ""}
      ${rewardParts.length ? `<p class="event-info-reward">🏆 Reward: ${rewardParts.join(" + ")}</p>` : ""}
    </div>`;
}

function renderPointsInfoBar() {
  if (typeof window.jsqEventPointsInfo !== "function") return "";
  const info = window.jsqEventPointsInfo();
  const rarityRows = info.newQuestByRarity
    .map((r) => `<li><span>${escapeHtml(r.name)}</span><span>+${r.points}</span></li>`)
    .join("");
  return `
    <div class="event-points-info-block">
      <h3 class="event-points-info-title">✨ How to Earn Points</h3>
      <span class="event-points-info-group-label">New quest logged, by rarity</span>
      <ul class="event-points-info-list">${rarityRows}</ul>
      <ul class="event-points-info-list">
        <li><span>Quest completed</span><span>+${info.questCompleted}</span></li>
        <li><span>Lie slain</span><span>+${info.lieSlain}</span></li>
        <li><span>Riddle solved</span><span>+${info.riddleSolved}</span></li>
      </ul>
    </div>`;
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
        ${renderInfoCard(cachedConfig)}
        <div class="event-countdown-block">
          <span class="event-countdown-label">${escapeHtml(cachedConfig.eventName || "Event")} starts in</span>
          <span class="event-countdown-value">${formatDuration(startAt - now)}</span>
        </div>
      </div>`;
    return;
  }

  const ended = now > endAt;

  const topBlockHtml = rewardIssued
    ? '<p class="event-goal-banner">🎉 Goal reached — thank you for questing together! Check your inbox for a reward.</p>'
    : ended
    ? `<p class="event-status-message">This event has ended. Final score: ${points.toLocaleString()} / ${goal.toLocaleString()}.</p>`
    : `<div class="event-countdown-block">
        <span class="event-countdown-label">${escapeHtml(cachedConfig.eventName || "Event")} ends in</span>
        <span class="event-countdown-value">${formatDuration(endAt - now)}</span>
      </div>`;

  const inboxHintHtml = !ended
    ? '<p class="event-inbox-hint">📬 Check your inbox for today\'s riddle!</p>'
    : "";

  liveArea.innerHTML = `
    <div class="event-live">
      ${renderInfoCard(cachedConfig)}
      ${topBlockHtml}
      ${inboxHintHtml}
      <div class="event-progress-block">
        <div class="event-progress-label"><span>Community Goal</span><span>${points.toLocaleString()} / ${goal.toLocaleString()}</span></div>
        <div class="event-progress-bar"><div class="event-progress-fill" style="width:${pct}%"></div></div>
      </div>
      ${renderPointsInfoBar()}
      <div class="event-leaderboard-block">
        <h3 class="event-leaderboard-title">🏆 Top Lightbearers</h3>
        ${renderLeaderboard(cachedConfig.contributors)}
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
