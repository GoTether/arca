// auth.js
// Handles login, signup and logout operations.

import { signIn, signUp, signOut, onAuth } from './shared.js';

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
