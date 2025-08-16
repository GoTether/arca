// Dashboard logic: unknown id -> setup; known id -> existing view.
// "Enter to save" is explicit and supported by default submit + a keydown helper.

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
  return raw ? JSON.parse(raw) : null;
}
async function createArca(id, data) {
  localStorage.setItem(KEY(id), JSON.stringify({ id, ...data }));
  return { id, ...data };
}
async function updateArca(id, patch) {
  const current = await getArcaById(id);
  if (!current) throw new Error('Arca not found during update');
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY(id), JSON.stringify(next));
  return next;
}

// UI refs
const viewExisting = document.getElementById('view-existing');
const viewSetup = document.getElementById('view-setup');
const statusPill = document.getElementById('status-pill');

const arcaNameEl = document.getElementById('arca-name');
const arcaDescEl = document.getElementById('arca-description');
const arcaGalleryEl = document.getElementById('arca-gallery');

const addPhotosBtn = document.getElementById('add-photos-btn');
const renameBtn = document.getElementById('rename-btn');
const addPhotosInput = document.getElementById('add-photos-input');

const setupForm = document.getElementById('setup-form');
const setupName = document.getElementById('setup-name');
const setupDesc = document.getElementById('setup-description');
const setupPhotos = document.getElementById('setup-photos');

// Render helpers
function renderExisting(arca) {
  viewSetup.hidden = true;
  viewExisting.hidden = false;
  statusPill.textContent = 'Active';
  arcaNameEl.textContent = arca.name || arca.id;
  arcaDescEl.textContent = arca.description || '';
  arcaGalleryEl.innerHTML = '';
  (arca.photos || []).forEach((src) => {
    const img = new Image();
    img.src = src;
    arcaGalleryEl.appendChild(img);
  });
}
function renderSetup() {
  viewExisting.hidden = true;
  viewSetup.hidden = false;
  statusPill.textContent = 'New';
  setupName.value = arcaId || 'Arca1';
  setTimeout(() => setupName.focus(), 0);
}

// Helpers
async function readFilesAsDataURLs(fileList) {
  const files = Array.from(fileList || []);
  const results = [];
  for (const f of files) {
    // Skip zero-sized files
    if (f.size === 0) continue;
    results.push(await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(f);
    }));
  }
  return results;
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
  const photos = await readFilesAsDataURLs(setupPhotos.files);
  const arca = await createArca(arcaId, {
    name,
    description: setupDesc.value.trim(),
    photos,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  currentArca = arca;
  toast('Saved');
  renderExisting(arca);
});

// Explicit "Enter to save" helper on the whole setup form
setupForm?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && !e.shiftKey)) {
    // Allow Shift+Enter to break line in textarea
    e.preventDefault();
    setupForm.requestSubmit ? setupForm.requestSubmit() : setupForm.submit();
  }
});

// Existing view actions
renameBtn?.addEventListener('click', async () => {
  const newName = prompt('New name', currentArca?.name || '');
  if (!newName) return;
  currentArca = await updateArca(arcaId, { name: newName.trim() });
  toast('Renamed');
  renderExisting(currentArca);
});

addPhotosBtn?.addEventListener('click', () => addPhotosInput.click());
addPhotosInput?.addEventListener('change', async () => {
  const newPhotos = await readFilesAsDataURLs(addPhotosInput.files);
  const photos = [...(currentArca.photos || []), ...newPhotos];
  currentArca = await updateArca(arcaId, { photos });
  toast('Photos added');
  renderExisting(currentArca);
});
