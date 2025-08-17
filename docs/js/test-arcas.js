// /js/test-arcas.js – read & render /arcas (or /arcas/{uid})
import { db, ensureAnonSignIn } from './firebase-init.js';
import { ref, onValue, get, child } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { byId } from './utils.js';

const state = {
  mode: 'global', // 'global' | 'byUid'
  uid: null,
};

function renderLoading(show) {
  byId('loading').classList.toggle('hidden', !show);
  byId('results').classList.toggle('hidden', show);
}

function renderError(err) {
  const box = byId('errorBox');
  if (!err) { box.classList.add('hidden'); box.textContent = ''; return; }
  box.textContent = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  box.classList.remove('hidden');
}

function arcaCard(arcaId, data) {
  const name = data && data.name ? data.name : '(no name)';
  const loc  = data && data.location ? data.location : '';
  const desc = data && data.description ? data.description : '';

  return `
  <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">${name}</h3>
      <span class="text-xs text-slate-400">${arcaId}</span>
    </div>
    ${loc ? `<p class="text-sm text-slate-300 mt-1">Location: ${loc}</p>` : ''}
    ${desc ? `<p class="text-sm text-slate-400 mt-1">${desc}</p>` : ''}
  </div>`;
}

function renderArcasTree(tree) {
  const container = byId('results');
  if (!tree || Object.keys(tree).length === 0) {
    container.innerHTML = '<p class="text-slate-300">No arcas found at this path.</p>';
    return;
  }

  // If global: tree = { uid: { arcaId: {...} } }
  // If byUid:  tree = { arcaId: {...} }
  let html = '';
  if (state.mode === 'global') {
    for (const uid of Object.keys(tree)) {
      const list = tree[uid] || {};
      const cards = Object.keys(list).map(id => arcaCard(id, list[id])).join('');
      html += `
        <section class="space-y-3">
          <h2 class="text-base text-slate-400">UID: ${uid}</h2>
          <div class="grid gap-3 md:grid-cols-2">${cards || '<div class="text-slate-400">(none)</div>'}</div>
        </section>`;
    }
  } else {
    const cards = Object.keys(tree).map(id => arcaCard(id, tree[id])).join('');
    html = `<div class="grid gap-3 md:grid-cols-2">${cards || '<div class="text-slate-400">(none)</div>'}</div>`;
  }
  container.innerHTML = html;
}

async function tryRead() {
  renderError(null);
  renderLoading(true);

  // Optional: Anonymous auth if your rules require auth != null
  const useAnon = byId('anon') && byId('anon').checked;
  if (useAnon) {
    try {
      await ensureAnonSignIn();
    } catch (e) {
      renderLoading(false);
      renderError('Anonymous sign-in failed. Enable it in Firebase Auth > Sign-in method.');
      return;
    }
  }

  const uidInput = byId('uidInput');
  const uidInputVal = uidInput ? uidInput.value.trim() : '';
  state.mode = uidInputVal ? 'byUid' : 'global';
  state.uid  = uidInputVal || null;

  const baseRef = ref(db);
  const path = state.mode === 'global' ? 'arcas' : `arcas/${state.uid}`;

  try {
    // One-time fetch first
    const snap = await get(child(baseRef, path));
    renderLoading(false);
    if (snap.exists()) {
      renderArcasTree(snap.val());
    } else {
      renderArcasTree({});
    }

    // Live updates
    onValue(child(baseRef, path), (s) => {
      renderArcasTree(s.val() || {});
    });
  } catch (e) {
    renderLoading(false);
    console.error(e);
    const code = e && e.code ? e.code : '';
    if (typeof code === 'string' && code.indexOf('permission_denied') !== -1) {
      renderError('permission_denied: Your database rules prevented reading this path. Enable Anonymous auth and tick the checkbox, or use a specific UID allowed by your rules.');
    } else {
      renderError(e);
    }
  }
}

// UI init
window.addEventListener('DOMContentLoaded', () => {
  const goBtn = byId('go');
  if (goBtn) goBtn.addEventListener('click', tryRead);

  const uidInput = byId('uidInput');
  if (uidInput) {
    uidInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryRead();
    });
  }

  // Initial attempt
  tryRead();
});
