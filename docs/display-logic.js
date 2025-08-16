// /docs/display-logic.js — Arca w/ DB autodetect (arca/{id} OR tethers/{id}/arca)
console.log("Arca display-logic (autodetect) loaded");

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

/* ==================== Root detection ==================== */
// We will bind to whichever root exists first.
//  - Prefer existing `arca/{id}`
//  - Else, if `tethers/{id}/arca` exists, use that
//  - Else, we will CREATE under `tethers/{id}/arca` (to stay compatible with your DB)
async function pickDataRoot(id) {
  const roots = [
    { label: "arca",            base: `arca/${id}`,            pathItems: `arca/${id}/items`,            storage: (item, ts, name)=>`arca/${id}/${item}/${ts}-${name}` },
    { label: "tethers-arca",    base: `tethers/${id}/arca`,    pathItems: `tethers/${id}/arca/items`,    storage: (item, ts, name)=>`tethers/${id}/arca/${item}/${ts}-${name}` },
  ];

  for (const r of roots) {
    const exists = (await get(ref(db, r.base))).exists();
    if (exists) return { ...r, exists: true, createHere: false };
  }
  // Default creation root if none exist:
  const fallback = roots[1]; // tethers/{id}/arca
  return { ...fallback, exists: false, createHere: true };
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

  // Elements
  const crumbs = $("#crumbs");
  const arcaName = $("#arcaName");
  const arcaMeta = $("#arcaMeta");
  const tilesEl = $("#tiles");
  const addItemBtn = $("#addItemBtn");

  const createBar = $("#createBar");
  const createName = $("#createName");
  const createType = $("#createType");
  const createLoc  = $("#createLoc");
  const createSave = $("#createSave");

  const modal = $("#modal");
  const modalOk = $("#modalOk");
  const modalCancel = $("#modalCancel");
  const fileInput = $("#fileInput");
  const noteInput = $("#noteInput");

  const newItemModal  = $("#newItemModal");
  const newItemName   = $("#newItemName");
  const newItemQty    = $("#newItemQty");
  const newItemFile   = $("#newItemFile");
  const newItemNote   = $("#newItemNote");
  const newItemSave   = $("#newItemSave");
  const newItemCancel = $("#newItemCancel");

  // State (will be filled after we pick a root)
  let items = {};
  let ROOT = null;        // { base, pathItems, storage(), exists, createHere, label }
  let arcaRef = null;
  let itemsRef = null;

  // Ensure auth first
  onAuthStateChanged(auth, async (u) => {
    try {
      if (!u) {
        await signInAnonymously(auth);
        return; // will fire again with a user
      }
    } catch (e) {
      console.warn("Anonymous auth error:", e);
    }

    // Detect where data lives
    ROOT = await pickDataRoot(arcaId);
    arcaRef  = ref(db, ROOT.base);
    itemsRef = ref(db, ROOT.pathItems);

    // If missing, show create strip (but DON'T stomp any existing tethers data)
    if (!ROOT.exists) {
      if (createBar) {
        createBar.classList.remove("hidden");
        if (createName && !createName.value) createName.value = arcaId;
      }
    }

    // Header/meta (listen continuously)
    onValue(arcaRef, (snap) => {
      const arca = snap.val() || {};
      if (arcaName) arcaName.textContent = arca?.name || arcaId;
      const bits = [];
      if (arca?.type) bits.push(arca.type);
      if (arca?.location) bits.push(arca.location);
      if (arcaMeta) arcaMeta.textContent = bits.join(" • ");
      if (crumbs) crumbs.textContent = `${arca?.name || arcaId}`;
    }, (err) => console.error("arcaRef error:", err?.message || err));

    // Items list
    onValue(itemsRef, (snap) => {
      items = snap.val() || {};
      renderItems();
    }, (err) => console.error("itemsRef error:", err?.message || err));
  });

  // Create Arca at the chosen root
  createSave?.addEventListener?.("click", async () => {
    const name = (createName?.value || arcaId).trim();
    const type = (createType?.value || "").trim();
    const location = (createLoc?.value || "").trim();
    try {
      const now = Date.now();
      await set(arcaRef, { name, type, location, createdAt: now, updatedAt: now, items: {} });
      createBar?.classList.add("hidden");
      showToast("Arca created");
    } catch (e) {
      console.error(e);
      showToast("Error creating Arca", "error");
    }
  });

  // Render items
  function renderItems(){
    if (!tilesEl) return;
    tilesEl.innerHTML = "";
    const entries = Object.entries(items);
    if(entries.length === 0){
      tilesEl.innerHTML = `<div class="glass p-4 rounded-2xl text-sm text-slate-300">No items yet. Use “Add Item”.</div>`;
      return;
    }
    for(const [id, item] of entries){
      const imgUrl = (item.images && item.images[0]?.url) || "";
      const tile = document.createElement("div");
      tile.className = "tile glass rounded-2xl p-3 relative";
      tile.setAttribute("data-tile", id);
      tile.innerHTML = `
        <div class="w-full aspect-video rounded-xl bg-slate-800 overflow-hidden mb-2">
          ${imgUrl
            ? `<img src="${imgUrl}" class="w-full h-full object-cover" alt="">`
            : `<div class="w-full h-full flex items-center justify-center text-xs text-slate-500">No Photo</div>`}
        </div>
        <div class="font-semibold">${item.name || "Unnamed"}</div>
        <div class="text-xs text-slate-400">Qty: <span class="font-mono">${item.qty ?? 0}</span></div>
        <div class="mt-3 grid grid-cols-3 gap-2">
          <button data-act="photo" data-id="${id}" class="rounded-xl bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm">Photo/Note</button>
          <button data-act="minus" data-id="${id}" class="rounded-xl bg-red-500/80 hover:bg-red-500 text-slate-900 font-semibold px-0 py-2 text-lg">−</button>
          <button data-act="plus"  data-id="${id}" class="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-0 py-2 text-lg">+</button>
        </div>
      `;
      tile.querySelectorAll("button").forEach(b => b?.addEventListener?.("click", onTileAction));
      tilesEl.appendChild(tile);
    }
  }

  // Quantity adjust (transactional, instant-save)
  async function adjustQty(itemId, delta){
    try {
      const qtyRef = ref(db, `${ROOT.pathItems}/${itemId}/qty`);
      await runTransaction(qtyRef, current => Math.max(0, (current || 0) + delta));
      await update(ref(db, `${ROOT.pathItems}/${itemId}`), { lastUpdated: Date.now() });
      showToast(delta > 0 ? "+1" : "−1");
      flashSaved(itemId);
    } catch (e) {
      console.error(e);
      showToast("Error updating qty", "error");
    }
  }
  function onTileAction(e){
    const id = e.currentTarget.dataset.id;
    const act = e.currentTarget.dataset.act;
    if(act === "minus") adjustQty(id, -1);
    if(act === "plus")  adjustQty(id, +1);
    if(act === "photo") openPhotoModal(id);
  }

  // Photo/Note modal (instant-save)
  function openPhotoModal(itemId){
    if (!modal) return;
    modal.dataset.itemId = itemId;
    if (fileInput) fileInput.value = "";
    if (noteInput) noteInput.value = "";
    modal.classList.remove("hidden");
    modal.classList.add("flex");
  }
  modalCancel?.addEventListener?.("click", ()=>{
    modal.classList.add("hidden"); modal.classList.remove("flex");
  });
  modalOk?.addEventListener?.("click", async ()=>{
    if (!modal) return;
    const itemId = modal.dataset.itemId;
    const file = fileInput?.files?.[0] || null;
    const note = (noteInput?.value || "").trim();
    if(!file && !note){ modal.classList.add("hidden"); modal.classList.remove("flex"); return; }
    try {
      const now = Date.now();
      let uploaded = null;

      if(file){
        const safe = await downscale(file, 1200);
        const path = ROOT.storage(itemId, now, safe.name);
        const sr = sref(storage, path);
        await uploadBytes(sr, safe);
        const url = await getDownloadURL(sr);
        uploaded = { url, path, takenAt: now };
      }

      const itemRef = ref(db, `${ROOT.pathItems}/${itemId}`);
      const snap = await get(itemRef);
      const item = snap.val() || {};
      const images = Array.isArray(item.images) ? item.images.slice() : [];

      const updates = { lastUpdated: now };
      if(uploaded){ images.unshift(uploaded); updates.images = images.slice(0,6); }
      if(note){ const prev = item.notes || ""; updates.notes = prev ? (prev+"\n"+note) : note; }

      await update(itemRef, updates);
      showToast("Saved"); flashSaved(itemId);
    } catch (e) {
      console.error(e); showToast("Error saving", "error");
    } finally {
      modal.classList.add("hidden"); modal.classList.remove("flex");
    }
  });

  // New Item modal (create first; then ± is available)
  function openNewItemModal(){
    if (!newItemModal) return;
    if (newItemName) newItemName.value = "";
    if (newItemQty)  newItemQty.value = "1";
    if (newItemFile) newItemFile.value = "";
    if (newItemNote) newItemNote.value = "";
    newItemModal.classList.remove("hidden"); newItemModal.classList.add("flex");
    setTimeout(()=> newItemName?.focus?.(), 30);
  }
  function closeNewItemModal(){
    newItemModal?.classList.add("hidden"); newItemModal?.classList.remove("flex");
  }
  addItemBtn?.addEventListener?.("click", openNewItemModal);
  newItemCancel?.addEventListener?.("click", closeNewItemModal);

  newItemModal?.querySelectorAll?.("button[data-q]")?.forEach?.(btn => {
    btn?.addEventListener?.("click", () => {
      const add = parseInt(btn.getAttribute("data-q"), 10) || 0;
      const current = parseInt(newItemQty?.value || "0", 10) || 0;
      if (newItemQty) newItemQty.value = String(current + add);
    });
  });

  newItemSave?.addEventListener?.("click", async () => {
    const name = (newItemName?.value || "").trim();
    const qty  = Math.max(0, parseInt(newItemQty?.value || "0", 10) || 0);
    const file = newItemFile?.files?.[0] || null;
    const note = (newItemNote?.value || "").trim();
    if (!name) { showToast("Name is required", "error"); return; }

    try {
      const now = Date.now();
      const newId = "item-" + crypto.randomUUID();
      let images = [];

      if (file) {
        const safe = await downscale(file, 1200);
        const path = ROOT.storage(newId, now, safe.name);
        const sr = sref(storage, path);
        await uploadBytes(sr, safe);
        const url = await getDownloadURL(sr);
        images = [{ url, path, takenAt: now }];
      }

      await set(ref(db, `${ROOT.pathItems}/${newId}`), {
        name, qty, images, notes: note || "", createdAt: now, lastUpdated: now
      });

      closeNewItemModal();
      showToast("Item saved");
      setTimeout(()=> flashSaved(newId), 250);
    } catch (e) {
      console.error(e);
      showToast("Error saving item", "error");
    }
  });
});

