// Gates every page behind Google sign-in and mirrors this site's data
// (everything that goes through localStorage) to Cloud Firestore, keyed by
// the signed-in user's uid. Every account starts fresh — no local progress
// is migrated in.
//
// Depends on js/firebase-init.js having already run (loaded first, as a
// module script, on every gated page).

import {
  doc,
  getDoc,
  setDoc,
  deleteField,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const SESSION_FLAG_PREFIX = "jsq-cloud-hydrated-";

const gate = document.getElementById("jsq-auth-gate");
const gateText = document.getElementById("jsq-auth-gate-text");
const gateButton = document.getElementById("jsq-auth-gate-button");
const gateError = document.getElementById("jsq-auth-gate-error");
const accountChip = document.getElementById("jsq-account-chip");
const accountEmail = document.getElementById("jsq-account-email");
const accountSignout = document.getElementById("jsq-account-signout");

let currentUid = null;
let mirrorInstalled = false;
const pendingWrites = {};
let flushTimer = null;

function showGate(text, showButton) {
  gate.hidden = false;
  gateText.textContent = text;
  gateButton.hidden = !showButton;
}

function hideGate() {
  gate.hidden = true;
  sessionStorage.setItem("jsq-cloud-session-active", "1");
}

function setGateError(message) {
  gateError.textContent = message;
}

function allLocalStorageKeys() {
  // Exclude anything that looks like it belongs to Firebase's own SDK
  // (its default persistence is IndexedDB, not localStorage, but this
  // guards against ever wiping our own signed-in session if that changes).
  return Object.keys(localStorage).filter((key) => !key.startsWith("firebase"));
}

// Captured before any patching, so purely-local cleanup (sign-out, resets
// before hydrating from the cloud) never gets mistaken for a user edit and
// mirrored to Firestore as a deletion.
const originalRemoveItem = Storage.prototype.removeItem;

function clearLocalAppData() {
  allLocalStorageKeys().forEach((key) => originalRemoveItem.call(localStorage, key));
}

function installWriteMirror() {
  if (mirrorInstalled) return;
  mirrorInstalled = true;
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    originalSetItem.call(this, key, value);
    if (this === window.localStorage && currentUid) {
      pendingWrites[key] = value;
      scheduleFlush();
    }
  };
  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    originalRemoveItem.call(this, key);
    if (this === window.localStorage && currentUid) {
      pendingWrites[key] = deleteField();
      scheduleFlush();
    }
  };
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flushPendingWrites, 1200);
}

async function flushPendingWrites() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!currentUid) return;
  const changes = { ...pendingWrites };
  Object.keys(changes).forEach((key) => delete pendingWrites[key]);
  if (Object.keys(changes).length === 0) return;
  try {
    await setDoc(doc(window.firebaseDb, "users", currentUid), changes, { merge: true });
  } catch (err) {
    console.error("Cloud sync write failed:", err);
  }
}

async function hydrateFromCloud(uid) {
  const ref = doc(window.firebaseDb, "users", uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    clearLocalAppData();
    const data = snap.data();
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === "string") localStorage.setItem(key, value);
    });
    sessionStorage.setItem(SESSION_FLAG_PREFIX + uid, "1");
    location.reload();
    return "reloading";
  }

  // Brand-new account: everyone starts fresh, so any stray local data from
  // browsing signed-out is discarded rather than carried in.
  clearLocalAppData();
  await setDoc(ref, { createdAt: new Date().toISOString() });
  sessionStorage.setItem(SESSION_FLAG_PREFIX + uid, "1");
  return "fresh";
}

async function handleSignedIn(user) {
  currentUid = user.uid;
  installWriteMirror();
  accountEmail.textContent = user.email;
  accountChip.hidden = false;
  setGateError("");

  const alreadyHydrated = sessionStorage.getItem(SESSION_FLAG_PREFIX + user.uid) === "1";
  if (alreadyHydrated) {
    hideGate();
    return;
  }

  showGate("Loading your progress…", false);
  try {
    const result = await hydrateFromCloud(user.uid);
    if (result === "reloading") return;
    hideGate();
  } catch (err) {
    console.error(err);
    showGate("Couldn't load your saved progress.", false);
    setGateError("Check your connection and reload the page to try again.");
  }
}

function handleSignedOut() {
  currentUid = null;
  accountChip.hidden = true;
  showGate("Sign in with Google to save your progress and play.", true);
}

document.addEventListener("jsq-auth-changed", (e) => {
  const { user } = e.detail;
  if (user) {
    handleSignedIn(user);
  } else {
    handleSignedOut();
  }
});

if (window.jsqFirebaseAuthSettled) {
  if (window.jsqFirebaseCurrentUser) {
    handleSignedIn(window.jsqFirebaseCurrentUser);
  } else {
    handleSignedOut();
  }
}

gateButton.addEventListener("click", async () => {
  gateButton.disabled = true;
  setGateError("");
  try {
    await window.jsqSignInWithGoogle();
  } catch (err) {
    console.error(err);
    setGateError(
      err.code === "auth/popup-closed-by-user"
        ? "Sign-in was cancelled."
        : `Sign-in failed: ${err.message}`
    );
  } finally {
    gateButton.disabled = false;
  }
});

accountSignout.addEventListener("click", async () => {
  await flushPendingWrites();
  if (currentUid) sessionStorage.removeItem(SESSION_FLAG_PREFIX + currentUid);
  sessionStorage.removeItem("jsq-cloud-session-active");
  clearLocalAppData();
  await window.jsqSignOut();
  location.reload();
});

window.addEventListener("pagehide", () => {
  flushPendingWrites();
});
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushPendingWrites();
});

// The "can't reach the sign-in service" watchdog lives in a plain inline
// script on each page (see jsq-gate-watchdog), not here — if the CDN import
// above fails, this whole module never runs, so a fallback defined in here
// would never fire either.
