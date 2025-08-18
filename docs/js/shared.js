// shared.js
// Shared authentication and utility functions for the app

// Simulated user store for demonstration (replace with real backend/Firebase as needed)
const fakeUserDB = [
  { email: "user@example.com", password: "password123" }
];

// Simulate current authenticated user (set during signIn/signUp)
let currentUser = null;

// Sign up a user
export async function signUp(email, password) {
  // Replace this with real API/backend logic!
  const userExists = fakeUserDB.some(u => u.email === email);
  if (userExists) {
    throw new Error("User already exists");
  }
  fakeUserDB.push({ email, password });
  currentUser = { email };
  return currentUser;
}

// Sign in a user
export async function signIn(email, password) {
  // Replace this with real API/backend logic!
  const user = fakeUserDB.find(u => u.email === email && u.password === password);
  if (!user) {
    throw new Error("Invalid email or password");
  }
  currentUser = { email };
  return currentUser;
}

// Sign out current user
export async function signOut() {
  currentUser = null;
}

// Listen for authentication state changes (callback receives user or null)
export function onAuth(callback) {
  // Simulate immediate callback with currentUser
  callback(currentUser);
}

// Get the current user object ({email}) or null if not logged in
export async function getUser() {
  // Try in-memory, then localStorage as fallback
  if (currentUser && currentUser.email) {
    return currentUser;
  }
  const email = localStorage.getItem('userEmail');
  if (email) {
    return { email };
  }
  return null;
}
