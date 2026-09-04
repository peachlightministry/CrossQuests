// Feeds player activity into the current Event's leaderboard, and — once
// the event's time is up — finalizes exactly one winner (the #1 ranked
// player) via a Firestore transaction, same "exactly once, race-safe
// across every client" pattern as the community-goal event this replaced.
import { doc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Point sources for The Crusade. Also the single source of truth for the
// "how to earn points" info popover on the Event page.
const DAILY_LOGIN_POINTS = 10;
const ACHIEVEMENT_CLAIM_POINTS = 30;
const LIE_SLAIN_POINTS = 10;
const QUEST_LOGGED_POINTS = 5;
const COIN_SPENT_POINTS_RATIO = 1;

window.jsqEventPointsInfo = function () {
  return {
    dailyLogin: DAILY_LOGIN_POINTS,
    achievementClaim: ACHIEVEMENT_CLAIM_POINTS,
    lieSlain: LIE_SLAIN_POINTS,
    questLogged: QUEST_LOGGED_POINTS,
    coinSpentRatio: COIN_SPENT_POINTS_RATIO,
  };
};

window.jsqContributeEventPoints = async function (amount) {
  if (!amount || amount <= 0) return;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  const db = window.firebaseDb;
  if (!user || !db) return;
  let eventUsername = "";
  try {
    eventUsername = localStorage.getItem("jsq-event-username") || "";
  } catch (e) {
    // ignore
  }
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "event", "config");
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (!data.active) return;
      const endAt = typeof data.endAt === "number" ? data.endAt : 0;
      if (Date.now() > endAt) return;

      const equippedTitleId = typeof window.jsqGetEquippedTitle === "function" ? window.jsqGetEquippedTitle() : null;
      const contributors = { ...(data.contributors || {}) };
      const existing = contributors[user.uid] || { points: 0 };
      contributors[user.uid] = {
        points: (existing.points || 0) + amount,
        username: eventUsername || existing.username || "Anonymous",
        titleId: equippedTitleId || null,
      };

      tx.update(ref, { contributors });
    });
  } catch (err) {
    console.error("Event point contribution failed:", err);
  }
};

// Called periodically once the event's end time has passed: races safely
// against every other client to flip rewardIssued exactly once, crowning
// whoever currently has the most points as the winner.
async function maybeFinalizeWinner(cachedData) {
  if (!cachedData || cachedData.rewardIssued) return;
  // Over either because its 7 days ran out, or an admin ended it early.
  const isOver = !cachedData.active || Date.now() > (cachedData.endAt || 0);
  if (!isOver) return;
  const db = window.firebaseDb;
  if (!db) return;
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "event", "config");
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.rewardIssued) return;
      if (data.active && Date.now() <= (data.endAt || 0)) return;
      const ranked = Object.entries(data.contributors || {})
        .filter(([, c]) => c && c.points > 0)
        .sort((a, b) => b[1].points - a[1].points);
      const update = { rewardIssued: true };
      if (ranked.length > 0) {
        update.winnerUid = ranked[0][0];
        update.winnerUsername = ranked[0][1].username || "Anonymous";
      }
      tx.update(ref, update);
    });
  } catch (err) {
    console.error("Winner finalization failed:", err);
  }
}

// Push notifications, each fired at most once per event (deduped via a
// localStorage flag keyed by the event's startAt) for players who've
// granted notification permission.
const ENDING_SOON_THRESHOLD_MS = 24 * 60 * 60 * 1000;

function notifyOnce(flagKey, body) {
  try {
    if (localStorage.getItem(flagKey) === "1") return;
    localStorage.setItem(flagKey, "1");
  } catch (e) {
    return;
  }
  if (typeof window.jsqFireNotification === "function") window.jsqFireNotification(body);
}

function maybeNotifyEventLifecycle(data) {
  const startAt = data.startAt || 0;
  if (data.active) {
    notifyOnce(`jsq-notified-launch-${startAt}`, `${data.eventName || "A new event"} has started! Go check it out. ⚔️`);
    const msLeft = (data.endAt || 0) - Date.now();
    if (msLeft > 0 && msLeft <= ENDING_SOON_THRESHOLD_MS) {
      notifyOnce(`jsq-notified-ending-${startAt}`, `${data.eventName || "The event"} ends soon — last chance to climb the leaderboard! ⏳`);
    }
  }
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (data.rewardIssued && user && data.winnerUid === user.uid) {
    notifyOnce(`jsq-notified-won-${startAt}`, `You won ${data.eventName || "the event"}! Check your inbox for your reward. 🏆`);
  }
}

// Plain classic scripts (achievements.js, shop.js, crusade-bounties.js)
// can't read Firestore directly, so this module — loaded on every page —
// periodically caches the bits of event state they need into localStorage:
// whether an event is currently active (for the Shop's Event-tab alert),
// this player's current rank (for the leaderboard UI), and whether they
// are the finalized winner (for the "Race Marked Out" achievement).
async function refreshEventCache() {
  const db = window.firebaseDb;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!db) return;
  try {
    const snap = await getDoc(doc(db, "event", "config"));
    if (!snap.exists()) {
      localStorage.setItem("jsq-event-cache", JSON.stringify({ active: false, inTop10: false }));
      return;
    }
    const data = snap.data();
    const timeExpired = Date.now() > (data.endAt || 0);
    const active = !!data.active && !timeExpired;

    maybeNotifyEventLifecycle(data);

    if (!data.rewardIssued && (!data.active || timeExpired)) {
      await maybeFinalizeWinner(data);
    }

    let inTop10 = false;
    if ((!data.active || timeExpired) && user && data.contributors) {
      const topUids = Object.entries(data.contributors)
        .filter(([, c]) => c && c.points > 0)
        .sort((a, b) => b[1].points - a[1].points)
        .slice(0, 10)
        .map(([uid]) => uid);
      inTop10 = topUids.includes(user.uid);
    }
    localStorage.setItem("jsq-event-cache", JSON.stringify({ active, inTop10, startAt: data.startAt || 0 }));
  } catch (err) {
    console.error("Event cache refresh failed:", err);
  }
}

document.addEventListener("jsq-auth-changed", (e) => {
  if (e.detail.user) refreshEventCache();
});
document.addEventListener("jsq-event-config-changed", () => {
  refreshEventCache();
});
if (window.jsqFirebaseAuthSettled && window.jsqFirebaseCurrentUser) {
  refreshEventCache();
}
setInterval(refreshEventCache, 30000);
