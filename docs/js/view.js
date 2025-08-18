// Handles viewing, creating and editing a single Arca and its items.

import { db, storage, auth } from './shared.js';
import { ref, get, set, update, push, remove } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import { uploadBytes, getDownloadURL, ref as sRef } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import { getQueryParam, resizeImage, showToast } from './utils.js';
import { initLogout } from './auth.js';

// ---- ID Prompt logic: Show prompt if no id in URL ----
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const arcaIdParam = urlParams.get('id');

  const idPromptSection = document.getElementById('idPrompt');
  const goToArcaBtn = document.getElementById('goToArcaBtn');
  const enterArcaIdInput = document.getElementById('enterArcaId');

  if (!arcaIdParam) {
    if (idPromptSection) idPromptSection.classList.remove('hidden');

    if (goToArcaBtn && enterArcaIdInput) {
      goToArcaBtn.addEventListener('click', () => {
        const enteredId = enterArcaIdInput.value.trim();
        if (enteredId) {
          window.location.href = `view.html?id=${encodeURIComponent(enteredId)}`;
        }
      });
      enterArcaIdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          goToArcaBtn.click();
        }
      });
    }
    // Prevent rest of script if no id
    return;
  }
});

// ---- End ID Prompt logic ----

let currentUser = null;
let arcaId = getQueryParam('id');
let currentArca = null;
let owner = false;
let editingItemId = null;

// DOM elements
const pageTitle = document.getElementById('pageTitle');
const idPrompt = document.getElementById('idPrompt');
const enterArcaIdInput = document.getElementById('enterArcaId');
const goToArcaBtn = document.getElementById('goToArcaBtn');
const accessDeniedSection = document.getElementById('accessDenied');
const arcaDetailsSection = document.getElementById('arcaDetails');
const itemsSection = document.getElementById('itemsSection');
const itemsList = document.getElementById('itemsList');
// Arca display elements
const arcaNameEl = document.getElementById('arcaName');
const arcaTypeEl = document.getElementById('arcaType');
const arcaLocationEl = document.getElementById('arcaLocation');
const arcaNoteEl = document.getElementById('arcaNote');
const arcaIdDisplayEl = document.getElementById('arcaIdDisplay');
const arcaOwnerEl = document.getElementById('arcaOwner');
const arcaImageEl = document.getElementById('arcaImage');
const editArcaBtn = document.getElementById('editArcaBtn');
const addItemBtn = document.getElementById('addItemBtn');

// Modal elements
const arcaModal = document.getElementById('arcaModal');
const arcaModalTitle = document.getElementById('arcaModalTitle');
const arcaForm = document.getElementById('arcaForm');
const formArcaName = document.getElementById('formArcaName');
const formArcaType = document.getElementById('formArcaType');
const formArcaLocation = document.getElementById('formArcaLocation');
const formArcaNote = document.getElementById('formArcaNote');
const formArcaImage = document.getElementById('formArcaImage');
const closeArcaModalBtn = document.getElementById('closeArcaModal');

const itemModal = document.getElementById('itemModal');
const itemModalTitle = document.getElementById('itemModalTitle');
const itemForm = document.getElementById('itemForm');
const itemIdHidden = document.getElementById('itemId');
const formItemName = document.getElementById('formItemName');
const formItemNote = document.getElementById('formItemNote');
const formItemHashtags = document.getElementById('formItemHashtags');
const formItemImage = document.getElementById('formItemImage');
const closeItemModalBtn = document.getElementById('closeItemModal');

// Initialize page
function init() {
  initLogout();
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = user;
    setupListeners();
    if (!arcaId) {
      // No ID provided: show prompt
      pageTitle.textContent = 'Arca Viewer';
      idPrompt.classList.remove('hidden');
    } else {
      // Load the Arca
      await loadArca();
    }
  });
}

// Setup event listeners for form actions and buttons
function setupListeners() {
  // Navigate to entered Arca ID
  if (goToArcaBtn) {
    goToArcaBtn.addEventListener('click', () => {
      const id = enterArcaIdInput.value.trim();
      if (id) {
        window.location.href = `view.html?id=${encodeURIComponent(id)}`;
      }
    });
  }
  // Edit Arca button
  if (editArcaBtn) {
    editArcaBtn.addEventListener('click', () => {
      if (!owner && currentArca) {
        showToast('Only the owner can edit this Arca');
        return;
      }
      openArcaModal(false);
    });
  }
  // Add Item button
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => {
      openItemModal(false);
    });
  }
  // Close modal buttons
  closeArcaModalBtn.addEventListener('click', () => hideModal(arcaModal));
  closeItemModalBtn.addEventListener('click', () => hideModal(itemModal));
  // Arca form submit
  arcaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleArcaSave();
  });
  // Item form submit
  itemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleItemSave();
  });
}

// Load an Arca by ID
async function loadArca() {
  pageTitle.textContent = 'Loading...';
  const arcaSnap = await get(ref(db, 'arcas/' + arcaId));
  if (!arcaSnap.exists()) {
    // Arca does not exist: ask to create
    pageTitle.textContent = 'New Arca';
    openArcaModal(true);
    return;
  }
  currentArca = arcaSnap.val();
  // Check permission
  let allowed = false;
  if (currentArca.allowedUsers) {
    if (Array.isArray(currentArca.allowedUsers)) {
      allowed = currentArca.allowedUsers.includes(currentUser.uid);
    } else {
      allowed = Boolean(currentArca.allowedUsers[currentUser.uid]);
    }
  }
  owner = currentArca.createdBy === currentUser.uid;
  if (!allowed) {
    pageTitle.textContent = currentArca.name || 'Arca';
    accessDeniedSection.classList.remove('hidden');
    arcaDetailsSection.classList.add('hidden');
    itemsSection.classList.add('hidden');
    return;
  }
  // Display details
  displayArca();
}

// Populate the page with currentArca details and items
function displayArca() {
  pageTitle.textContent = currentArca.name || 'Arca';
  idPrompt.classList.add('hidden');
  accessDeniedSection.classList.add('hidden');
  arcaDetailsSection.classList.remove('hidden');
  itemsSection.classList.remove('hidden');
  // Fill in details
  arcaNameEl.textContent = currentArca.name || '';
  arcaTypeEl.textContent = currentArca.type || '';
  arcaLocationEl.textContent = currentArca.location || '';
  arcaNoteEl.textContent = currentArca.note || '';
  arcaIdDisplayEl.textContent = arcaId;
  arcaOwnerEl.textContent = currentArca.createdBy || '';
  if (currentArca.image) {
    arcaImageEl.src = currentArca.image;
    arcaImageEl.classList.remove('hidden');
  } else {
    arcaImageEl.classList.add('hidden');
  }
  // Render items
  renderItems();
}

function renderItems() {
  itemsList.innerHTML = '';
  if (!currentArca || !currentArca.items) return;
  Object.entries(currentArca.items).forEach(([itemId, item]) => {
    const div = document.createElement('div');
    div.className = 'bg-slate-800/70 p-3 rounded flex items-start gap-4 relative';
    const imgPart = item.image ? `<img src="${item.image}" class="w-16 h-16 object-cover rounded" />` : '';
    const hashtags = item.hashtags && Array.isArray(item.hashtags) ? item.hashtags.join(', ') : '';
    div.innerHTML = `
      ${imgPart}
      <div class="flex-1">
        <p class="font-semibold">${item.name}</p>
        <p class="text-sm text-slate-400">${item.note || ''}</p>
        <p class="text-xs text-slate-500">${hashtags}</p>
      </div>
      <div class="flex flex-col gap-1 self-center">
        <button data-action="edit" data-id="${itemId}" class="text-yellow-400 hover:text-yellow-300 text-sm">Edit</button>
        <button data-action="delete" data-id="${itemId}" class="text-red-500 hover:text-red-400 text-sm">Delete</button>
      </div>
    `;
    itemsList.appendChild(div);
  });
  // Attach edit/delete handlers
  itemsList.querySelectorAll('button').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if (action === 'edit') {
      btn.addEventListener('click', () => openItemModal(true, id));
    } else if (action === 'delete') {
      btn.addEventListener('click', () => deleteItem(id));
    }
  });
}

// Show Arca modal for creation or editing
function openArcaModal(isNew) {
  formArcaName.value = isNew ? '' : (currentArca.name || '');
  formArcaType.value = isNew ? '' : (currentArca.type || '');
  formArcaLocation.value = isNew ? '' : (currentArca.location || '');
  formArcaNote.value = isNew ? '' : (currentArca.note || '');
  formArcaImage.value = '';
  arcaModalTitle.textContent = isNew ? 'Create New Arca' : 'Edit Arca';
  arcaModal.dataset.isNew = isNew ? 'true' : 'false';
  arcaModal.classList.remove('hidden');
}

// Show Item modal for creation or editing
function openItemModal(isEdit, itemId) {
  editingItemId = isEdit ? itemId : null;
  if (isEdit) {
    // Pre-fill fields
    const item = currentArca.items ? currentArca.items[itemId] : null;
    if (!item) return;
    itemModalTitle.textContent = 'Edit Item';
    itemIdHidden.value = itemId;
    formItemName.value = item.name || '';
    formItemNote.value = item.note || '';
    formItemHashtags.value = item.hashtags ? item.hashtags.join(',') : '';
    formItemImage.value = '';
  } else {
    itemModalTitle.textContent = 'Add Item';
    itemIdHidden.value = '';
    formItemName.value = '';
    formItemNote.value = '';
    formItemHashtags.value = '';
    formItemImage.value = '';
  }
  itemModal.classList.remove('hidden');
}

function hideModal(modal) {
  modal.classList.add('hidden');
}

// Handle creating or editing an Arca
async function handleArcaSave() {
  const isNew = arcaModal.dataset.isNew === 'true';
  const name = formArcaName.value.trim();
  const type = formArcaType.value.trim();
  const location = formArcaLocation.value.trim();
  const note = formArcaNote.value.trim();
  const file = formArcaImage.files[0];
  if (!name || !type) {
    showToast('Name and type are required');
    return;
  }
  let imageUrl = currentArca && currentArca.image ? currentArca.image : '';
  try {
    if (file) {
      const blob = await resizeImage(file, 1024, 0.7);
      const storageRef = sRef(storage, `arcas/${arcaId}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
    }
    if (isNew) {
      // Create new Arca record
      // Arca ID is predetermined from URL
      await set(ref(db, `arcas/${arcaId}`), {
        name,
        type,
        location: location || '',
        note: note || '',
        createdBy: currentUser.uid,
        allowedUsers: { [currentUser.uid]: true },
        image: imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      showToast('Arca created');
    } else {
      // Update existing Arca
      const updates = {
        name,
        type,
        location: location || '',
        note: note || '',
        image: imageUrl,
        updatedAt: Date.now()
      };
      await update(ref(db, `arcas/${arcaId}`), updates);
      showToast('Arca updated');
    }
    hideModal(arcaModal);
    await loadArca();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to save');
  }
}

// Handle creating or editing an item
async function handleItemSave() {
  const name = formItemName.value.trim();
  const note = formItemNote.value.trim();
  const hashtagsStr = formItemHashtags.value.trim();
  const file = formItemImage.files[0];
  if (!name) {
    showToast('Item name is required');
    return;
  }
  let imageUrl = '';
  try {
    if (file) {
      const blob = await resizeImage(file, 1024, 0.7);
      const storageRef = sRef(storage, `arca-items/${arcaId}/${Date.now()}-${file.name}`);
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
    }
    const hashtags = hashtagsStr ? hashtagsStr.split(',').map((t) => t.trim()).filter((t) => t) : [];
    const itemData = {
      name,
      note: note || '',
      hashtags,
      image: imageUrl || undefined,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (editingItemId) {
      // Update existing item
      await update(ref(db, `arcas/${arcaId}/items/${editingItemId}`), itemData);
      showToast('Item updated');
    } else {
      // Add new item
      const newItemRef = push(ref(db, `arcas/${arcaId}/items`));
      await set(newItemRef, itemData);
      showToast('Item added');
    }
    hideModal(itemModal);
    editingItemId = null;
    await loadArca();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Failed to save item');
  }
}

// Delete an item after confirmation
async function deleteItem(itemId) {
  if (!confirm('Delete this item?')) return;
  try {
    await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
    showToast('Item deleted');
    await loadArca();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete');
  }
}

// Initialize the page
init();
