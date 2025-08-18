// index.js
// Dashboard logic for Tethr Arca

import { db } from './shared.js';
import { ref, get, update } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { auth } from './shared.js';
import { resizeImage, showToast } from './utils.js';
import { initLogout } from './auth.js';

let currentUser = null;
let userArcas = {}; // cache of arcas the user can access

// Initialize dashboard once auth state is resolved
function initDashboard() {
  initLogout();
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // redirect to login if not signed in
      window.location.href = 'login.html';
      return;
    }
    currentUser = user;
    await loadArcas();
    setupSearchHandlers();
    setupBulkUpdate();
  });
}

// Fetch all arcas and filter by allowedUsers
async function loadArcas() {
  const arcaSnap = await get(ref(db, 'arcas'));
  userArcas = {};
  let totalItems = 0;
  if (arcaSnap.exists()) {
    const arcas = arcaSnap.val();
    for (const arcaId of Object.keys(arcas)) {
      const arca = arcas[arcaId];
      // Check if current user has access
      let allowed = false;
      if (arca.allowedUsers) {
        // allowedUsers may be array or object keys
        if (Array.isArray(arca.allowedUsers)) {
          allowed = arca.allowedUsers.includes(currentUser.uid);
        } else {
          allowed = Boolean(arca.allowedUsers[currentUser.uid]);
        }
      }
      if (allowed) {
        userArcas[arcaId] = arca;
        if (arca.items) {
          totalItems += Object.keys(arca.items).length;
        }
      }
    }
  }
  // Update metrics
  document.getElementById('totalArcas').textContent = Object.keys(userArcas).length;
  document.getElementById('totalItems').textContent = totalItems;
  // Populate lists and dropdowns
  renderArcaList();
  populateHashtagFilter();
}

// Render the list of arcas the user can access
function renderArcaList() {
  const list = document.getElementById('arcaList');
  list.innerHTML = '';
  for (const arcaId of Object.keys(userArcas)) {
    const arca = userArcas[arcaId];
    const itemCount = arca.items ? Object.keys(arca.items).length : 0;
    const container = document.createElement('div');
    container.className = 'bg-slate-800/70 p-3 rounded flex items-center gap-3';
    container.innerHTML = `
      <input type="checkbox" data-id="${arcaId}" class="form-checkbox h-4 w-4 text-indigo-600 rounded" />
      <div class="flex-1">
        <p class="font-semibold text-lg">${arca.name || arcaId}</p>
        <p class="text-sm text-slate-400">Location: ${arca.location || 'Unknown'} • ${itemCount} items</p>
      </div>
      <a href="view.html?id=${encodeURIComponent(arcaId)}" class="text-indigo-400 hover:underline text-sm">View</a>
    `;
    list.appendChild(container);
  }
}

// Populate hashtag dropdown with unique hashtags across all items
function populateHashtagFilter() {
  const dropdown = document.getElementById('hashtagFilter');
  const tags = new Set();
  Object.values(userArcas).forEach((arca) => {
    if (arca.items) {
      Object.values(arca.items).forEach((item) => {
        if (item.hashtags && Array.isArray(item.hashtags)) {
          item.hashtags.forEach((tag) => tags.add(tag));
        }
      });
    }
  });
  dropdown.innerHTML = '<option value="">-- Select a tag --</option>';
  Array.from(tags).sort().forEach((tag) => {
    const opt = document.createElement('option');
    opt.value = tag;
    opt.textContent = tag;
    dropdown.appendChild(opt);
  });
}

// Setup search handlers for item and arca search
function setupSearchHandlers() {
  const itemSearchInput = document.getElementById('itemSearch');
  const arcaSearchInput = document.getElementById('arcaSearch');
  const hashtagSelect = document.getElementById('hashtagFilter');
  itemSearchInput.addEventListener('input', () => {
    const query = itemSearchInput.value.trim().toLowerCase();
    const results = document.getElementById('itemResults');
    results.innerHTML = '';
    if (!query) return;
    for (const [arcaId, arca] of Object.entries(userArcas)) {
      if (arca.items) {
        Object.values(arca.items).forEach((item) => {
          if (item.name && item.name.toLowerCase().includes(query)) {
            const div = document.createElement('div');
            div.className = 'bg-slate-800/70 p-2 rounded flex justify-between items-center';
            div.innerHTML = `
              <span>${item.name} <span class="text-slate-400 text-xs">(${arca.name})</span></span>
              <a class="text-indigo-400 text-xs hover:underline" href="view.html?id=${encodeURIComponent(arcaId)}">Go</a>
            `;
            results.appendChild(div);
          }
        });
      }
    }
  });
  arcaSearchInput.addEventListener('input', () => {
    const query = arcaSearchInput.value.trim().toLowerCase();
    const results = document.getElementById('arcaResults');
    results.innerHTML = '';
    if (!query) return;
    Object.entries(userArcas).forEach(([arcaId, arca]) => {
      if (arca.name && arca.name.toLowerCase().includes(query)) {
        const div = document.createElement('div');
        div.className = 'bg-slate-800/70 p-2 rounded flex justify-between items-center';
        const itemCount = arca.items ? Object.keys(arca.items).length : 0;
        div.innerHTML = `
          <span>${arca.name} <span class="text-slate-400 text-xs">(${itemCount} items)</span></span>
          <a class="text-indigo-400 text-xs hover:underline" href="view.html?id=${encodeURIComponent(arcaId)}">Go</a>
        `;
        results.appendChild(div);
      }
    });
  });
  hashtagSelect.addEventListener('change', () => {
    const tag = hashtagSelect.value;
    const results = document.getElementById('hashtagResults');
    results.innerHTML = '';
    if (!tag) return;
    for (const [arcaId, arca] of Object.entries(userArcas)) {
      if (arca.items) {
        Object.values(arca.items).forEach((item) => {
          if (item.hashtags && item.hashtags.includes(tag)) {
            const div = document.createElement('div');
            div.className = 'bg-slate-800/70 p-2 rounded flex justify-between items-center';
            div.innerHTML = `
              <span>${item.name} <span class="text-slate-400 text-xs">(${arca.name})</span></span>
              <a class="text-indigo-400 text-xs hover:underline" href="view.html?id=${encodeURIComponent(arcaId)}">Go</a>
            `;
            results.appendChild(div);
          }
        });
      }
    }
  });
}

// Bulk update location for selected arcas
function setupBulkUpdate() {
  const btn = document.getElementById('bulkUpdateBtn');
  btn.addEventListener('click', async () => {
    const newLoc = document.getElementById('bulkLocation').value.trim();
    if (!newLoc) {
      showToast('Please enter a new location');
      return;
    }
    const checkboxes = document.querySelectorAll('#arcaList input[type="checkbox"]:checked');
    if (checkboxes.length === 0) {
      showToast('Select at least one Arca');
      return;
    }
    const updates = {};
    checkboxes.forEach((cb) => {
      const arcaId = cb.getAttribute('data-id');
      updates[`arcas/${arcaId}/location`] = newLoc;
    });
    try {
      await update(ref(db), updates);
      showToast('Locations updated');
      document.getElementById('bulkLocation').value = '';
      await loadArcas();
    } catch (err) {
      console.error(err);
      showToast('Failed to update locations');
    }
  });
}

// Kick off dashboard
initDashboard();
