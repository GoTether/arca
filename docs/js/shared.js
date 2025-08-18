// shared.js
// Shared Firebase initialization and authentication utilities for Tethr Arca.

// Import Firebase modules for Auth, Database and Storage.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getDatabase, ref as dbRef, set as dbSet } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';

// Your Firebase configuration; note the correct storageBucket format (<project>.firebasestorage.app)
const firebaseConfig = {
  apiKey: 'AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0',
  authDomain: 'tether-71e0c.firebaseapp.com',
  databaseURL: 'https://tether-71e0c-default-rtdb.firebaseio.com',
  projectId: 'tether-71e0c',
  storageBucket: 'tether-71e0c.firebasestorage.app', // <-- CORRECT BUCKET!
  messagingSenderId: '277809008742',
  appId: '1:277809008742:web:2586a2b821d8da8f969da7',
  measurementId: 'G-X7ZQ6DJYEN'
};

// Initialize Firebase app.
const app = initializeApp(firebaseConfig);

// Export Firebase services.
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Sign up a user with email/password, then record them under /users/{uid}.
export async function signUp(email, password) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  await dbSet(dbRef(db, `users/${uid}`), {
    email,
    createdAt: Date.now(),
    lastLogin: Date.now()
  });
  return userCredential.user;
}

// Sign in an existing user.
export async function signIn(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const { uid } = userCredential.user;
  // update lastLogin timestamp
  try {
    await dbSet(dbRef(db, `users/${uid}/lastLogin`), Date.now());
  } catch (err) {
    /* ignore */
  }
  return userCredential.user;
}

// Sign out the current user.
export async function signOut() {
  await firebaseSignOut(auth);
}

// Listen for auth state changes.
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Retrieve the current user asynchronously.
export async function getUser() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user || null);
    });
  });
}
