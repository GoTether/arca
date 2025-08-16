// Dashboard logic — single photo + clear location field and editor.

const toastEl = document.getElementById('toast');
function toast(msg, ms = 2000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = 'block';
  setTimeout(() => (toastEl.style.display = 'none'), ms);
}

// Parse ID (required)
const params = new URLSearchParams(location.search);
const arcaId = (params.get('id') || '').trim();
if (!arcaId) location.replace('index.html');

// Header
document.getElementById('header-id').textContent = arcaId ? `ID: ${arcaId}` : 'No ID';
const statusPill = document.getElementById('status-pill');

// Storage (demo) — swap with your backend later
const KEY = (id) => `arca:${id}`;
async function getArcaById(id) {
  const raw = localStorage.getItem(KEY(id));
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // Migrate old photos[] -> photo
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
  if ('photos' in next) delete next.photos; // enforce single-photo model
  localStorage.setItem(KEY(id), JSON.stringify(next));
  return next;
}

// Elements
const viewExisting = document.getElementById('view-existing');
const viewSetup = document.getElementById('view-setup');

const arcaNameEl = document.getElementById('arca-name');
const arcaDescEl = document.getElementById('arca-description');
const arcaLocationEl = document.getElementById('arca-location');

const arcaPhotoEl = document.getElementById('arca-photo');
const photoPlaceholderEl = document.getElementById('photo-placeholder');
const photoBtn = document.getElementById('photo-btn');
const photoInput = document.getElementById('photo-input');

const setupForm = document.getElementById('setup-form');
const setupName = document.getElementById('setup-name');
const setupDesc = document.getElementById('setup-description');
const setupLocation = document.getElementById('setup-location');
const setupPhoto = document.getElementById('setup-photo');

const renameBtn = document.getElementById('rename-btn');
const locationBtn = document.getElementById('location-btn');

// Render
function renderExisting(arca) {
  viewSetup.hidden = true;
  viewExisting.hidden = false;
  statusPill.textContent = 'Active';

  arcaNameEl.textContent = arca.name || arca.id;
  arcaDescEl.textContent = arca.description || '';

  const loc = (arca.location || '').trim();
  arcaLocationEl.textContent = loc || 'Not set';

  const hasPhoto = Boolean(arca.photo);
  if (hasPhoto) {
    arcaPhotoEl.src = arca.photo;
    arcaPhotoEl.hidden = false;
    photoPlaceholderEl.style.display = 'none';
  } else {
    arcaPhotoEl.hidden = true;
    arcaPhotoEl.removeAttribute('src');
    photoPlaceholderEl.style.display = 'flex';
  }
  photoBtn.textContent = hasPhoto ? 'Change photo' : 'Add photo';
}

function renderSetup() {
  viewExisting.hidden = true;
  viewSetup.hidden = false;
  statusPill.textContent = 'New';
  setupName.value = arcaId || 'Arca1';
  setTimeout(() => setupName.focus(), 0);
}

// File reader
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
  try {
    currentArca = await getArcaById(arcaId);
    if (currentArca) renderExisting(currentArca);
    else renderSetup();
  } catch (err) {
    console.error(err);
    toast('Error loading Arca');
  }
})();

// Setup submit (Enter to save; textarea allows Shift+Enter for newline)
setupForm?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && !e.shiftKey)) {
    e.preventDefault();
    setupForm.requestSubmit ? setupForm.requestSubmit() : setupForm.submit();
  }
});
setupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = (setupName?.value || '').trim();
  if (!name) { setupName?.focus(); return toast('Name is required'); }

  const photo = await readOneFileAsDataURL(setupPhoto?.files?.[0]);
  const locationVal = (setupLocation?.value || '').trim();

  try {
    const arca = await createArca(arcaId, {
      name,
      description: (setupDesc?.value || '').trim(),
      location: locationVal || null,
      photo: photo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    currentArca = arca;
    toast('Saved');
    renderExisting(arca);
  } catch (err) {
    console.error(err);
    toast('Could not save');
  }
});

// Photo button
photoBtn?.addEventListener('click', () => photoInput?.click());
photoInput?.addEventListener('change', async () => {
  const newPhoto = await readOneFileAsDataURL(photoInput.files?.[0]);
  photoInput.value = ''; // allow choosing the same file again later
  if (!newPhoto) return;
  try {
    currentArca = await updateArca(arcaId, { photo: newPhoto });
    toast('Photo updated');
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast('Could not update photo');
  }
});

// Rename
renameBtn?.addEventListener('click', async () => {
  const newName = prompt('New name', currentArca?.name || '');
  if (newName === null) return; // cancel
  try {
    currentArca = await updateArca(arcaId, { name: newName.trim() });
    toast('Renamed');
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast('Could not rename');
  }
});

// Edit location
locationBtn?.addEventListener('click', async () => {
  const newLoc = prompt('Location', currentArca?.location || '');
  if (newLoc === null) return; // cancel
  try {
    const trimmed = newLoc.trim();
    currentArca = await updateArca(arcaId, { location: trimmed || null });
    toast(trimmed ? 'Location updated' : 'Location cleared');
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast('Could not update location');
  }
});
