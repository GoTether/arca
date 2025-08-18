// shared.js
// Initializes Firebase and exposes common helpers for auth, database and storage.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';

// TODO: Replace these values with your own Firebase project configuration.
const firebaseConfig = {
  apiKey: 'AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0',
  authDomain: 'tether-71e0c.firebaseapp.com',
  databaseURL: 'https://tether-71e0c-default-rtdb.firebaseio.com',
  projectId: 'tether-71e0c',
  storageBucket: 'tether-71e0c.appspot.com',
  messagingSenderId: '277809008742',
  appId: '1:277809008742:web:2586a2b821d8da8f969da7',
  measurementId: 'G-X7ZQ6DJYEN'
};

// Initialize Firebase only once.
const app = initializeApp(firebaseConfig);

// Export Firebase services.
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

// Returns a promise that resolves when the auth state is determined.
export function onAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

// Sign in a user with email and password. Returns a promise.
export function signIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Create a new user with email and password. Returns a promise.
export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

// Sign out the current user. Returns a promise.
export function signOut() {
  return firebaseSignOut(auth);
}