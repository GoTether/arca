// Logic for Arca index.html landing page
import { db, ensureAuth } from "./js/firebase-init.js";

const formEl = document.getElementById("arca-id-form");
const inputEl = document.getElementById("arca-id-input");
const toastEl = document.getElementById("arca-toast");

// Helper: show toast messages
function showToast(msg, type = "info", ms = 2500) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  toastEl.style.background = type === "error" ? "#fcc" : "#cfc";
  setTimeout(() => { toastEl.style.display = "none"; }, ms);
}

// Parse arcaId from query or hash
function getArcaIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("arcaId")) return params.get("arcaId");
  if (params.get("id")) return params.get("id");
  if (window.location.hash && window.location.hash.length > 1)
    return window.location.hash.slice(1);
  return null;
}

// Main: handle routing
ensureAuth(async (user) => {
  const arcaId = getArcaIdFromUrl();
  if (arcaId) {
    showToast("Checking Arca ID...");
    // Try all possible roots
    const roots = [
      `tethers/${arcaId}/arca`,
      `arca/${arcaId}`,
      `tethers/${arcaId}`
    ];
    let found = false, isTerra = false;
    for (const root of roots) {
      const snap = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js")
        .then(m => m.get(ref => ref(db, root)))
        .then(ref => window.firebase.database().ref(root).get())
        .catch(() => null);
      if (snap && snap.exists()) {
        found = true;
        // If legacy, check for Terra
        const val = snap.val();
        if (root === `tethers/${arcaId}` && (val.template || val.template_id)) {
          isTerra = true;
          break;
        }
        // Found Arca
        window.location.href = `display.html?arcaId=${arcaId}`;
        return;
      }
    }
    if (isTerra) {
      showToast("This is a Terra tether. You may create an Arca under this ID.", "error", 4000);
      setTimeout(() => {
        window.location.href = `setup.html?arcaId=${arcaId}`;
      }, 2500);
      return;
    }
    // Not found: go to setup
    setTimeout(() => {
      window.location.href = `setup.html?arcaId=${arcaId}`;
    }, 1200);
    return;
  }
});

// Form submit: manual entry
formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = inputEl.value.trim();
  if (!val) return showToast("Please enter an Arca ID.", "error");
  window.location.href = `index.html?arcaId=${encodeURIComponent(val)}`;
});

// Help link
document.getElementById("help-link").addEventListener("click", (e) => {
  e.preventDefault();
  alert("Arca lets you track what's inside any physical container. Enter an Arca ID (any code you want) to view or create an inventory. Visit Dashboard to manage all your Arcas.");
});
