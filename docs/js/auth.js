// auth.js
// Handles login, signup, logout operations, and provides current user info.

import { signIn, signUp, signOut, onAuth, getUser } from './shared.js';

// Signup form handling
export function initSignup() {
  const form = document.getElementById('signupForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const confirm = document.getElementById('signupConfirm').value;
      if (password !== confirm) {
        alert('Passwords do not match');
        return;
      }
      try {
        await signUp(email, password);
        // Redirect to dashboard
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message || 'Signup failed');
      }
    });
  }
  onAuth((user) => {
    if (user) {
      window.location.href = 'index.html';
    }
  });
}

// Login form handling
export function initLogin() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      try {
        await signIn(email, password);
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message || 'Login failed');
      }
    });
  }
  onAuth((user) => {
    if (user) {
      window.location.href = 'index.html';
    }
  });
}

// Logout button handling
export function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      await signOut();
      window.location.href = 'login.html';
    });
  }
}

// Listen for auth state changes and run a callback
export function onAuthStateChanged(callback) {
  onAuth(callback);
}

// Returns current user info (email, etc); null if not logged in
export async function getCurrentUser() {
  // If shared.js provides getUser, use it; otherwise, fallback to localStorage
  try {
    if (typeof getUser === 'function') {
      const user = await getUser();
      return user || null;
    }
  } catch (e) {
    // fallback below
  }
  // Fallback: try localStorage
  const email = localStorage.getItem('userEmail');
  if (email) {
    return { email };
  }
  return null;
}
