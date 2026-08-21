// Firebase connection setup for Jesus Side Quest.
// Loaded as a native ES module (<script type="module">) directly from the
// gstatic CDN — no build tools, no npm install, no change to GitHub Pages hosting.
// This file only establishes the connection (Auth + Firestore). It does not
// touch any existing localStorage-based app data or logic.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAohMVlaip_fWenxlLKBrBgRExpZwxYKqk",
  authDomain: "jesussidequest.firebaseapp.com",
  projectId: "jesussidequest",
  storageBucket: "jesussidequest.firebasestorage.app",
  messagingSenderId: "272539198722",
  appId: "1:272539198722:web:0b54a8e0cc74c6e8418e1b",
  measurementId: "G-E96PPB2WM9",
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseAuth = getAuth(firebaseApp);
const firebaseDb = getFirestore(firebaseApp);
const googleProvider = new GoogleAuthProvider();

window.firebaseApp = firebaseApp;
window.firebaseAuth = firebaseAuth;
window.firebaseDb = firebaseDb;

window.jsqSignInWithGoogle = () => signInWithPopup(firebaseAuth, googleProvider);
window.jsqSignOut = () => signOut(firebaseAuth);

window.jsqFirestoreTestWrite = async () => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const ref = doc(firebaseDb, "connectionTests", user.uid);
  await setDoc(ref, {
    email: user.email,
    displayName: user.displayName,
    checkedAt: new Date().toISOString(),
  });
  return ref.path;
};

window.jsqFirestoreTestRead = async () => {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not signed in.");
  const ref = doc(firebaseDb, "connectionTests", user.uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
};

onAuthStateChanged(firebaseAuth, (user) => {
  document.dispatchEvent(new CustomEvent("jsq-auth-changed", { detail: { user } }));
});

document.dispatchEvent(new CustomEvent("jsq-firebase-ready"));
