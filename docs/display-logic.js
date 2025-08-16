// /docs/display-logic.js — Arca clean start (modular SDK, anon auth, auto-create)
console.log("Arca display-logic loaded");

import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ==================== Firebase ==================== */
const firebaseConfig = {
  apiKey: "AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0",
  authDomain: "tether-71e0c.firebaseapp.com",
  databaseURL: "https://tether-71e0c-default-rtdb.firebaseio.com",
  projectId: "tether-71e0c",
  storageBucket: "tether-71e0c.appspot.com"
};
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth(app);

/* ==================== DOM & helpers ==================== */
const $ = (s) => document.querySelector(s);
function showToast(msg = "Saved", type = "ok") {
  const toast = $("#toast");
  const inner = $("#toastInner");
  if (!toast || !inner) return;
  inner.textContent = msg;
  inner.className =
    "rounded-xl px-3 py-2 text-sm shadow-lg " +
    (type === "ok" ? "bg-slate-800 text-slate-100" : "bg-red-600 text-white");
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 1200);
}
function flashSaved(itemId) {
  const tilesEl = $("#tiles");
  const tile = tilesEl?.querySelector?.(`[data-tile="${itemId}"]`);
  if (!tile) return;
  tile.classList.add("ring-2","ring-emerald-500");
  let chip = tile.querySelector(".saved-chip");
  if (!chip) {
    chip = document.createElement("div");
    chip.className = "absolute top-2 right-2 text-xs bg-emerald-600/90 text-white px-2 py-0.5 rounded-full saved-chip";
    chip.textContent = "✓ Saved";
    tile.appendChild(chip);
  } else {
    chip.classList.remove("hidden");
  }
  setTimeout(() => { tile.classList.remove("ring-2","ring-emerald-500"); chip.classList.add("hidden"); }, 700);
}
async function downscale(file, maxDim=1200, mime="image/jpeg", quality=0.85){
  const img = await new Promise(res => { const i=new Image(); i.onload=()=>res(i); i.src=URL.createObjectURL(file); });
  const scale = Math.min(1, maxDim/Math.max(img.width,img.height));
  if(scale===1) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width*scale); c.height = Math.round(img.height*scale);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  const blob = await new Promise(res => c.toBlob(res, mime, quality));
  return new File([blob], file.name.replace(/\.\w+$/,"")+".jpg", {type:mime});
}

// Cross-compatible id extraction (?arcaId, ?id, or #hash)
function getParamCI(name){
  const qs = new URLSearchParams(location.search);
  for (const [k,v] of qs.entries()) if (k.toLowerCase() === name.toLowerCase()) return v;
  return null;
}
function extractArcaId(){
  let id = (getParamCI("arcaId") || getParamCI("id") || "").trim();
  if (!id && location.hash) id = location.hash.replace(/^#/, "").trim();
  return id || "";
}

/* ==================== Main ==================== */
window.addEventListener("DOMContentLoaded", () => {
  const arcaId = extractArcaId();

  if (!arcaId) {
    document.body.innerHTML = `<main class="max-w-md mx-auto p-6 text-sm">
      Missing <b>arcaId</b>. <a href="./index.html" class="underline underline-offset-4">Go back</a>.
    </main>`;
    return;
  }

  // Elements expected by the page
  const crumbs = $("#crumbs");
  const arcaName = $("#arcaName");
  const arcaMeta = $("#arcaMeta");
  const tilesEl = $("#tiles");
  const addItemBtn = $("#addItemBtn");

  // Create-bar elements
  const createBar = $("#createBar");
  const createName = $("#createName");
  const createType = $("#createType");
  const createLoc  = $("#createLoc");
  const createSave = $("#createSave");

  // Photo modal
  const modal = $("#modal");
  const modalOk = $("#modalOk");
  const modalCancel = $("#modalCancel");
  const fileInput = $("#fileInput");
  const noteInput = $("#noteInput");

  // New item modal
  const newItemModal  = $("#newItemModal");
  const newItemName   = $("#newItemName");
  const newItemQty    = $("#newItemQty");
  const newItemFile   = $("#newItemFile");
  const newItemNote   = $("#newItemNote");
  const newItemSave   = $("#newItemSave");
  const newItemCancel = $("#newItemCancel");

  // State / paths
  let items = {};
  const arcaRef  = ref(db, `arca/${arcaId}`);
  const itemsRef = ref(db, `arca/${arcaId}/item
