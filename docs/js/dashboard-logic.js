// Dashboard logic updated for a single photo per Arca.
// Data model: arca.photo (string | null). Old items with photos[] are migrated to .photo (first photo).

const toastEl = document.getElementById('toast');
function toast(msg, ms = 2000) {
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => (toastEl.style.display = 'none'), ms);
}

// Parse ID
const params = new URLSearchParams(window.location.search);
const arcaId = (params.get('id') || '').trim();
if (!arcaId) window.location.replace('index.html');

document.getElementById('header-id').textContent = arcaId ? `ID: ${arcaId}` : 'No ID';

// Storage (demo) — replace with your backend
const KEY = (id) => `arca:${id}`;
async function getArcaById(id) {
  const raw = localStorage.getItem(KEY(id));
  if (!raw) return null;
  const parsed = JSON.parse(raw);

  // Migration: photos[] -> photo
  if (!parsed.photo && Array.isArray(parsed.photos) && parsed.photos.length > 0) {
    parsed.photo = parsed.photos[0];
    delete parsed.photos;
    localStorage.setItem(KEY(id), JSON.stringify(parsed));
  }
  return parsed;
}
async function createArca(id, data) {
  localStorage.setItem(KEY(id), JSON.stringify({ id, ...data }));
  return { id, ...data };
}
async function updateArca(id, patch) {
  const current = await getArcaById(id);
  if (!current) throw new Error('Arca not found during update');
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  // Ensure we never persist a photos[] array going forward
  if ('photos' in next) delete next.photos;
  localStorage.setItem(KEY(id), JSON.stringify(next));
  return next;
}

// UI refs
const viewExisting = document.getElementById('view-existing');
const viewSetup = document.getElementById('view-setup');
const statusPill = document.getElementById('status-pill');

const arcaNameEl = document.getElementById('arca-name');
const arcaDescEl = document.getElementById('arca-description');

const arcaPhotoEl = document.getElementById('arca-photo');
const photoPlaceholderEl = document.getElementById('photo-placeholder');
const photoBtn = document.getElementById('photo-btn');
const photoInput = document.getElementById('photo-input');

const setupForm = document.getElementById('setup-form');
const setupName = document.getElementById('setup-name');
const setupDesc = document.getElementById('setup-description');
const setupPhoto = document.getElementById('setup-photo');

// Render helpers
function renderExisting(arca) {
  viewSetup.hidden = true;
  viewExisting.hidden = false;
  statusPill.textContent = 'Active';

  arcaNameEl.textContent = arca.name || arca.id;
  arcaDescEl.textContent = arca.description || '';

  if (arca.photo) {
    arcaPhotoEl.src = arca.photo;
    arcaPhotoEl.hidden = false;
    photoPlaceholderEl.style.display = 'none';
    photoBtn.textContent = 'Change photo';
  } else {
    arcaPhotoEl.hidden = true;
    arcaPhotoEl.removeAttribute('src');
    photoPlaceholderEl.style.display = 'flex';
    photoBtn.textContent = 'Add photo';
  }
}

function renderSetup() {
  viewExisting.hidden = true;
  viewSetup.hidden = false;
  statusPill.textContent = 'New';
  setupName.value = arcaId || 'Arca1';
  setTimeout(() => setupName.focus(), 0);
}

// File helpers
async function readOneFileAsDataURL(file) {
  if (!file || file.size === 0) return null;
  return await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

// Init
let currentArca = null;
(async function init() {
  currentArca = await getArcaById(arcaId);
  if (currentArca) renderExisting(currentArca);
  else renderSetup();
})();

// Setup -> save
setupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = setupName.value.trim();
  if (!name) { setupName.focus(); return toast('Name is required'); }

  const photo = await readOneFileAsDataURL(setupPhoto.files?.[0]);
  const arca = await createArca(arcaId, {
    name,
    description: setupDesc.value.trim(),
    photo: photo || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  currentArca = arca;
  toast('Saved');
  renderExisting(arca);
});

// Photo change (existing view)
photoBtn?.addEventListener('click', () => photoInput.click());

photoInput?.addEventListener('change', async () => {
  const newPhoto = await readOneFileAsDataURL(photoInput.files?.[0]);
  if (!newPhoto) return;
  currentArca = await updateArca(arcaId, { photo: newPhoto });
  toast(currentArca.photo ? 'Photo updated' : 'Photo added');
  renderExisting(currentArca);
});

// Rename
const renameBtn = document.getElementById('rename-btn');
renameBtn?.addEventListener('click', async () => {
  const newName = prompt('New name', currentArca?.name || '');
  if (!newName) return;
  currentArca = await updateArca(arcaId, { name: newName.trim() });
  toast('Renamed');
  renderExisting(currentArca);
});
