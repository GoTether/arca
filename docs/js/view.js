import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";

// Use your real config here:
const firebaseConfig = {
  apiKey: "AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0",
  authDomain: "tether-71e0c.firebaseapp.com",
  databaseURL: "https://tether-71e0c-default-rtdb.firebaseio.com",
  projectId: "tether-71e0c",
  storageBucket: "tether-71e0c.appspot.com",
  messagingSenderId: "277809008742",
  appId: "1:277809008742:web:2586a2b821d8da8f969da7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const outputDiv = document.getElementById('output');
const itemsDiv = document.getElementById('items');

// Get arcaId from URL (view.html?id=Arca5)
const urlParams = new URLSearchParams(window.location.search);
const arcaId = urlParams.get('id');

function showError(msg) {
  outputDiv.textContent = msg;
  itemsDiv.innerHTML = "";
}

function renderArca(arca) {
  outputDiv.textContent = JSON.stringify(arca, null, 2);
  itemsDiv.innerHTML = "";
  if (arca.items) {
    itemsDiv.innerHTML = "<h3>Items</h3>";
    for (const [itemId, item] of Object.entries(arca.items)) {
      const div = document.createElement('div');
      div.style = "display:inline-block; margin:0.5em; padding:1em; background:#eef; border-radius:8px;";
      div.innerHTML = `<strong>${item.name || "Unnamed"}</strong><br>Qty: ${item.quantity ?? 0}`;
      itemsDiv.appendChild(div);
    }
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showError("You must be logged in to view arca data.");
    return;
  }
  if (!arcaId) {
    showError("No arca ID specified in URL.");
    return;
  }
  // Try to fetch arca data
  try {
    const arcaSnap = await get(ref(db, `arcas/${arcaId}`));
    if (!arcaSnap.exists()) {
      showError(`No data found for arca ID: ${arcaId}`);
      return;
    }
    const arca = arcaSnap.val();
    // Check access logic: owner or sharedWith
    const hasAccess = arca.owner === user.uid || (arca.sharedWith && arca.sharedWith[user.uid]);
    if (!hasAccess) {
      showError("You do not have permission to view this arca.");
      return;
    }
    renderArca(arca);
  } catch (err) {
    showError("Error fetching data: " + (err?.message || err));
  }
});
