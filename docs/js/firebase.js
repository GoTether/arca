// Firebase initialization + CRUD helpers for Arca using Realtime Database and Storage.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, get, set, update, child, remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getStorage, ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Force default bucket (gs://<projectId>.appspot.com) to avoid config mismatches
const storage = getStorage(app, `gs://${app.options.projectId}.appspot.com`);

const BASE = "arca";
const arcaPath = (id) => `${BASE}/${id}`;

function genItemId() {
  return `item-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function itemsMapToArray(itemsMap) {
  if (!itemsMap || typeof itemsMap !== "object") return [];
  const arr = Object.entries(itemsMap).map(([key, obj]) => ({
    id: obj?.id || key,
    name: obj?.name || "",
    qty: typeof obj?.qty === "number" ? obj.qty : (Number.isFinite(Number(obj?.qty)) ? Number(obj.qty) : null),
    notes: obj?.notes || obj?.note || "",
    images: obj?.images || null,
    createdAt: obj?.createdAt || 0,
    lastUpdated: obj?.lastUpdated || obj?.updatedAt || 0,
    archived: !!obj?.archived,
    archivedAt: obj?.archivedAt || null
  }));
  // Hide archived by default
  const visible = arr.filter((i) => !i.archived);
  visible.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return visible;
}

export async function getArcaById(id) {
  const snap = await get(ref(db, arcaPath(id)));
  if (!snap.exists()) return null;
  const data = snap.val() || {};
  const items = itemsMapToArray(data.items);
  return {
    id,
    name: data.name || id,
    notes: data.notes || data.description || "",
    location: data.location || "",
    photo: data.photo || data.photoUrl || null,
    createdAt: data.createdAt || 0,
    lastUpdated: data.lastUpdated || data.updatedAt || 0,
    items
  };
}

export async function createArca(id, data) {
  const now = Date.now();
  const payload = {
    id,
    name: data.name || id,
    notes: data.notes || null, // you store "notes", not "description"
    location: data.location || null,
    photo: data.photo || null, // arca-level photo URL (Storage)
    createdAt: now,
    lastUpdated: now,
    items: null
  };
  await set(ref(db, arcaPath(id)), payload);
  return getArcaById(id);
}

export async function updateArca(id, patch) {
  const now = Date.now();
  // Map "description" -> "notes" if someone passes description by mistake
  const normalized = { ...patch };
  if (Object.prototype.hasOwnProperty.call(patch, "description")) {
    normalized.notes = patch.description;
    delete normalized.description;
  }
  await update(ref(db, arcaPath(id)), { ...normalized, lastUpdated: now });
  return getArcaById(id);
}

export async function addItem(arcaId, data) {
  const now = Date.now();
  const itemId = genItemId();
  const item = {
    id: itemId,
    name: data.name,
    qty: Number.isFinite(data.qty) ? data.qty : null,
    notes: data.notes || null,
    createdAt: now,
    lastUpdated: now
  };
  await set(ref(db, `${arcaPath(arcaId)}/items/${itemId}`), item);
  return item;
}

export async function archiveItem(arcaId, itemId) {
  const now = Date.now();
  await update(ref(db, `${arcaPath(arcaId)}/items/${itemId}`), {
    archived: true,
    archivedAt: now,
    lastUpdated: now
  });
}

export async function uploadArcaPhoto(arcaId, file) {
  if (!file) return null;
  const path = `arca/${arcaId}/cover_${Date.now()}`;
  const objectRef = sRef(storage, path);
  const metadata = file.type ? { contentType: file.type } : undefined;
  await uploadBytes(objectRef, file, metadata);
  return await getDownloadURL(objectRef);
}
