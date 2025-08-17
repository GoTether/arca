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

function arcaCard(arcaId, data){
  const name = data?.name || '(no name)';
  const loc  = data?.location || '';
  const desc = data?.description || '';
  return `
  <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">${name}</h3>
      <span class="text-xs text-slate-400">${arcaId}</span>
    </div>
    ${loc ? `<p class="text-sm text-slate-300 mt-1">Location: ${loc}</p>`:''}
    ${desc ? `<p class="text-sm text-slate-400 mt-1">${desc}</p>`:''}
  </div>`;
}

function renderArcasTree(tree){
  const container = byId('results');
  if (!tree || Object.keys(tree).length === 0){
    container.innerHTML = '<p class="text-slate-300">No arcas found at this path.</p>';
    return;
  }

  // If global: tree = { uid: { arcaId: {...} } }
  // If byUid:  tree = { arcaId: {...} }
  let html = '';
  if (state.mode === 'global'){
    for (const uid of Object.keys(tree)){
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

async function tryRead(){
  renderError(null);
  renderLoading(true);

  const useAnon = byId('anon').checked;
  if (useAnon){
    try {
      await ensureAnonSignIn(); // requires Anonymous sign-in enabled in Firebase Auth
    } catch (e){
      renderLoading(false);
      renderError('Anonymous sign-in failed. Enable it in Fire
