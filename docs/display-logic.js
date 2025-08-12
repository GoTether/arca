import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, get, set, update, onValue
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0",
  authDomain: "tether-71e0c.firebaseapp.com",
  databaseURL: "https://tether-71e0c-default-rtdb.firebaseio.com",
  projectId: "tether-71e0c",
  storageBucket: "tether-71e0c.appspot.com"
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

// Config
const STORAGE_ROOT = 'arca-dev';

const $ = sel => document.querySelector(sel);
const show = (el, on) => el.classList.toggle('hidden', !on);

// Params
const params = new URLSearchParams(location.search);
const arcaId = params.get('arcaId')?.trim();
if (!arcaId) {
  document.body.innerHTML = `<main class="max-w-md mx-auto p-6 text-sm">
    Missing <b>arcaId</b>. <a href="./index.html" class="underline underline-offset-4">Go back</a>.
  </main>`;
  throw new Error('Missing params');
}

// State
let arca = null;
let items = {};
let pending = new Map();     // itemId -> delta
let pendingMeta = new Map(); // itemId -> {file?, note?}
let currentItemForModal = null;

// DOM
const crumbs = $('#crumbs');
const arcaName = $('#arcaName');
const arcaMeta = $('#arcaMeta');
const tilesEl = $('#tiles');
const addItemBtn = $('#addItemBtn');
const saveBar = $('#saveBar');
const pendingCount = $('#pendingCount');
const toast = $('#toast');
const fileInput = $('#fileInput');
const noteInput = $('#noteInput');
const modal = $('#modal');
const modalOk = $('#modalOk');
const modalCancel = $('#modalCancel');

// Paths
const arcaRef  = ref(db, `arca/${arcaId}`);
const itemsRef = ref(db, `arca/${arcaId}/items`);

// Helpers
const fmtQty = q => (q ?? 0);
const updateSaveBar = () => {
  const n = pending.size + pendingMeta.size;
  pendingCount.textContent = n;
  show(saveBar, n > 0);
};
const showToast = (msg='Saved') => {
  toast.firstElementChild.textContent = msg;
  show(toast, true); setTimeout(()=>show(toast,false), 1200);
};

// Downscale images
async function downscale(file, maxDim=1200, mime='image/jpeg', quality=0.85){
  const img = await new Promise(res => { const i=new Image(); i.onload=()=>res(i); i.src=URL.createObjectURL(file); });
  const scale = Math.min(1, maxDim/Math.max(img.width,img.height));
  if(scale===1) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width*scale);
  canvas.height = Math.round(img.height*scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
  return new File([blob], file.name.replace(/\.\w+$/,'')+'.jpg', {type:mime});
}

// Load
onValue(arcaRef, snap => {
  arca = snap.val();
  if (!arca) {
    arcaName.textContent = arcaId;
    arcaMeta.textContent = 'Not found';
    return;
  }
  arcaName.textContent = arca.name || arcaId;
  const bits = [];
  if (arca.type) bits.push(arca.type);
  if (arca.location) bits.push(arca.location);
  arcaMeta.textContent = bits.join(' • ');
  crumbs.textContent = `${arca.name || arcaId}`;
});
onValue(itemsRef, snap => {
  items = snap.val() || {};
  renderItems();
});

// Render items
function renderItems(){
  tilesEl.innerHTML = '';
  const entries = Object.entries(items);
  if(entries.length===0){
    tilesEl.innerHTML = `<div class="glass p-4 rounded-2xl text-sm text-slate-300">No items yet. Use “Add Item”.</div>`;
    return;
  }
  for(const [id, item] of entries){
    const delta = pending.get(id) || 0;
    const qty = fmtQty(item.qty) + delta;
    const imgUrl = (item.images && item.images[0]?.url) || '';

    const tile = document.createElement('div');
    tile.className = 'tile glass rounded-2xl p-3';
    tile.innerHTML = `
      <div class="w-full aspect-video rounded-xl bg-slate-800 overflow-hidden mb-2">
        ${imgUrl ? `<img src="${imgUrl}" class="w-full h-full object-cover" alt="">` : `<div class="w-full h-full flex items-center justify-center text-xs text-slate-500">No Photo</div>`}
      </div>
      <div class="font-semibold">${item.name || 'Unnamed'}</div>
      <div class="text-xs text-slate-400">Qty: <span class="font-mono">${qty}</span>${delta?` <span class="text-emerald-400">${delta>0?`(+${delta})`: `(${delta})`}</span>`:''}</div>

      <div class="mt-3 grid grid-cols-3 gap-2">
        <button data-act="photo" data-id="${id}" class="rounded-xl bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm">Photo/Note</button>
        <button data-act="minus" data-id="${id}" class="rounded-xl bg-red-500/80 hover:bg-red-500 text-slate-900 font-semibold px-0 py-2 text-lg">−</button>
        <button data-act="plus"  data-id="${id}" class="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-900 font-semibold px-0 py-2 text-lg">+</button>
      </div>
    `;
    tile.querySelectorAll('button').forEach(b => b.addEventListener('click', onTileAction));
    tilesEl.appendChild(tile);
  }
}

// Actions
function bump(id, delta){
  const current = pending.get(id) || 0;
  pending.set(id, current + delta);
  if(pending.get(id)===0) pending.delete(id);
  updateSaveBar();
  renderItems();
}
function onTileAction(e){
  const id = e.currentTarget.dataset.id;
  const act = e.currentTarget.dataset.act;
  if(act==='minus') bump(id,-1);
  if(act==='plus')  bump(id, +1);
  if(act==='photo'){ openPhotoModal(id); }
}

// Modal
function openPhotoModal(itemId){
  currentItemForModal = itemId;
  fileInput.value = '';
  noteInput.value = '';
  show(modal, true);
  modal.classList.add('flex');
}
modalCancel.addEventListener('click', ()=> { modal.classList.remove('flex'); show(modal,false); });
modalOk.addEventListener('click', ()=>{
  const file = fileInput.files?.[0] || null;
  const note = noteInput.value.trim();
  if(!file && !note){ modal.classList.remove('flex'); show(modal,false); return; }
  pendingMeta.set(currentItemForModal, { file, note });
  modal.classList.remove('flex'); show(modal,false);
  updateSaveBar();
});

// Add item
addItemBtn.addEventListener('click', async ()=>{
  const name = prompt('Item name?');
  if(!name) return;
  const newId = 'item-' + crypto.randomUUID();
  await set(ref(db, `arca/${arcaId}/items/${newId}`), {
    name, qty: 0, images: [], notes: '', createdAt: Date.now(), lastUpdated: Date.now()
  });
  showToast('Item created');
});

// Save / Discard
$('#discardBtn').addEventListener('click', ()=>{
  pending.clear(); pendingMeta.clear(); updateSaveBar(); renderItems();
});
$('#saveBtn').addEventListener('click', saveAllChanges);

async function saveAllChanges(){
  if(pending.size===0 && pendingMeta.size===0) return;

  // Upload queued photos
  const uploads = [];
  for(const [itemId, meta] of pendingMeta.entries()){
    if(!meta.file) continue;
    const safe = await downscale(meta.file, 1200);
    const path = `${STORAGE_ROOT}/${arcaId}/${itemId}/${Date.now()}-${safe.name}`;
    const sr = sref(storage, path);
    uploads.push(
      uploadBytes(sr, safe).then(()=> getDownloadURL(sr)).then(url => ({itemId, url, path}))
    );
  }
  const uploaded = await Promise.all(uploads);

  // Build multipath update
  const updates = {};
  const now = Date.now();

  for(const [itemId, delta] of pending.entries()){
    const current = items[itemId]?.qty || 0;
    const next = Math.max(0, current + delta);
    updates[`arca/${arcaId}/items/${itemId}/qty`] = next;
    updates[`arca/${arcaId}/items/${itemId}/lastUpdated`] = now;
  }

  for(const [itemId, meta] of pendingMeta.entries()){
    const list = (items[itemId]?.images || []).slice();
    const up = uploaded.find(u => u.itemId===itemId);
    if(up){
      list.unshift({ url: up.url, path: up.path, takenAt: now });
      updates[`arca/${arcaId}/items/${itemId}/images`] = list.slice(0,6);
      updates[`arca/${arcaId}/items/${itemId}/lastUpdated`] = now;
    }
    if(meta.note){
      const prev = items[itemId]?.notes || '';
      updates[`arca/${arcaId}/items/${itemId}/notes`] = prev ? (prev + '\n' + meta.note) : meta.note;
      updates[`arca/${arcaId}/items/${itemId}/lastUpdated`] = now;
    }
  }

  await update(ref(db), updates);
  pending.clear(); pendingMeta.clear(); updateSaveBar(); showToast('Saved');
}
