// Dev Tools panel inside Settings — visible only to the admin account.
// Gating here (hiding/showing the section) is a UI convenience only; the
// real enforcement is server-side, in the Firestore security rules that
// restrict writes to gifts/globalMessages/bans to this exact signed-in
// email address.
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const ADMIN_EMAIL = "officecolorstyle@yahoo.com";

// The live community Event runs for exactly 5 days 4 hours once launched.
const EVENT_DURATION_MS = (5 * 24 + 4) * 60 * 60 * 1000;

function isAdmin() {
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  return !!user && user.email === ADMIN_EMAIL;
}

const devToolsSection = document.getElementById("dev-tools-section");
const settingsButton = document.getElementById("settings-button");

if (settingsButton && devToolsSection) {
  settingsButton.addEventListener("click", () => {
    devToolsSection.hidden = !isAdmin();
  });
}

// ---- Unlimited coins / spins toggles (affect only this admin's own browser) ----

const unlimitedCoinsToggle = document.getElementById("dev-unlimited-coins");
const unlimitedSpinsToggle = document.getElementById("dev-unlimited-spins");

if (unlimitedCoinsToggle) {
  unlimitedCoinsToggle.checked = localStorage.getItem("jsq-dev-unlimited-coins") === "1";
  unlimitedCoinsToggle.addEventListener("change", () => {
    localStorage.setItem("jsq-dev-unlimited-coins", unlimitedCoinsToggle.checked ? "1" : "0");
    if (typeof window.refreshCrossPointsDisplay === "function") window.refreshCrossPointsDisplay();
  });
}

if (unlimitedSpinsToggle) {
  unlimitedSpinsToggle.checked = localStorage.getItem("jsq-dev-unlimited-spins") === "1";
  unlimitedSpinsToggle.addEventListener("change", () => {
    localStorage.setItem("jsq-dev-unlimited-spins", unlimitedSpinsToggle.checked ? "1" : "0");
    if (typeof window.refreshSpinStatus === "function") window.refreshSpinStatus();
  });
}

// ---- Send gift (global, or targeted by event username) ----

const giftForm = document.getElementById("dev-gift-form");
const giftTarget = document.getElementById("dev-gift-target");
const giftMessage = document.getElementById("dev-gift-message");
const giftCoins = document.getElementById("dev-gift-coins");
const giftSpins = document.getElementById("dev-gift-spins");
const giftSkinList = document.getElementById("dev-gift-skins");
const giftStatus = document.getElementById("dev-gift-status");

if (giftSkinList && Array.isArray(window.COSMETICS)) {
  giftSkinList.innerHTML = window.COSMETICS.map(
    (c) => `
      <label class="dev-skin-option">
        <input type="checkbox" name="skin" value="${c.id}">
        <span class="dev-skin-name">${c.name}</span>
        ${c.hidden ? '<span class="dev-skin-secret">secret</span>' : ""}
      </label>`
  ).join("");
}

if (giftForm) {
  giftForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    giftStatus.textContent = "Sending…";
    const targetRaw = giftTarget.value.trim();
    try {
      let toUid = null;
      if (targetRaw && targetRaw.toLowerCase() !== "global") {
        const snap = await getDoc(doc(window.firebaseDb, "usernames", targetRaw.toLowerCase()));
        if (!snap.exists()) {
          giftStatus.textContent = `No player found with username "${targetRaw}".`;
          return;
        }
        toUid = snap.data().uid;
      }
      const skinIds = giftSkinList
        ? Array.from(giftSkinList.querySelectorAll('input[name="skin"]:checked')).map((el) => el.value)
        : [];
      await addDoc(collection(window.firebaseDb, "gifts"), {
        toUid,
        toUsername: toUid ? targetRaw : null,
        message: giftMessage.value.trim(),
        coins: parseInt(giftCoins.value, 10) || 0,
        spins: parseInt(giftSpins.value, 10) || 0,
        skins: skinIds,
        createdAt: serverTimestamp(),
      });
      giftStatus.textContent = toUid ? `Gift sent to ${targetRaw}.` : "Gift sent to everyone's inbox.";
      giftForm.reset();
    } catch (err) {
      console.error(err);
      giftStatus.textContent = "Failed to send gift.";
    }
  });
}

// ---- Ban player by event username ----

const banForm = document.getElementById("dev-ban-form");
const banInput = document.getElementById("dev-ban-username");
const banStatus = document.getElementById("dev-ban-status");
const unbanButton = document.getElementById("dev-unban-button");

if (banForm) {
  banForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = banInput.value.trim();
    if (!username) return;
    banStatus.textContent = "Banning…";
    try {
      await setDoc(doc(window.firebaseDb, "bans", username.toLowerCase()), {
        username,
        bannedAt: serverTimestamp(),
      });
      banStatus.textContent = `"${username}" is now banned.`;
      banForm.reset();
    } catch (err) {
      console.error(err);
      banStatus.textContent = "Failed to ban player.";
    }
  });
}

if (unbanButton) {
  unbanButton.addEventListener("click", async () => {
    const username = banInput.value.trim();
    if (!username) return;
    banStatus.textContent = "Unbanning…";
    try {
      await deleteDoc(doc(window.firebaseDb, "bans", username.toLowerCase()));
      banStatus.textContent = `"${username}" is unbanned.`;
      banForm.reset();
    } catch (err) {
      console.error(err);
      banStatus.textContent = "Failed to unban player.";
    }
  });
}

// ---- Global message (broadcast to every inbox) ----

const messageForm = document.getElementById("dev-message-form");
const messageInput = document.getElementById("dev-message-text");
const messageStatus = document.getElementById("dev-message-status");

if (messageForm) {
  messageForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text) return;
    messageStatus.textContent = "Sending…";
    try {
      await addDoc(collection(window.firebaseDb, "globalMessages"), {
        text,
        sentAt: serverTimestamp(),
      });
      messageStatus.textContent = "Message sent to everyone's inbox.";
      messageForm.reset();
    } catch (err) {
      console.error(err);
      messageStatus.textContent = "Failed to send message.";
    }
  });
}

// ---- Event: post today's riddle (first post launches the countdown) ----

const eventRiddleForm = document.getElementById("dev-event-riddle-form");
const eventRiddleInput = document.getElementById("dev-event-riddle-input");
const eventRiddleStatus = document.getElementById("dev-event-riddle-status");
const eventEndButton = document.getElementById("dev-event-end-button");

if (eventRiddleForm) {
  eventRiddleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = eventRiddleInput.value.trim();
    if (!text) return;
    eventRiddleStatus.textContent = "Posting…";
    try {
      const ref = doc(window.firebaseDb, "event", "config");
      const snap = await getDoc(ref);
      const now = Date.now();
      // Only set on first-ever post — this is what actually launches the
      // event and starts its 5d4h countdown. Later riddle posts just
      // update the riddle text and leave the running countdown alone.
      const base = snap.exists()
        ? {}
        : {
            startAt: now,
            endAt: now + EVENT_DURATION_MS,
            active: true,
            goalPoints: 10000,
            communityPoints: 0,
            rewardIssued: false,
            rewardCoins: 1,
          };
      await setDoc(
        ref,
        { ...base, todaysRiddle: text, riddleUpdatedAt: serverTimestamp() },
        { merge: true }
      );
      eventRiddleStatus.textContent = snap.exists()
        ? "Riddle updated."
        : "Event launched! Countdown started.";
      eventRiddleForm.reset();
      document.dispatchEvent(new CustomEvent("jsq-event-config-changed"));
    } catch (err) {
      console.error(err);
      eventRiddleStatus.textContent = "Failed to post riddle.";
    }
  });
}

if (eventEndButton) {
  eventEndButton.addEventListener("click", async () => {
    eventRiddleStatus.textContent = "Ending…";
    try {
      await setDoc(doc(window.firebaseDb, "event", "config"), { active: false }, { merge: true });
      eventRiddleStatus.textContent = "Event ended.";
      document.dispatchEvent(new CustomEvent("jsq-event-config-changed"));
    } catch (err) {
      console.error(err);
      eventRiddleStatus.textContent = "Failed to end event.";
    }
  });
}
