// Handles viewing, creating and editing a single Arca and its items.
// Responsive, dynamic "Items" badge that updates on quantity change.

import { db, storage, auth } from './shared.js';
import {
  ref,
  get,
  set,
  update,
  push,
  remove,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';
import {
  uploadBytes,
  getDownloadURL,
  ref as sRef,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js';
import { getQueryParam, resizeImage, showToast } from './utils.js';
import { initLogout } from './auth.js';

// DOM Elements
const pageTitle = document.getElementById('pageTitle');
const userInfoEl = document.getElementById('userInfo');
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
const arcaImageEl = document.getElementById('arcaImage');
const editArcaBtn = document.getElementById('editArcaBtn');
const addItemBtn = document.getElementById('addItemBtn');
const arcaTotalItemsEl = document.getElementById('arcaTotalItems');

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

// State
let currentUser = null;
let arcaId = getQueryParam('id');
let currentArca = null;
let owner = false;
let editingItemId = null;

// ---- ID Prompt logic: Show prompt if no id in URL ----
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const arcaIdParam = urlParams.get('id');
  if (!arcaIdParam) {
    if (idPrompt) idPrompt.classList.remove('hidden');

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

  // Initialize page only if Arca ID is present
  init();
});

// Initialize page
function init() {
  initLogout();
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    currentUser = user;

    // Display user info in header (email, name, or uid)
    if (userInfoEl) {
      userInfoEl.textContent = user.email || user.displayName || user.uid || '';
    }

    setupListeners();
    if (!arcaId) {
      pageTitle.textContent = 'Arca Viewer';
      idPrompt.classList.remove('hidden');
    } else {
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
  if (closeArcaModalBtn) {
    closeArcaModalBtn.addEventListener('click', () => hideModal(arcaModal));
  }
  if (closeItemModalBtn) {
    closeItemModalBtn.addEventListener('click', () => hideModal(itemModal));
  }
  // Arca form submit
  if (arcaForm) {
    arcaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleArcaSave();
    });
  }
  // Item form submit
  if (itemForm) {
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleItemSave();
    });
  }
}

// Load an Arca by ID
async function loadArca() {
  pageTitle.textContent = 'Loading...';
  try {
    const arcaSnap = await get(ref(db, 'arcas/' + arcaId));
    if (!arcaSnap.exists()) {
      // Arca does not exist: ask to create
      pageTitle.textContent = 'New Arca';
      openArcaModal(true);
      arcaDetailsSection.classList.add('hidden');
      itemsSection.classList.add('hidden');
      accessDeniedSection.classList.add('hidden');
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
  } catch (err) {
    console.error(err);
    showToast('Failed to load Arca');
  }
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
  if (currentArca.image) {
    arcaImageEl.src = currentArca.image;
    arcaImageEl.classList.remove('hidden');
  } else {
    arcaImageEl.classList.add('hidden');
  }
  // Render items and count
  renderItems();
  updateTotalItemsDisplay();
  scrollToArcaDetailsIfMobile();
}

/**
 * Render all items as chunky cards with quantity controls
 */
function renderItems() {
  itemsList.innerHTML = '';
  if (!currentArca || !currentArca.items) return;
  Object.entries(currentArca.items).forEach(([itemId, item]) => {
    // Default quantity to 1 if not present or less than 1
    const quantity = typeof item.quantity === "number" && item.quantity >= 1 ? item.quantity : 1;

    const div = document.createElement('div');
    div.className = 'chunky-item-tile';

    // Image
    const imgPart = item.image
      ? `<img src="${item.image}" class="chunky-item-img" />`
      : '';

    // Hashtags string
    const hashtags =
      item.hashtags && Array.isArray(item.hashtags)
        ? item.hashtags.map(t => `<span>#${t}</span>`).join(' ')
        : '';

    // Main HTML
    div.innerHTML = `
      ${imgPart}
      <div class="chunky-item-name">${item.name}</div>
      <div class="chunky-item-note">${item.note || ''}</div>
      <div class="chunky-item-hashtags">${hashtags}</div>
      <div class="chunky-quantity-controls">
        <button class="chunky-qty-btn minus" data-action="decr" data-id="${itemId}" title="Decrease quantity">−</button>
        <span class="chunky-quantity-value" id="qty-${itemId}">${quantity}</span>
        <button class="chunky-qty-btn plus" data-action="incr" data-id="${itemId}" title="Increase quantity">+</button>
      </div>
      <div class="item-actions">
        <button data-action="edit" data-id="${itemId}" title="Edit">✏️</button>
        <button data-action="delete" data-id="${itemId}" title="Delete">🗑️</button>
      </div>
    `;
    itemsList.appendChild(div);
  });

  // Attach edit/delete handlers
  itemsList.querySelectorAll('button[data-action="edit"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', () => openItemModal(true, id));
  });
  itemsList.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', () => deleteItem(id));
  });

  // Attach quantity handlers
  itemsList.querySelectorAll('button[data-action="decr"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', () => adjustItemQuantity(id, -1));
  });
  itemsList.querySelectorAll('button[data-action="incr"]').forEach((btn) => {
    const id = btn.getAttribute('data-id');
    btn.addEventListener('click', () => adjustItemQuantity(id, 1));
  });
}

/**
 * Change the quantity of an item in the DB and update UI optimistically.
 * If the user tries to set quantity to 0, ask for confirmation to delete the item.
 * After any change, update the total items display.
 */
async function adjustItemQuantity(itemId, delta) {
  const itemRef = ref(db, `arcas/${arcaId}/items/${itemId}`);
  try {
    const snap = await get(itemRef);
    if (!snap.exists()) return;
    const item = snap.val();
    const currentQty = typeof item.quantity === "number" && item.quantity >= 1 ? item.quantity : 1;
    let newQty = currentQty + delta;
    if (newQty < 1) {
      // Prompt for delete confirmation
      if (confirm("Setting quantity to zero will delete this item. Are you sure you want to delete it?")) {
        await deleteItem(itemId);
        updateTotalItemsDisplay(); // Update after delete
      }
      return;
    }
    await update(itemRef, { quantity: newQty, updatedAt: Date.now() });
    // Update the displayed value immediately (optimistic UI)
    const qtyEl = document.getElementById(`qty-${itemId}`);
    if (qtyEl) qtyEl.textContent = newQty;
    updateTotalItemsDisplay(); // Update after quantity change
  } catch (err) {
    showToast('Failed to update quantity');
    console.error(err);
  }
}

/**
 * Update the total number of items displayed in the arca details.
 * Sums the quantities of all items.
 * Shows "N Items" in the badge.
 */
function updateTotalItemsDisplay() {
  if (!arcaTotalItemsEl) return;
  let totalQty = 0;
  if (currentArca && currentArca.items) {
    for (const item of Object.values(currentArca.items)) {
      totalQty += typeof item.quantity === "number" && item.quantity >= 1 ? item.quantity : 1;
    }
  }
  arcaTotalItemsEl.textContent = `${totalQty} Items`;
  arcaTotalItemsEl.classList.toggle('hidden', totalQty === 0);
}

// Show Arca modal for creation or editing
function openArcaModal(isNew) {
  formArcaName.value = isNew ? '' : currentArca?.name || '';
  formArcaType.value = isNew ? '' : currentArca?.type || '';
  formArcaLocation.value = isNew ? '' : currentArca?.location || '';
  formArcaNote.value = isNew ? '' : currentArca?.note || '';
  formArcaImage.value = '';
  arcaModalTitle.textContent = isNew ? 'Set Up Arca' : 'Edit Arca';
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
      const storageRef = sRef(
        storage,
        `arcas/${arcaId}/${Date.now()}-${file.name}`
      );
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
        updatedAt: Date.now(),
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
        updatedAt: Date.now(),
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
      const storageRef = sRef(
        storage,
        `arca-items/${arcaId}/${Date.now()}-${file.name}`
      );
      await uploadBytes(storageRef, blob);
      imageUrl = await getDownloadURL(storageRef);
    }
    const hashtags = hashtagsStr
      ? hashtagsStr.split(',').map((t) => t.trim()).filter((t) => t)
      : [];
    const itemData = {
      name,
      note: note || '',
      hashtags,
      image: imageUrl || '',
      quantity: editingItemId ? undefined : 1, // default to 1 if adding
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (editingItemId) {
      // Remove undefined so we don't overwrite
      if (itemData.quantity === undefined) delete itemData.quantity;
      await update(
        ref(db, `arcas/${arcaId}/items/${editingItemId}`),
        itemData
      );
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

// Delete an item after confirmation and remove its image from storage
async function deleteItem(itemId) {
  // User already confirmed in adjustItemQuantity
  try {
    // Get the image URL from the item
    const itemRef = ref(db, `arcas/${arcaId}/items/${itemId}`);
    const itemSnap = await get(itemRef);
    const item = itemSnap.exists() ? itemSnap.val() : null;
    if (item && item.image && item.image !== '') {
      // Delete the image from storage
      try {
        // Parse the image URL to get the path (after /o/)
        const imageUrl = item.image;
        const match = imageUrl.match(/\/o\/([^?]*)/);
        if (match && match[1]) {
          const decodedPath = decodeURIComponent(match[1]);
          const imageRef = sRef(storage, decodedPath);
          await deleteObject(imageRef);
        }
      } catch (imgErr) {
        console.warn('Failed to delete image in storage:', imgErr);
      }
    }
    await remove(itemRef);
    showToast('Item deleted');
    await loadArca();
  } catch (err) {
    console.error(err);
    showToast('Failed to delete');
  }
}

/**
 * Scroll to Arca details on mobile after load for context
 */
function scrollToArcaDetailsIfMobile() {
  if (window.innerWidth < 768) {
    const section = document.getElementById('arcaDetails');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }
}
