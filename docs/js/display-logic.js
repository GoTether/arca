// Pure JS module. No HTML here.
// Minimal functionality: read ?id=, auto-create Arca if new, edit fields, store in localStorage.

const $ = (s, r=document) => r.querySelector(s);
const app = $('#app');

// Parse and normalize ID
const params = new URLSearchParams(location.search);
let id = (params.get('id') || '').trim();
if (!id) {
  location.replace('index.html');
} else {
  id = normalizeId(id);
  if (id !== (params.get('id') || '')) {
    history.replaceState(null, '', `?id=${encodeURIComponent(id)}`);
  }
  const pill = $('#arca-id-pill');
  if (pill) pill.textContent = id;

  let arca = getArca(id);
  if (!arca) {
    arca = createArca({ id, name: id, description: '', location: '' });
    console.info(`Created new Arca "${id}".`);
  }
  render(arca);
}

function render(arca) {
  app.innerHTML = `
    <section class="card">
      <h1>${esc(arca.name)}</h1>

      <div class="row">
        <strong>Description</strong>
        <div id="desc-val">${arca.description ? esc(arca.description) : '<span class="muted">None</span>'}</div>
        <button id="edit-desc" class="btn">Edit</button>
      </div>

      <div class="row">
        <strong>Location</strong>
        <div id="loc-val">${arca.location ? esc(arca.location) : '<span class="muted">None</span>'}</div>
        <button id="edit-loc" class="btn">Edit</button>
      </div>

      <hr />

      <h2>Items</h2>
      <p class="muted">Items UI coming next.</p>
    </section>
  `;

  $('#edit-desc')?.addEventListener('click', () => {
    const next = prompt('Edit description:', arca.description || '') ?? null;
    if (next === null) return;
    arca.description = next.trim();
    saveArca(arca);
    $('#desc-val').innerHTML = arca.description ? esc(arca.description) : '<span class="muted">None</span>';
  });

  $('#edit-loc')?.addEventListener('click', () => {
    const next = prompt('Edit location:', arca.location || '') ?? null;
    if (next === null) return;
    arca.location = next.trim();
    saveArca(arca);
    $('#loc-val').innerHTML = arca.location ? esc(arca.location) : '<span class="muted">None</span>';
  });
}

/* Storage helpers (localStorage) */
function idxKey(){ return 'arcaIndex'; }
function arcaKey(id){ return `arca:${id}`; }

function listIds(){
  try { return JSON.parse(localStorage.getItem(idxKey()) || '[]'); }
  catch { return []; }
}
function setIndex(ids){
  localStorage.setItem(idxKey(), JSON.stringify(ids));
}
function getArca(id){
  const raw = localStorage.getItem(arcaKey(id));
  return raw ? JSON.parse(raw) : null;
}
function createArca({ id, name, description, location }){
  const now = new Date().toISOString();
  const a = { id, name, description, location, items: [], createdAt: now, updatedAt: now };
  localStorage.setItem(arcaKey(id), JSON.stringify(a));
  const ids = listIds();
  if (!ids.includes(id)) { ids.push(id); setIndex(ids); }
  return a;
}
function saveArca(a){
  a.updatedAt = new Date().toISOString();
  localStorage.setItem(arcaKey(a.id), JSON.stringify(a));
  const ids = listIds();
  if (!ids.includes(a.id)) { ids.push(a.id); setIndex(ids); }
}

/* Utilities */
function normalizeId(raw){
  return String(raw).trim().replace(/\s+/g,'-').replace(/-+/g,'-').toLowerCase();
}
function esc(s){ const d=document.createElement('div'); d.textContent = s; return d.innerHTML; }
