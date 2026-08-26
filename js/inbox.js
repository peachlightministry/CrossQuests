// Inbox: shows global announcements and gifts (broadcast or personally
// targeted) sent from the admin's Dev Tools. Claim/read state is tracked in
// localStorage like everything else, so it's auto-mirrored to Firestore and
// follows the player across devices.
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const CLAIMED_GIFTS_KEY = "jsq-inbox-claimed-gifts";
const READ_MESSAGES_KEY = "jsq-inbox-read-messages";
const READ_RIDDLES_KEY = "jsq-inbox-read-riddles";

function getIdSet(key) {
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
  } catch (e) {
    return new Set();
  }
}

function addToIdSet(key, id) {
  const set = getIdSet(key);
  set.add(id);
  localStorage.setItem(key, JSON.stringify([...set]));
}

// The community Event's goal reward isn't a real gifts/ doc — every player's
// device independently derives the same synthetic, stable-ID item from
// event/config once rewardIssued flips true, so it just shows up in every
// inbox without needing a write permission a regular player doesn't have.
async function fetchEventReward() {
  const db = window.firebaseDb;
  try {
    const snap = await getDoc(doc(db, "event", "config"));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.rewardIssued) return null;
    return {
      id: `event-reward-${data.startAt || "evt"}`,
      coins: data.rewardCoins || 1,
      spins: 0,
      skins: Array.isArray(data.rewardSkins) ? data.rewardSkins : [],
      message: `🎉 The community reached the 10,000-point goal in ${data.eventName || "the Event"}!`,
      createdAt: { toMillis: () => data.startAt || Date.now() },
    };
  } catch (err) {
    console.error("Failed to load event reward:", err);
    return null;
  }
}

async function fetchGifts() {
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!user) return [];
  const db = window.firebaseDb;
  const results = [];
  try {
    const [mineSnap, globalSnap, eventReward] = await Promise.all([
      getDocs(query(collection(db, "gifts"), where("toUid", "==", user.uid))),
      getDocs(query(collection(db, "gifts"), where("toUid", "==", null))),
      fetchEventReward(),
    ]);
    mineSnap.forEach((d) => results.push({ id: d.id, ...d.data() }));
    globalSnap.forEach((d) => results.push({ id: d.id, ...d.data() }));
    if (eventReward) results.push(eventReward);
  } catch (err) {
    console.error("Failed to load gifts:", err);
  }
  return results;
}

// Today's riddle also shows up as its own inbox item (not just on the Event
// page) — reading it for the first time is what triggers the red "!" alert
// to clear, and also awards this player's one-time +55 contribution for it.
async function fetchEventRiddle() {
  const db = window.firebaseDb;
  try {
    const snap = await getDoc(doc(db, "event", "config"));
    if (!snap.exists()) return null;
    const data = snap.data();
    if (!data.active || !data.todaysRiddle) return null;
    const endAt = typeof data.endAt === "number" ? data.endAt : 0;
    if (Date.now() > endAt) return null;
    const stamp =
      data.riddleUpdatedAt && typeof data.riddleUpdatedAt.toMillis === "function"
        ? data.riddleUpdatedAt.toMillis()
        : data.startAt || 0;
    return {
      id: `event-riddle-${stamp}`,
      text: data.todaysRiddle,
      sentAt: data.riddleUpdatedAt || { toMillis: () => stamp },
    };
  } catch (err) {
    console.error("Failed to load event riddle:", err);
    return null;
  }
}

async function fetchMessages() {
  const db = window.firebaseDb;
  const results = [];
  try {
    const snap = await getDocs(collection(db, "globalMessages"));
    snap.forEach((d) => results.push({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Failed to load messages:", err);
  }
  return results;
}

function skinName(id) {
  const c = Array.isArray(window.COSMETICS) ? window.COSMETICS.find((c) => c.id === id) : null;
  return c ? c.name : id;
}

function claimGift(gift) {
  if (gift.coins && typeof window.addPoints === "function") window.addPoints(gift.coins);
  if (gift.spins && typeof window.grantTestSpin === "function") {
    for (let i = 0; i < gift.spins; i++) window.grantTestSpin();
  }
  if (Array.isArray(gift.skins) && typeof window.grantCosmetic === "function") {
    gift.skins.forEach((id) => window.grantCosmetic(id));
  }
  addToIdSet(CLAIMED_GIFTS_KEY, gift.id);
}

function sortByTimeDesc(a, b) {
  const at = a.sortKey && typeof a.sortKey.toMillis === "function" ? a.sortKey.toMillis() : 0;
  const bt = b.sortKey && typeof b.sortKey.toMillis === "function" ? b.sortKey.toMillis() : 0;
  return bt - at;
}

const inboxButton = document.getElementById("inbox-button");
const inboxBackdrop = document.getElementById("inbox-modal-backdrop");
const inboxClose = document.getElementById("inbox-modal-close");
const inboxList = document.getElementById("inbox-list");
const inboxBadge = document.getElementById("inbox-badge");
const inboxRiddleAlert = document.getElementById("inbox-riddle-alert");

async function renderInbox() {
  if (!inboxList) return;
  inboxList.innerHTML = '<p class="inbox-empty">Loading…</p>';
  const [gifts, messages, riddle] = await Promise.all([fetchGifts(), fetchMessages(), fetchEventRiddle()]);
  const claimed = getIdSet(CLAIMED_GIFTS_KEY);
  const read = getIdSet(READ_MESSAGES_KEY);
  const readRiddles = getIdSet(READ_RIDDLES_KEY);

  const items = [];
  if (riddle) {
    const isNew = !readRiddles.has(riddle.id);
    items.push({
      sortKey: riddle.sentAt,
      html: `
        <div class="inbox-item ${isNew ? "unclaimed" : "claimed"}">
          <div class="inbox-item-title">🧩 Daily Riddle</div>
          <div class="inbox-item-body">${riddle.text}</div>
        </div>`,
    });
    if (isNew) {
      addToIdSet(READ_RIDDLES_KEY, riddle.id);
      if (typeof window.jsqContributeEventPoints === "function") window.jsqContributeEventPoints(55);
    }
  }
  gifts.forEach((g) => {
    const parts = [];
    if (g.coins) parts.push(`${g.coins} coins`);
    if (g.spins) parts.push(`${g.spins} spin${g.spins > 1 ? "s" : ""}`);
    if (Array.isArray(g.skins) && g.skins.length) {
      parts.push(`${g.skins.map(skinName).join(", ")} skin${g.skins.length > 1 ? "s" : ""}`);
    }
    items.push({
      sortKey: g.createdAt,
      html: `
        <div class="inbox-item ${claimed.has(g.id) ? "claimed" : "unclaimed"}">
          <div class="inbox-item-title">🎁 Gift${parts.length ? ` — ${parts.join(", ")}` : ""}</div>
          ${g.message ? `<div class="inbox-item-body">${g.message}</div>` : ""}
          ${
            claimed.has(g.id)
              ? '<span class="inbox-item-status">Claimed</span>'
              : `<button class="inbox-claim-button" data-gift-id="${g.id}">Claim</button>`
          }
        </div>`,
    });
  });
  messages.forEach((m) => {
    items.push({
      sortKey: m.sentAt,
      html: `
        <div class="inbox-item ${read.has(m.id) ? "claimed" : "unclaimed"}">
          <div class="inbox-item-title">📣 Announcement</div>
          <div class="inbox-item-body">${m.text}</div>
        </div>`,
    });
  });

  if (items.length === 0) {
    inboxList.innerHTML = '<p class="inbox-empty">Your inbox is empty.</p>';
  } else {
    items.sort(sortByTimeDesc);
    inboxList.innerHTML = items.map((i) => i.html).join("");
  }

  messages.forEach((m) => addToIdSet(READ_MESSAGES_KEY, m.id));

  inboxList.querySelectorAll(".inbox-claim-button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gift = gifts.find((g) => g.id === btn.dataset.giftId);
      if (!gift) return;
      claimGift(gift);
      renderInbox();
      refreshInboxBadge();
    });
  });
}

async function refreshInboxBadge() {
  if (!inboxBadge && !inboxRiddleAlert) return;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!user) {
    if (inboxBadge) inboxBadge.hidden = true;
    if (inboxRiddleAlert) inboxRiddleAlert.hidden = true;
    return;
  }
  const [gifts, messages, riddle] = await Promise.all([fetchGifts(), fetchMessages(), fetchEventRiddle()]);
  const claimed = getIdSet(CLAIMED_GIFTS_KEY);
  const read = getIdSet(READ_MESSAGES_KEY);
  const readRiddles = getIdSet(READ_RIDDLES_KEY);
  if (inboxBadge) {
    const total = gifts.filter((g) => !claimed.has(g.id)).length + messages.filter((m) => !read.has(m.id)).length;
    inboxBadge.textContent = String(total);
    inboxBadge.hidden = total === 0;
  }
  if (inboxRiddleAlert) {
    inboxRiddleAlert.hidden = !riddle || readRiddles.has(riddle.id);
  }
}

if (inboxButton && inboxBackdrop && inboxClose) {
  inboxButton.addEventListener("click", () => {
    inboxBackdrop.classList.add("open");
    renderInbox().then(refreshInboxBadge);
  });
  inboxClose.addEventListener("click", () => inboxBackdrop.classList.remove("open"));
  inboxBackdrop.addEventListener("click", (e) => {
    if (e.target === inboxBackdrop) inboxBackdrop.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") inboxBackdrop.classList.remove("open");
  });
}

document.addEventListener("jsq-auth-changed", (e) => {
  if (e.detail.user) refreshInboxBadge();
});
document.addEventListener("jsq-event-config-changed", () => {
  refreshInboxBadge();
});
if (window.jsqFirebaseAuthSettled && window.jsqFirebaseCurrentUser) {
  refreshInboxBadge();
}
