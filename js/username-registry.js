// Maintains a public `usernames/{lowercasedUsername} -> { uid }` lookup so
// dev tools (gifts, bans) can target a player by the 4-12 char username they
// set on the Event page, without ever needing their Firebase uid directly.
import {
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const USERNAME_KEY = "jsq-event-username";
const SYNCED_MARKER_KEY = "jsq-username-registry-synced";

async function syncUsername(username) {
  if (!username) return;
  const user = window.firebaseAuth && window.firebaseAuth.currentUser;
  if (!user) return;
  const lower = username.toLowerCase();
  if (localStorage.getItem(SYNCED_MARKER_KEY) === lower) return;
  try {
    await setDoc(doc(window.firebaseDb, "usernames", lower), {
      uid: user.uid,
      username,
    });
    localStorage.setItem(SYNCED_MARKER_KEY, lower);
  } catch (err) {
    console.error("Username registry sync failed:", err);
  }
}

window.jsqSyncUsername = syncUsername;

function syncExisting() {
  const existing = localStorage.getItem(USERNAME_KEY);
  if (existing) syncUsername(existing);
}

// Covers page loads where a username was already set (e.g. on another
// device, or before this script existed) but never registered.
document.addEventListener("jsq-auth-changed", (e) => {
  if (e.detail.user) syncExisting();
});
if (window.jsqFirebaseAuthSettled && window.jsqFirebaseCurrentUser) {
  syncExisting();
}
