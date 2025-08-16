import { db, storage, auth, ensureAuth } from "./js/firebase-init.js";
import { downscale } from "./js/downscale.js";

// Elements
const arcaIdEl = document.getElementById("arca-id");
const nameEl = document.getElementById("arca-name");
const typeEl = document.getElementById("arca-type");
const locEl = document.getElementById("arca-location");
const photoEl = document.getElementById("arca-photo");
const previewEl = document.getElementById("arca-photo-preview");
const formEl = document.getElementById("arca-setup-form");
const toastEl = document.getElementById("arca-toast");

// Show Arca ID from URL
const params = new URLSearchParams(window.location.search);
const arcaId = params.get("arcaId") || "";
arcaIdEl.value = arcaId;

// Toast helper
function showToast(msg, type = "info", ms = 2500) {
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  toastEl.style.background = type === "error" ? "#fcc" : "#cfc";
  setTimeout(() => { toastEl.style.display = "none"; }, ms);
}

// Photo preview
photoEl.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) { previewEl.style.display = "none"; return; }
  try {
    const downsized = await downscale(file, 400, 'image/jpeg', 0.8);
    const fr = new FileReader();
    fr.onload = e => {
      previewEl.src = e.target.result;
      previewEl.style.display = "block";
    };
    fr.readAsDataURL(downsized);
    previewEl.dataset.file = downsized; // not a real file, but keeps state
  } catch (err) {
    showToast("Error downsizing image.", "error");
    previewEl.style.display = "none";
  }
});

// On submit: create new Arca
formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!arcaId) return showToast("Missing Arca ID.", "error");
  if (!nameEl.value.trim()) return showToast("Name required.", "error");

  showToast("Creating Arca...");

  // Gather data
  const data = {
    id: arcaId,
    name: nameEl.value.trim(),
    type: typeEl.value.trim(),
    location: locEl.value.trim(),
    created: Date.now(),
    owner: auth.currentUser ? auth.currentUser.uid : null,
  };

  // Handle photo upload (optional)
  let photoUrl = "";
  if (photoEl.files && photoEl.files[0]) {
    try {
      const downsized = await downscale(photoEl.files[0], 800, 'image/jpeg', 0.8);
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js");
      const arcaPhotoRef = storageRef(storage, `arca-photos/${arcaId}.jpg`);
      await uploadBytes(arcaPhotoRef, downsized);
      photoUrl = await getDownloadURL(arcaPhotoRef);
      data.photo = photoUrl;
    } catch (err) {
      showToast("Failed to upload photo.", "error");
    }
  }

  // Write to DB
  try {
    const { ref: dbRef, set } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-database.js");
    await set(dbRef(db, `arca/${arcaId}`), data);

    // Add to user index
    if (auth.currentUser && auth.currentUser.uid) {
      const indexRef = dbRef(db, `arca-user/${auth.currentUser.uid}/${arcaId}`);
      await set(indexRef, { name: data.name, created: data.created });
    }

    showToast("Arca created!", "info");
    setTimeout(() => {
      window.location.href = `display.html?arcaId=${encodeURIComponent(arcaId)}`;
    }, 1200);
  } catch (err) {
    showToast("Error saving Arca: " + err.message, "error");
  }
});

// Auth
ensureAuth();
