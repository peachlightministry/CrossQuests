// Feeds completed/logged quests into the shared community Event goal.
// Runs as a Firestore transaction so concurrent players racing to cross the
// 10,000-point goal can't double-count or double-issue the reward — exactly
// one transaction ever flips rewardIssued from false to true.
import { doc, runTransaction } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

window.jsqContributeEventPoints = async function (amount) {
  if (!amount || amount <= 0) return;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  const db = window.firebaseDb;
  if (!user || !db) return;
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
      tx.update(ref, update);
    });
  } catch (err) {
    console.error("Event point contribution failed:", err);
  }
};
