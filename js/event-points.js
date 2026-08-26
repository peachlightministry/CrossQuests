// Feeds quest/belief activity into the shared community Event goal, and
// tracks each signed-in player's own running contribution for the
// leaderboard. Runs as a Firestore transaction so concurrent players racing
// to cross the 10,000-point goal can't double-count or double-issue the
// reward — exactly one transaction ever flips rewardIssued from false to true.
import { doc, getDoc, runTransaction } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Points awarded for a brand-new quest log entry (a fresh spin result),
// keyed by rarity id. Mustard Seed is the base, +10 per ascending rarity,
// with a bigger jump for the rarest ordinary tier and the secret tier.
// Also doubles as the single source of truth for the "how to earn points"
// info bar on the Event page — names here match RARITIES in quest-data.js.
const RARITY_EVENT_POINTS = [
  { id: "mustard-seed", name: "Mustard Seed", points: 25 },
  { id: "loaves-and-fishes", name: "Loaves & Fishes", points: 35 },
  { id: "widows-mite", name: "Widow's Mite", points: 45 },
  { id: "wilderness-wanderer", name: "Wilderness Wanderer", points: 55 },
  { id: "refiners-fire", name: "Refiner's Fire", points: 125 },
  { id: "burning-bush", name: "Burning Bush (secret)", points: 500 },
];

const QUEST_COMPLETE_EVENT_POINTS = 20;
const LIE_SLAIN_EVENT_POINTS = 20;
const RIDDLE_SOLVED_EVENT_POINTS = 55;

window.jsqEventPointsForRarity = function (rarityId) {
  const entry = RARITY_EVENT_POINTS.find((r) => r.id === rarityId);
  return entry ? entry.points : 0;
};

window.jsqEventPointsInfo = function () {
  return {
    newQuestByRarity: RARITY_EVENT_POINTS,
    questCompleted: QUEST_COMPLETE_EVENT_POINTS,
    lieSlain: LIE_SLAIN_EVENT_POINTS,
    riddleSolved: RIDDLE_SOLVED_EVENT_POINTS,
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
      const goal = data.goalPoints || 0;
      const current = data.communityPoints || 0;
      if (current >= goal) return;
      const next = Math.min(goal, current + amount);
      const update = { communityPoints: next };
      if (next >= goal && !data.rewardIssued) update.rewardIssued = true;

      const equippedTitleId = typeof window.jsqGetEquippedTitle === "function" ? window.jsqGetEquippedTitle() : null;
      const contributors = { ...(data.contributors || {}) };
      const existing = contributors[user.uid] || { points: 0 };
      contributors[user.uid] = {
        points: (existing.points || 0) + amount,
        username: eventUsername || existing.username || "Anonymous",
        titleId: equippedTitleId || null,
      };
      update.contributors = contributors;

      tx.update(ref, update);
    });
  } catch (err) {
    console.error("Event point contribution failed:", err);
  }
};

// Plain classic scripts (achievements.js, shop.js) can't read Firestore
// directly, so this module — loaded on every page — periodically caches the
// bits of event state they need into localStorage: whether an event is
// currently active (for the Shop's Event-tab alert) and whether the signed-
// in player is in the leaderboard's top 10 (for the Race Marked Out
// achievement).
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
    // The Race Marked Out achievement should reflect FINAL standings, not a
    // mid-event snapshot that could still change — only compute it once the
    // event has actually concluded (ended early by the admin, or timed out).
    const ended = !data.active || timeExpired;
    let inTop10 = false;
    if (ended && user && data.contributors) {
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
