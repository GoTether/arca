import { db, auth, ensureAuth } from "./js/firebase-init.js";

const arcaListEl = document.getElementById("arca-list");
const toastEl = document.getElementById("arca-toast");

// Toast helper
function showToast(msg, type = "info", ms = 2500) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  toastEl.style.background = type === "error" ? "#fcc" : "#cfc";
  setTimeout(() => { toastEl.style.display = "none"; }, ms);
}

// Load user's Arcas
async function loadArcas() {
  arcaListEl.innerHTML = "Loading...";
  if (!auth.currentUser) {
    arcaListEl.innerHTML = "<em>Please sign in to see your Arcas.</em>";
    return;
  }
  try {
    const { ref: dbRef, get } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js");
    const indexSnap = await get(dbRef(db, `arca-user/${auth.currentUser.uid}`));
    if (!indexSnap.exists()) {
      arcaListEl.innerHTML = "<em>No Arcas found. Create one from the home page!</em>";
      return;
    }
    const arcas = indexSnap.val();
    arcaListEl.innerHTML = "";
    for (const arcaId in arcas) {
      // Get full Arca info
      const arcaSnap = await get(dbRef(db, `arca/${arcaId}`));
      const arca = arcaSnap.exists() ? arcaSnap.val() : { name: "(not found)" };
      const card = document.createElement("div");
      card.className = "arca-card";
      if (arca.photo) {
        const img = document.createElement("img");
        img.src = arca.photo;
        img.className = "arca-card-photo";
        card.appendChild(img);
      }
      const info = document.createElement("div");
      info.className = "arca-card-info";
      info.innerHTML = `<strong>${arca.name || "(no name)"}</strong><br>
        <span>${arca.type || ""}${arca.location ? " @ " + arca.location : ""}</span>
        <div style="font-size:0.97em;color:#888">ID: ${arcaId}</div>`;
      card.appendChild(info);
      const actions = document.createElement("div");
      actions.className = "arca-card-actions";
      // View button
      const viewBtn = document.createElement("button");
      viewBtn.textContent = "View";
      viewBtn.onclick = () => {
        window.location.href = `display.html?arcaId=${encodeURIComponent(arcaId)}`;
      };
      actions.appendChild(viewBtn);
      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.onclick = async () => {
        if (!confirm(`Remove "${arca.name}" from your dashboard? This does not delete the Arca or its items.`)) return;
        await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js")
          .then(({ ref: dbRef, remove }) =>
            remove(dbRef(db, `arca-user/${auth.currentUser.uid}/${arcaId}`))
          );
        showToast("Removed from dashboard.", "info");
        loadArcas();
      };
      actions.appendChild(removeBtn);
      card.appendChild(actions);
      arcaListEl.appendChild(card);
    }
  } catch (err) {
    arcaListEl.innerHTML = "<em>Error loading dashboard.</em>";
  }
}

// Auth and load
ensureAuth(loadArcas);
