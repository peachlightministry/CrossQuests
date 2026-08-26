// Feeds quest/belief activity into the shared community Event goal, and
// tracks each signed-in player's own running contribution for the
// leaderboard. Runs as a Firestore transaction so concurrent players racing
// to cross the 10,000-point goal can't double-count or double-issue the
// reward — exactly one transaction ever flips rewardIssued from false to true.
import { doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

// Points awarded for a brand-new quest log entry (a fresh spin result),
// keyed by rarity id. Mustard Seed is the base, +10 per ascending rarity,
// with a bigger jump for the rarest ordinary tier and the secret tier.
const RARITY_EVENT_POINTS = {
  "mustard-seed": 25,
  "loaves-and-fishes": 35,
  "widows-mite": 45,
  "wilderness-wanderer": 55,
  "refiners-fire": 125,
  "burning-bush": 500,
};

window.jsqEventPointsForRarity = function (rarityId) {
  return RARITY_EVENT_POINTS[rarityId] || 0;
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

      const contributors = { ...(data.contributors || {}) };
      const existing = contributors[user.uid] || { points: 0 };
      contributors[user.uid] = {
        points: (existing.points || 0) + amount,
        username: eventUsername || existing.username || "Anonymous",
      };
      update.contributors = contributors;

      tx.update(ref, update);
    });
  } catch (err) {
    console.error("Event point contribution failed:", err);
  }
};
