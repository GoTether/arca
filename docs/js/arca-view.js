import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, update, push } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0",
  authDomain: "tether-71e0c.firebaseapp.com",
  databaseURL: "https://tether-71e0c-default-rtdb.firebaseio.com",
  projectId: "tether-71e0c",
  storageBucket: "tether-71e0c.firebasestorage.app",
  messagingSenderId: "277809008742",
  appId: "1:277809008742:web:2586a2b821d8da8f969da7",
  measurementId: "G-X7ZQ6DJYEN"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

const urlParams = new URLSearchParams(window.location.search);
const arcaId = urlParams.get("id");

if (!arcaId) {
  alert("No Arca ID provided.");
  window.location.href = "dashboard.html";
}

const arcaRef = ref(db, "arca/" + arcaId);

// --- Load Arca Data ---
async function loadArca() {
  const snapshot = await get(arcaRef);
  if (!snapshot.exists()) {
    alert("Arca not found.");
    return;
  }
  const data = snapshot.val();
  document.getElementById("arcaName").textContent = data.name;
  document.getElementById("arcaType").textContent = data.type;
  document.getElementById("arcaNote").textContent = data.note;

  if (data.image) {
    const img = document.getElementById("arcaImage");
    img.src = data.image;
    img.classList.remove("hidden");
  }

  loadItems(data.items || {});
}

// --- Load Items ---
function loadItems(items) {
  const list = document.getElementById("itemsList");
  list.innerHTML = "";
  Object.entries(items).forEach(([key, item]) => {
    const div = document.createElement("div");
    div.className = "bg-slate-800/70 p-3 rounded-lg flex items-center space-x-4";
    div.innerHTML = `
      ${item.image ? `<img src="${item.image}" class="w-16 h-16 object-cover rounded"/>` : ""}
      <div>
        <p class="font-semibold">${item.name}</p>
        <p class="text-sm text-slate-400">${item.note || ""}</p>
      </div>
    `;
    list.appendChild(div);
  });
}

// --- Add Item ---
document.getElementById("addItemBtn").addEventListener("click", async () => {
  const name = prompt("Item name:");
  if (!name) return;
  const note = prompt("Item note (optional):") || "";

  // Ask for photo
  const fileInput = document.getElementById("fileInput");
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    let imageUrl = "";
    if (file) {
      const resizedBlob = await resizeImage(file, 1024, 0.7);
      const storageRef = sRef(storage, `arca-items/${arcaId}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, resizedBlob);
      imageUrl = await getDownloadURL(storageRef);
    }

    const itemRef = push(ref(db, `arca/${arcaId}/items`));
    await set(itemRef, {
      name,
      note,
      image: imageUrl,
      createdAt: Date.now()
    });

    loadArca();
  };
  fileInput.click();
});

// --- Resize Image ---
function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          blob => resolve(blob),
          "image/jpeg",
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Init ---
loadArca();
