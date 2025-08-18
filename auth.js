// auth.js
// Handles login, signup and logout operations.

import { signIn, signUp, signOut, onAuth } from './shared.js';

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
        // Redirect to dashboard
        window.location.href = 'index.html';
      } catch (err) {
        alert(err.message || 'Login failed');
      }
    });
  }
  // Check if already logged in
  onAuth((user) => {
    if (user) {
      window.location.href = 'index.html';
    }
  });
}

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

// Logout handling (usable on dashboard)
export function initLogout() {
  const btn = document.getElementById('logoutBtn');
  if (btn) {
    btn.addEventListener('click', async () => {
      try {
        await signOut();
        window.location.href = 'login.html';
      } catch (err) {
        console.error(err);
      }
    });
  }
}