// /js/firebase-init.js
// Firebase app init via CDN (works on GitHub Pages).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// === Your real config ===
const firebaseConfig = {
  apiKey: "AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0",
  authDomain: "tether-71e0c.firebaseapp.com",
  databaseURL: "https://tether-71e0c-default-rtdb.firebaseio.com",
  projectId: "tether-71e0c",
  storageBucket: "tether-71e0c.appspot.com", // correct domain for bucket
  messagingSenderId: "277809008742",
  appId: "1:277809008742:web:2586a2b821d8da8f969da7",
  measurementId: "G-X7ZQ6DJYEN"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// Optional helper: Anonymous sign-in (useful if rules require auth)
export async function ensureAnonSignIn() {
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn("Anon sign-in failed. Enable it in Firebase Auth > Sign-in method.", e);
    throw e;
  }
}

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
