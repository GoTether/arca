// /js/test-browse.js — Explore any Realtime Database path
import { db, ensureAnonSignIn } from './firebase-init.js';
import { ref, child, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const byId = (id) => document.getElementById(id);

function setLoading(show) {
  byId('loading').classList.toggle('hidden', !show);
  byId('json').classList.toggle('hidden', show);
}

function setError(err) {
  const box = byId('errorBox');
  if (!err) {
    box.classList.add('hidden');
    box.textContent = '';
    return;
  }
  box.textContent = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  box.classList.remove('hidden');
}

async function readPath() {
  setError(null);
  setLoading(true);

  const useAnon = byId('anon').checked;
  if (useAnon) {
    try {
      await ensureAnonSignIn();
    } catch (e) {
      setLoading(false);
      setError('Anonymous sign-in failed. Enable it in Firebase Auth > Sign-in method.');
      return;
    }
  }

  // Normalize path (ensure it doesn't double-slash)
  let path = (byId('path').value || '/').trim();
  if (!path.startsWith('/')) path = '/' + path;
  if (path !== '/' && path.endsWith('/')) path = path.slice(0, -1);

  try {
    const snap = await get(child(ref(db), path.slice(1))); // child() expects no leading slash
    setLoading(false);
    const out = snap.exists() ? snap.val() : {};
    byId('json').textContent = JSON.stringify(out, null, 2);
    byId('json').classList.remove('hidden');
  } catch (e) {
    setLoading(false);
    console.error(e);
    const code = e?.code || '';
    if (typeof code === 'string' && code.indexOf('permission_denied') !== -1) {
      setError('permission_denied: Rules blocked this read. Enable Anonymous auth and check the box, or temporarily relax rules for testing.');
    } else {
      setError(e);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  byId('read').addEventListener('click', readPath);
  byId('path').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') readPath();
  });
  // auto-try once on load
  readPath();
});
