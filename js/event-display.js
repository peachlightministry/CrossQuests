// Renders the live Event page: name, countdown, an individual leaderboard
// (highest score wins), and an event-info card. Config lives in Firestore
// (event/config) so all of this stays in sync across every player's device.
// Bounties (a separate, purely local/per-player feature) are rendered by
// crusade-bounties.js into its own container on this same page.
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const NO_EVENT_HTML =
  '<p class="event-status-message">There\'s no event running right now. You\'ll get a notification in your mailbox when there\'s an event scheduled.</p>';

const liveArea = document.getElementById("event-live-area");
let cachedConfig = null;
let tickTimer = null;
let pollTimer = null;
let pointsPopoverOpen = false;

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

function currentUserRank(contributors) {
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!user) return null;
  const ranked = Object.entries(contributors || {})
    .filter(([, c]) => c && c.points > 0)
    .sort((a, b) => b[1].points - a[1].points);
  const idx = ranked.findIndex(([uid]) => uid === user.uid);
  return idx === -1 ? null : { rank: idx + 1, total: ranked.length, points: ranked[idx][1].points };
}

function renderLeaderboard(contributors) {
  const rows = Object.values(contributors || {})
    .filter((c) => c && c.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 15);
  if (rows.length === 0) {
    return '<p class="event-leaderboard-empty">No one has scored yet — be the first!</p>';
  }
  return `
    <ol class="event-leaderboard-list">
      ${rows
        .map((r, i) => {
          const title = r.titleId && window.jsqTitleInfo ? window.jsqTitleInfo(r.titleId) : null;
          const titleHtml = title
            ? `<span class="event-leaderboard-title" style="color:${title.color}">${escapeHtml(title.name)}</span>`
            : "";
          const rankLabel = i === 0 ? "👑" : `#${i + 1}`;
          return `
        <li class="event-leaderboard-row${i === 0 ? " champion" : ""}">
          <span class="event-leaderboard-rank">${rankLabel}</span>
          <span class="event-leaderboard-name">${escapeHtml(r.username || "Anonymous")}${titleHtml}</span>
          <span class="event-leaderboard-points">${(r.points || 0).toLocaleString()} pts</span>
        </li>`;
        })
        .join("")}
    </ol>`;
}

function renderInfoCard(config) {
  const rewardParts = [];
  if (Array.isArray(config.rewardSkins) && config.rewardSkins.length) {
    rewardParts.push(`${config.rewardSkins.map(skinName).join(", ")} skin`);
  }
  if (config.rewardCoins) rewardParts.push(`${config.rewardCoins} coins`);
  return `
    <div class="event-info-card">
      <div class="event-info-name-row">
        <span class="event-info-name">${escapeHtml(config.eventName || "Event")}</span>
        <button class="event-points-help-button" id="event-points-help-button" title="How to earn points" aria-label="How to earn points">?</button>
      </div>
      ${config.eventDescription ? `<p class="event-info-description">${escapeHtml(config.eventDescription)}</p>` : ""}
      ${rewardParts.length ? `<p class="event-info-reward">🏆 Reward (top of the leaderboard only): ${rewardParts.join(" + ")}</p>` : ""}
    </div>`;
}

function renderPointsPopover() {
  if (typeof window.jsqEventPointsInfo !== "function") return "";
  const info = window.jsqEventPointsInfo();
  return `
    <div class="event-points-popover-backdrop${pointsPopoverOpen ? " open" : ""}" id="event-points-popover-backdrop">
      <div class="event-points-popover">
        <button class="event-points-popover-close" id="event-points-popover-close" aria-label="Close">✕</button>
        <h3 class="event-points-popover-title">✨ How to Earn Points</h3>
        <ul class="event-points-info-list">
          <li><span>Daily log in</span><span>+${info.dailyLogin}</span></li>
          <li><span>Claim an achievement</span><span>+${info.achievementClaim}</span></li>
          <li><span>Slay a lie</span><span>+${info.lieSlain}</span></li>
          <li><span>Log a new side quest (any rarity)</span><span>+${info.questLogged}</span></li>
          <li><span>Complete a side quest</span><span>+its rarity's odds</span></li>
          <li><span>Spend coins in the Shop</span><span>+${info.coinSpentRatio} per coin</span></li>
        </ul>
        <p class="event-points-popover-note">A side quest's rarity odds ARE its completion points — e.g. a 1-in-30 quest is worth 30 points completed.</p>
      </div>
    </div>`;
}

function wirePointsPopover() {
  const helpButton = document.getElementById("event-points-help-button");
  const backdrop = document.getElementById("event-points-popover-backdrop");
  const closeButton = document.getElementById("event-points-popover-close");
  if (helpButton) {
    helpButton.addEventListener("click", () => {
      pointsPopoverOpen = true;
      render();
    });
  }
  if (closeButton) {
    closeButton.addEventListener("click", () => {
      pointsPopoverOpen = false;
      render();
    });
  }
  if (backdrop) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        pointsPopoverOpen = false;
        render();
      }
    });
  }
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
  const rewardIssued = !!cachedConfig.rewardIssued;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  const isWinner = rewardIssued && user && cachedConfig.winnerUid === user.uid;

  if (now < startAt) {
    liveArea.innerHTML = `
      <div class="event-live">
        ${renderInfoCard(cachedConfig)}
        <div class="event-countdown-block">
          <span class="event-countdown-label">${escapeHtml(cachedConfig.eventName || "Event")} starts in</span>
          <span class="event-countdown-value">${formatDuration(startAt - now)}</span>
        </div>
      </div>
      ${renderPointsPopover()}`;
    wirePointsPopover();
    return;
  }

  const ended = now > endAt;
  const rank = currentUserRank(cachedConfig.contributors);

  const topBlockHtml = isWinner
    ? '<p class="event-goal-banner">🏆 You won! Check your inbox for your reward, Champion.</p>'
    : ended
    ? `<p class="event-status-message">This event has ended.${
        cachedConfig.winnerUsername ? ` 👑 ${escapeHtml(cachedConfig.winnerUsername)} takes the crown!` : ""
      }</p>`
    : `<div class="event-countdown-block">
        <span class="event-countdown-label">${escapeHtml(cachedConfig.eventName || "Event")} ends in</span>
        <span class="event-countdown-value">${formatDuration(endAt - now)}</span>
      </div>`;

  const rankHtml =
    !ended && rank
      ? `<p class="event-rank-line">You're currently <strong>#${rank.rank}</strong> of ${rank.total} with <strong>${rank.points.toLocaleString()}</strong> points.</p>`
      : "";

  liveArea.innerHTML = `
    <div class="event-live">
      ${renderInfoCard(cachedConfig)}
      ${topBlockHtml}
      ${rankHtml}
      <div class="event-leaderboard-block">
        <h3 class="event-leaderboard-title">🏆 Leaderboard</h3>
        ${renderLeaderboard(cachedConfig.contributors)}
      </div>
    </div>
    ${renderPointsPopover()}`;
  wirePointsPopover();
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
// Fired by admin-tools.js right after launching/ending the event — avoids
// waiting up to 20s for the next poll to reflect the admin's own edit.
document.addEventListener("jsq-event-config-changed", () => {
  refreshConfig();
});
if (window.jsqFirebaseAuthSettled && window.jsqFirebaseCurrentUser) {
  refreshConfig();
  startTimers();
}
