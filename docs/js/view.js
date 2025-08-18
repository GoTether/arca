import { db, auth, storage, getUser } from './shared.js';
import { ref, get, set, remove } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

// DOM elements
const arcaImageEl = document.getElementById('arcaImage');
const arcaNameEl = document.getElementById('arcaName');
const arcaTypeEl = document.getElementById('arcaType');
const arcaLocationEl = document.getElementById('arcaLocation');
const arcaNoteEl = document.getElementById('arcaNote');
const arcaIdDisplayEl = document.getElementById('arcaIdDisplay');
const arcaDetailsSection = document.getElementById('arcaDetails');
const itemsSection = document.getElementById('itemsSection');
const itemsList = document.getElementById('itemsList');
const arcaTotalItemsEl = document.getElementById('arcaTotalItems');
const addItemBtn = document.getElementById('addItemBtn');
const editArcaBtn = document.getElementById('editArcaBtn');
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const formItemName = document.getElementById('formItemName');
const formItemNote = document.getElementById('formItemNote');
const formItemHashtags = document.getElementById('formItemHashtags');
const formItemImage = document.getElementById('formItemImage');
const closeItemModalBtn = document.getElementById('closeItemModal');
const dashboardBtn = document.getElementById('dashboardBtn');
const toastEl = document.getElementById('toast');
const idPrompt = document.getElementById('idPrompt');
const enterArcaId = document.getElementById('enterArcaId');
const goToArcaBtn = document.getElementById('goToArcaBtn');
const userInfoEl = document.getElementById('userInfo');
const accessDeniedEl = document.getElementById('accessDenied');

// State
let currentArca = null;
let arcaId = null;
let user = null;

// Utility: Show toast
function showToast(msg, warn = false) {
  toastEl.textContent = msg;
  toastEl.style.background = warn ? "#ff4b4b" : "#333b";
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1500 + Math.max(0, msg.length * 25));
}

// Read Arca ID from URL
function getArcaIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Auth & user info
async function initAuth() {
  user = await getUser();
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  userInfoEl.textContent = user.email || '';
}

// Show Arca details section
function showArcaDetails() {
  arcaDetailsSection.classList.remove('hidden');
  itemsSection.classList.remove('hidden');
}

// Hide All Main Sections
function hideAllSections() {
  arcaDetailsSection.classList.add('hidden');
  itemsSection.classList.add('hidden');
  accessDeniedEl.classList.add('hidden');
  idPrompt.classList.add('hidden');
}

// Show Access Denied
function showAccessDenied() {
  hideAllSections();
  accessDeniedEl.classList.remove('hidden');
}

// Show ID Prompt
function showIdPrompt() {
  hideAllSections();
  idPrompt.classList.remove('hidden');
}

// Fetch Arca details from Firebase
async function loadArcaData() {
  if (!arcaId) {
    showIdPrompt();
    return;
  }
  hideAllSections();
  const arcaRef = ref(db, 'arca/' + arcaId);
  const arcaSnap = await get(arcaRef);
  if (!arcaSnap.exists()) {
    showToast("Arca not found", true);
    showAccessDenied();
    return;
  }
  currentArca = arcaSnap.val();
  // Permissions: check if user can view
  if (!currentArca.users || !currentArca.users[user.uid]) {
    showAccessDenied();
    return;
  }
  renderArca();
}

// Render Arca details
function renderArca() {
  showArcaDetails();
  // Image
  if (currentArca.image) {
    arcaImageEl.src = currentArca.image;
    arcaImageEl.classList.remove('hidden');
  } else {
    arcaImageEl.classList.add('hidden');
  }
  arcaNameEl.textContent = currentArca.name || '';
  arcaTypeEl.textContent = currentArca.type || '';
  arcaLocationEl.textContent = currentArca.location || '';
  arcaNoteEl.textContent = currentArca.note || '';
  arcaIdDisplayEl.textContent = arcaId || '';
  renderItems();
  updateTotalItemsDisplay();
}

// Render item tiles
function renderItems() {
  itemsList.innerHTML = '';
  if (!currentArca.items) return;
  Object.entries(currentArca.items).forEach(([itemId, item]) => {
    const div = document.createElement('div');
    div.className = 'chunky-item-tile';
    div.innerHTML = `
      ${item.image ? `<img src="${item.image}" class="chunky-item-img" />` : ''}
      <div class="chunky-item-name">${item.name}</div>
      <div class="chunky-item-note">${item.note || ''}</div>
      <div class="chunky-item-hashtags">${(item.hashtags||[]).map(t => `<span>#${t}</span>`).join(' ')}</div>
      <div class="chunky-quantity-controls">
        <button class="chunky-qty-btn minus" data-action="decr" data-id="${itemId}" title="Decrease quantity">−</button>
        <span class="chunky-quantity-value" id="qty-${itemId}">${item.quantity}</span>
        <button class="chunky-qty-btn plus" data-action="incr" data-id="${itemId}" title="Increase quantity">+</button>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-id="${itemId}" title="Edit">✏️</button>
        <button data-action="delete" data-id="${itemId}" title="Delete">🗑️</button>
      </div>
    `;
    itemsList.appendChild(div);
  });

  // Quantity handlers
  itemsList.querySelectorAll('button[data-action="decr"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, -1);
  });
  itemsList.querySelectorAll('button[data-action="incr"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, 1);
  });
  // Edit/delete handlers
  itemsList.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => openItemModal(true, id);
  });
  itemsList.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => deleteItem(id);
  });
}

// Update N Items badge
function updateTotalItemsDisplay() {
  const totalQty = Object.values(currentArca.items || {}).reduce(
    (sum, item) => sum + (typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1),
    0
  );
  arcaTotalItemsEl.textContent = `${totalQty} Items`;
  arcaTotalItemsEl.classList.toggle('hidden', totalQty === 0);
}

// Add Item Modal
addItemBtn.onclick = () => {
  itemModal.classList.remove('hidden');
  itemForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemModalTitle').textContent = 'Add Item';
};
closeItemModalBtn.onclick = () => {
  itemModal.classList.add('hidden');
};

// Item form submit (add/edit)
itemForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = formItemName.value.trim();
  if (!name) return;
  const newId = document.getElementById('itemId').value || 'item' + Math.random().toString(36).slice(2, 8);
  const itemObj = {
    name,
    note: formItemNote.value.trim(),
    hashtags: formItemHashtags.value.trim().split(',').map(t => t.trim()).filter(Boolean),
    image: '', // TODO: upload logic
    quantity: 1,
  };
  await set(ref(db, `arca/${arcaId}/items/${newId}`), itemObj);
  itemModal.classList.add('hidden');
  await loadArcaData();
};

function openItemModal(isEdit, itemId) {
  itemModal.classList.remove('hidden');
  if (isEdit) {
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = itemId;
    const item = currentArca.items[itemId];
    formItemName.value = item.name || '';
    formItemNote.value = item.note || '';
    formItemHashtags.value = item.hashtags ? item.hashtags.join(', ') : '';
    formItemImage.value = '';
  } else {
    itemForm.reset();
    document.getElementById('itemModalTitle').textContent = 'Add Item';
    document.getElementById('itemId').value = '';
  }
}

// Quantity controls
async function adjustItemQuantity(itemId, delta) {
  const item = currentArca.items[itemId];
  if (!item) return;
  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) {
    if (confirm("Setting quantity to zero will delete this item. Are you sure you want to delete it?")) {
      await remove(ref(db, `arca/${arcaId}/items/${itemId}`));
      showToast("Item deleted", true);
    }
  } else {
    await set(ref(db, `arca/${arcaId}/items/${itemId}/quantity`), newQty);
    showToast("Quantity updated");
  }
  await loadArcaData();
}

async function deleteItem(itemId) {
  if (confirm("Are you sure you want to delete this item?")) {
    await remove(ref(db, `arca/${arcaId}/items/${itemId}`));
    showToast("Item deleted", true);
    await loadArcaData();
  }
}

// Dashboard navigation
dashboardBtn.onclick = () => {
  // Use a relative path (no leading slash) to avoid 404 in subfolders
  window.location.href = "index.html";
};

// ID prompt navigation
if (goToArcaBtn) {
  goToArcaBtn.onclick = () => {
    const enteredId = enterArcaId.value.trim();
    if (enteredId) {
      window.location.href = `view.html?id=${enteredId}`;
    }
  };
}

// Initial load
(async function main() {
  arcaId = getArcaIdFromUrl();
  await initAuth();
  await loadArcaData();
})();
