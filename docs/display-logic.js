// Arca-first display logic: detect Arca vs Terra, then bind Arca only
console.log("display-logic: arca-first");

import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, get, set, update, onValue, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ===== Firebase ===== */
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

/* ===== DOM helpers ===== */
const $ = s => document.querySelector(s);
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
function showToast(msg="Saved", type="ok"){
  const toast=$("#toast"), inner=$("#toastInner");
  if(!toast||!inner) return;
  inner.textContent = msg;
  inner.className = "rounded-xl px-3 py-2 text-sm shadow-lg " + (type==="ok"?"bg-slate-800 text-slate-100":"bg-red-600 text-white");
  toast.classList.remove("hidden");
  setTimeout(()=>toast.classList.add("hidden"), 1400);
}
/* tiny debug chip (remove later) */
function debug(text){
  let n=document.getElementById("arca-debug");
  if(!n){ n=document.createElement("div"); n.id="arca-debug"; n.className="fixed left-3 bottom-3 z-50 text-[11px] bg-slate-800/80 text-slate-200 border border-slate-700 rounded px-2 py-1"; document.body.appendChild(n); }
  n.textContent=text;
}

/* ===== detection =====
   Returns:
   { kind: 'arca', arcaBase, itemsPath, headerPath, storagePathFn } OR
   { kind: 'terra', templateKey?, titlePath } OR
   { kind: 'none' }
*/
async function detectKind(id){
  // 1) tethers/{id}/arca (preferred)
  const tethersArcaBase = `tethers/${id}/arca`;
  if ((await get(ref(db, `${tethersArcaBase}/items`))).exists()){
    return {
      kind: "arca",
      arcaBase: tethersArcaBase,
      itemsPath: `${tethersArcaBase}/items`,
      headerPath: tethersArcaBase,
      storagePathFn: (item,ts,name)=>`tethers/${id}/arca/${item}/${ts}-${name}`
    };
  }

  // 2) arca/{id}
  const arcaBase = `arca/${id}`;
  if ((await get(ref(db, `${arcaBase}/items`))).exists()){
    return {
      kind: "arca",
      arcaBase,
      itemsPath: `${arcaBase}/items`,
      headerPath: arcaBase,
      storagePathFn: (item,ts,name)=>`arca/${id}/${item}/${ts}-${name}`
    };
  }

  // 3) tethers/{id}/items (legacy arca-flat)
  const legacyBase = `tethers/${id}`;
  if ((await get(ref(db, `${legacyBase}/items`))).exists()){
    return {
      kind: "arca",
      arcaBase: legacyBase,
      itemsPath: `${legacyBase}/items`,
      headerPath: legacyBase,  // name/type/location might live here
      storagePathFn: (item,ts,name)=>`tethers/${id}/${item}/${ts}-${name}`
    };
  }

  // 4) Terra tether? (template or template_id present)
  const tetherSnap = await get(ref(db, `tethers/${id}`)).catch(()=>null);
  if (tetherSnap && tetherSnap.exists()){
    const t = tetherSnap.val() || {};
    const templateKey = t.template || t.template_id;
    if (templateKey){
      return { kind: "terra", templateKey, titlePath: `tethers/${id}` };
    }
  }

  // 5) nothing yet
  return { kind: "none" };
}

/* ===== main ===== */
window.addEventListener("DOMContentLoaded", () => {
  const arcaId = extractArcaId();
  if (!arcaId){
    document.body.innerHTML = `<main class="max-w-md mx-auto p-6 text-sm">Missing <b>arcaId</b>. <a href="./index.html" class="underline underline-offset-4">Go back</a>.</main>`;
    return;
  }

  // DOM we use
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

  let ROOT = null;   // filled when arca
  let items = {};

  onAuthStateChanged(auth, async (u) => {
    try {
      if (!u){ await signInAnonymously(auth); return; }
    } catch(e){ console.warn("anon auth error:", e); }

    const kind = await detectKind(arcaId);
    debug(`detected: ${kind.kind}`);

    if (kind.kind === "terra"){
      // Show a friendly Terra message and stop (no Arca UI)
      const tpl = kind.templateKey || "(unknown template)";
      const titleSnap = await get(ref(db, kind.titlePath)).catch(()=>null);
      const title = titleSnap?.val()?.name || arcaId;
      if (arcaName) arcaName.textContent = title;
      if (arcaMeta) arcaMeta.textContent = `Terra tether • template: ${tpl}`;
      if (tilesEl) tilesEl.innerHTML = `
        <div class="glass p-4 rounded-2xl text-sm">
          This ID is a <b>Terra</b> tether, not an Arca.<br/>
          If you want to attach inventory, create an Arca for this ID below.
        </div>`;
      // Offer create-bar to add an Arca *under* tethers/{id}/arca (opt-in)
      createBar?.classList.remove("hidden");
      // Wire create to tethers/{id}/arca specifically
      const arcaBase = `tethers/${arcaId}/arca`;
      createSave?.addEventListener?.("click", async ()=>{
        try{
          const now = Date.now();
          const payload = {
            name: (createName?.value || title).trim(),
            type: (createType?.value || "").trim(),
            location: (createLoc?.value || "").trim(),
            createdAt: now, updatedAt: now, items: {}
          };
          await set(ref(db, arcaBase), payload);
          showToast("Arca created");
          location.reload();
        }catch(e){ console.error(e); showToast("Error creating Arca", "error"); }
      });
      return;
    }

    if (kind.kind === "none"){
      // Nothing exists: pure create flow (create under tethers/{id}/arca by default)
      if (crumbs) crumbs.textContent = arcaId;
      if (arcaName) arcaName.textContent = arcaId;
      if (arcaMeta) arcaMeta.textContent = "No data yet";
      createBar?.classList.remove("hidden");
      const arcaBase = `tethers/${arcaId}/arca`;
      createSave?.addEventListener?.("click", async ()=>{
        try{
          const now = Date.now();
          const payload = {
            name: (createName?.value || arcaId).trim(),
            type: (createType?.value || "").trim(),
            location: (createLoc?.value || "").trim(),
            createdAt: now, updatedAt: now, items: {}
          };
          await set(ref(db, arcaBase), payload);
          showToast("Arca created");
          location.reload();
        }catch(e){ console.error(e); showToast("Error creating Arca", "error"); }
      });
      return;
    }

    // === ARCA path ===
    ROOT = {
      arcaBase: kind.arcaBase,
      itemsPath: kind.itemsPath,
      headerPath: kind.headerPath,
      storagePathFn: kind.storagePathFn
    };

    // Bind header
    onValue(ref(db, ROOT.headerPath), snap => {
      const node = snap.val() || {};
      if (arcaName) arcaName.textContent = node?.name || arcaId;
      const bits = [];
      if (node?.type) bits.push(node.type);
      if (node?.location) bits.push(node.location);
      if (arcaMeta) arcaMeta.textContent = bits.join(" • ");
      if (crumbs) crumbs.textContent = node?.name || arcaId;
    });

    // Bind items
    onValue(ref(db, ROOT.itemsPath), snap => {
      items = snap.val() || {};
      renderItems();
    });

    // UI handlers
    addItemBtn?.addEventListener?.("click", openNewItemModal);
    newItemCancel?.addEventListener?.("click", closeNewItemModal);
    newItemSave?.addEventListener?.("click", saveNewItem);
    modalCancel?.addEventListener?.("click", closePhotoModal);
    modalOk?.addEventListener?.("click", savePhotoNote);

    function renderItems(){
      if(!tilesEl) return;
      tilesEl.innerHTML = "";
      const entries = Object.entries(items);
      if(entries.length===0){
        tilesEl.innerHTML = `<div class="glass p-4 rounded-2xl text-sm text-slate-300">No items yet. Use “Add Item”.</div>`;
        return;
      }
      for(const [id,item] of entries){
        const imgUrl = (item.images && item.images[0]?.url) || "";
        const tile = document.createElement("div");
        tile.className = "tile glass rounded-2xl p-3 relative";
        tile.setAttribute("data-tile", id);
        tile.innerHTML = `
          <div class="w-full aspect-video rounded-xl bg-slate-800 overflow-hidden mb-2">
            ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-cover" alt="">`
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
        tile.querySelectorAll("button").forEach(b=>b?.addEventListener?.("click", onTileAction));
        tilesEl.appendChild(tile);
      }
    }

    async function adjustQty(itemId, delta){
      try{
        const qtyRef = ref(db, `${ROOT.itemsPath}/${itemId}/qty`);
        await runTransaction(qtyRef, cur => Math.max(0, (cur || 0) + delta));
        await update(ref(db, `${ROOT.itemsPath}/${itemId}`), { lastUpdated: Date.now() });
        showToast(delta>0?"+1":"−1"); flash(itemId);
      }catch(e){ console.error(e); showToast("Error updating qty","error"); }
    }
    function onTileAction(e){
      const id = e.currentTarget.dataset.id;
      const act = e.currentTarget.dataset.act;
      if (act==="minus") adjustQty(id,-1);
      if (act==="plus")  adjustQty(id,+1);
      if (act==="photo") openPhotoModal(id);
    }
    function flash(itemId){
      const tile = tilesEl?.querySelector?.(`[data-tile="${itemId}"]`);
      if (!tile) return;
      tile.classList.add("ring-2","ring-emerald-500");
      setTimeout(()=>tile.classList.remove("ring-2","ring-emerald-500"), 700);
    }

    // Photo / Note
    function openPhotoModal(itemId){
      if (!modal) return;
      modal.dataset.itemId = itemId;
      if (fileInput) fileInput.value = "";
      if (noteInput) noteInput.value = "";
      modal.classList.remove("hidden"); modal.classList.add("flex");
    }
    function closePhotoModal(){ modal?.classList.add("hidden"); modal?.classList.remove("flex"); }
    async function savePhotoNote(){
      const itemId = modal?.dataset?.itemId;
      if (!itemId) return closePhotoModal();
      const file = fileInput?.files?.[0] || null;
      const note = (noteInput?.value || "").trim();
      if (!file && !note) return closePhotoModal();
      try{
        const now = Date.now(); let uploaded=null;
        if (file){
          const safe = await downscale(file, 1200);
          const path = ROOT.storagePathFn(itemId, now, safe.name);
          const sr = sref(storage, path);
          await uploadBytes(sr, safe);
          const url = await getDownloadURL(sr);
          uploaded = { url, path, takenAt: now };
        }
        const itemRef = ref(db, `${ROOT.itemsPath}/${itemId}`);
        const snap = await get(itemRef);
        const item = snap.val() || {};
        const images = Array.isArray(item.images) ? item.images.slice() : [];
        const updates = { lastUpdated: now };
        if (uploaded){ images.unshift(uploaded); updates.images = images.slice(0,6); }
        if (note){ const prev = item.notes || ""; updates.notes = prev ? (prev+"\n"+note) : note; }
        await update(itemRef, updates);
        showToast("Saved");
      }catch(e){ console.error(e); showToast("Error saving","error"); }
      finally{ closePhotoModal(); }
    }

    // New item
    function openNewItemModal(){
      if (!newItemModal) return;
      newItemName.value = ""; newItemQty.value = "1"; newItemFile.value = ""; newItemNote.value = "";
      newItemModal.classList.remove("hidden"); newItemModal.classList.add("flex");
      setTimeout(()=>newItemName?.focus?.(), 30);
    }
    function closeNewItemModal(){ newItemModal?.classList.add("hidden"); newItemModal?.classList.remove("flex"); }
    newItemModal?.querySelectorAll?.("button[data-q]")?.forEach?.(btn=>{
      btn.addEventListener("click", ()=>{
        const add = parseInt(btn.getAttribute("data-q"),10)||0;
        const cur = parseInt(newItemQty.value||"0",10)||0;
        newItemQty.value = String(cur+add);
      });
    });
    async function saveNewItem(){
      const name = (newItemName.value||"").trim();
      const qty  = Math.max(0, parseInt(newItemQty.value||"0",10)||0);
      const file = newItemFile.files?.[0] || null;
      const note = (newItemNote.value||"").trim();
      if (!name){ showToast("Name is required","error"); return; }
      try{
        const now = Date.now();
        const newId = "item-" + crypto.randomUUID();
        let images = [];
        if (file){
          const safe = await downscale(file, 1200);
          const path = ROOT.storagePathFn(newId, now, safe.name);
          const sr = sref(storage, path);
          await uploadBytes(sr, safe);
          const url = await getDownloadURL(sr);
          images = [{ url, path, takenAt: now }];
        }
        await set(ref(db, `${ROOT.itemsPath}/${newId}`), {
          name, qty, images, notes: note || "", createdAt: now, lastUpdated: now
        });
        closeNewItemModal(); showToast("Item saved");
      }catch(e){ console.error(e); showToast("Error saving item","error"); }
    }
  });
});

// simple downscale helper (same as earlier)
async function downscale(file, maxDim=1200, mime="image/jpeg", quality=0.85){
  const img = await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.src=URL.createObjectURL(file); });
  const scale = Math.min(1, maxDim/Math.max(img.width,img.height));
  if (scale===1) return file;
  const c = document.createElement("canvas");
  c.width = Math.round(img.width*scale); c.height = Math.round(img.height*scale);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  const blob = await new Promise(res=>c.toBlob(res,mime,quality));
  return new File([blob], file.name.replace(/\.\w+$/,"")+".jpg", { type: mime });
}
