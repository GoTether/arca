import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getDatabase, ref, onValue, set, push, update, remove } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";
import imageCompression from 'https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

const userInfo = document.getElementById('userInfo');
const dashboardBtn = document.getElementById('dashboardBtn');
const dashboardBtn2 = document.getElementById('dashboardBtn2');
const idPrompt = document.getElementById('idPrompt');
const enterArcaId = document.getElementById('enterArcaId');
const goToArcaBtn = document.getElementById('goToArcaBtn');
const accessDenied = document.getElementById('accessDenied');
const setupArca = document.getElementById('setupArca');
const setupArcaForm = document.getElementById('setupArcaForm');
const setupArcaName = document.getElementById('setupArcaName');
const setupArcaType = document.getElementById('setupArcaType');
const setupArcaLocation = document.getElementById('setupArcaLocation');
const setupArcaNote = document.getElementById('setupArcaNote');
const arcaDetails = document.getElementById('arcaDetails');
const arcaName = document.getElementById('arcaName');
const arcaType = document.getElementById('arcaType');
const arcaLocation = document.getElementById('arcaLocation');
const arcaNote = document.getElementById('arcaNote');
const arcaImage = document.getElementById('arcaImage');
const arcaIdDisplay = document.getElementById('arcaIdDisplay');
const arcaTotalItems = document.getElementById('arcaTotalItems');
const addItemBtn = document.getElementById('addItemBtn');
const editArcaBtn = document.getElementById('editArcaBtn');
const itemsSection = document.getElementById('itemsSection');
const itemsList = document.getElementById('itemsList');
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const formItemName = document.getElementById('formItemName');
const formItemNote = document.getElementById('formItemNote');
const formItemHashtags = document.getElementById('formItemHashtags');
const itemImagePreview = document.getElementById('itemImagePreview');
const itemImagePreviewContainer = document.getElementById('itemImagePreviewContainer');
const itemFileInput = document.getElementById('itemFileInput');
const itemImageActionBtn = document.getElementById('itemImageActionBtn');
const deleteItemImgBtn = document.getElementById('deleteItemImgBtn');
const deleteItemBtn = document.getElementById('deleteItemBtn');
const cancelItemModalBtn = document.getElementById('cancelItemModal');
const arcaModal = document.getElementById('arcaModal');
const arcaForm = document.getElementById('arcaForm');
const formArcaName = document.getElementById('formArcaName');
const formArcaType = document.getElementById('formArcaType');
const formArcaLocation = document.getElementById('formArcaLocation');
const formArcaNote = document.getElementById('formArcaNote');
const arcaImagePreview = document.getElementById('arcaImagePreview');
const arcaImagePreviewContainer = document.getElementById('arcaImagePreviewContainer');
const arcaFileInput = document.getElementById('arcaFileInput');
const arcaImageActionBtn = document.getElementById('arcaImageActionBtn');
const deleteArcaImgBtn = document.getElementById('deleteArcaImgBtn');
const closeArcaModalBtn = document.getElementById('closeArcaModal');
const imageOptionsModal = document.getElementById('imageOptionsModal');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const chooseFromLibraryBtn = document.getElementById('chooseFromLibraryBtn');
const closeImageOptionsBtn = document.getElementById('closeImageOptionsBtn');
const existingImagesModal = document.getElementById('existingImagesModal');
const galleryGrid = document.getElementById('galleryGrid');
const galleryCancelBtn = document.getElementById('galleryCancelBtn');
const toast = document.getElementById('toast');
const backdrop = document.getElementById('backdrop');

let currentUser = null;
let currentArca = null;
let arcaId = null;
let itemModalEditing = false;
let itemModalEditingId = null;
let itemModalEditingImage = null;
let itemModalDeleteImage = false;
let arcaModalEditingImage = null;
let arcaModalDeleteImage = false;
let imageModalType = null;

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast show${isError ? ' error' : ''}`;
  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

function showSection(section) {
  idPrompt.classList.add('hidden');
  accessDenied.classList.add('hidden');
  setupArca.classList.add('hidden');
  arcaDetails.classList.add('hidden');
  itemsSection.classList.add('hidden');
  section.classList.remove('hidden');
}

function renderItems() {
  itemsList.innerHTML = '';
  if (!currentArca.items) return;
  Object.entries(currentArca.items).forEach(([itemId, item]) => {
    const div = document.createElement('div');
    div.className = 'chunky-item-tile';
    div.innerHTML = `
      ${item.image ? `<img src="${item.image}" class="chunky-item-img" />` : '<div class="chunky-item-img"></div>'}
      <div class="chunky-item-info">
        <div class="chunky-item-name">${item.name}</div>
        <div class="chunky-item-note">${item.note || ''}</div>
        <div class="chunky-item-hashtags">${(item.hashtags||[]).map(t => `<span>#${t}</span>`).join(' ')}</div>
      </div>
      <div class="chunky-quantity-controls">
        <button class="chunky-qty-btn minus" data-action="decr" data-id="${itemId}" title="Decrease quantity">−</button>
        <span class="chunky-quantity-value" id="qty-${itemId}">${item.quantity}</span>
        <button class="chunky-qty-btn plus" data-action="incr" data-id="${itemId}" title="Increase quantity">+</button>
      </div>
    `;
    let pressTimer = null;
    div.addEventListener('mousedown', startPress);
    div.addEventListener('touchstart', startPress);
    div.addEventListener('mouseup', cancelPress);
    div.addEventListener('mouseleave', cancelPress);
    div.addEventListener('touchend', cancelPress);
    div.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openItemModal(true, itemId, div);
    });

    function startPress(e) {
      e.preventDefault();
      if (e.target.closest('.chunky-qty-btn') || e.target.closest('.chunky-item-img')) return;
      cancelPress();
      div.classList.add('pressing');
      pressTimer = setTimeout(() => {
        div.classList.remove('pressing');
        openItemModal(true, itemId, div);
      }, 500);
    }
    function cancelPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
        div.classList.remove('pressing');
      }
    }

    itemsList.appendChild(div);
  });

  itemsList.querySelectorAll('button[data-action="decr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, -1);
  });
  itemsList.querySelectorAll('button[data-action="incr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, 1);
  });
}

async function adjustItemQuantity(itemId, delta) {
  const item = currentArca.items[itemId];
  const newQty = (item.quantity || 1) + delta;
  if (newQty <= 0) {
    if (confirm("This will delete the item. Are you sure?")) {
      await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
      showToast("Item deleted", true);
      await loadArcaData();
    }
    return;
  }
  await update(ref(db, `arcas/${arcaId}/items/${itemId}`), { quantity: newQty });
  document.getElementById(`qty-${itemId}`).textContent = newQty;
  currentArca.items[itemId].quantity = newQty;
  arcaTotalItems.textContent = `${Object.values(currentArca.items).reduce((sum, item) => sum + (item.quantity || 1), 0)} items`;
}

function openItemModal(isEdit, itemId, tileElement) {
  itemModal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  if (tileElement) {
    const rect = tileElement.getBoundingClientRect();
    itemModal.style.setProperty('--start-x', `${rect.left + rect.width / 2}px`);
    itemModal.style.setProperty('--start-y', `${rect.top + rect.height / 2}px`);
  }
  if (isEdit) {
    document.getElementById('itemModalTitle').textContent = 'Edit Item';
    document.getElementById('itemId').value = itemId;
    const item = currentArca.items[itemId];
    formItemName.value = item.name || '';
    formItemNote.value = item.note || '';
    formItemHashtags.value = item.hashtags ? item.hashtags.join(', ') : '';
    itemFileInput.value = "";
    itemModalEditing = true;
    itemModalEditingId = itemId;
    itemModalEditingImage = item.image || null;
    itemModalDeleteImage = false;
    if (item.image) {
      itemImagePreview.src = item.image;
      itemImagePreviewContainer.classList.remove('hidden');
      deleteItemImgBtn.classList.remove('hidden');
    } else {
      itemImagePreview.src = '';
      itemImagePreviewContainer.classList.add('hidden');
      deleteItemImgBtn.classList.add('hidden');
    }
    updateImageActionBtn();
    deleteItemBtn.classList.remove('hidden');
    deleteItemBtn.onclick = async function() {
      if (confirm("Are you sure you want to delete this item?")) {
        await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
        showToast("Item deleted", true);
        itemModal.classList.add('hidden');
        backdrop.classList.add('hidden');
        await loadArcaData();
      }
    };
  } else {
    itemForm.reset();
    document.getElementById('itemModalTitle').textContent = 'Add Item';
    document.getElementById('itemId').value = '';
    itemImagePreviewContainer.classList.add('hidden');
    itemImagePreview.src = '';
    itemFileInput.value = "";
    itemModalEditing = false;
    itemModalEditingId = null;
    itemModalEditingImage = null;
    itemModalDeleteImage = false;
    updateImageActionBtn();
    deleteItemBtn.classList.add('hidden');
    deleteItemBtn.onclick = null;
    deleteItemImgBtn.classList.add('hidden');
  }
  formItemName.focus();
}

function updateImageActionBtn() {
  itemImageActionBtn.textContent = itemModalEditing && itemModalEditingImage && !itemModalDeleteImage ? 'Replace Image' : 'Add Image';
  arcaImageActionBtn.textContent = arcaModalEditingImage && !arcaModalDeleteImage ? 'Replace Image' : 'Add Image';
}

itemForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = formItemName.value.trim();
  if (!name) {
    showToast("Item name cannot be empty", true);
    return;
  }
  const note = formItemNote.value.trim();
  const hashtags = formItemHashtags.value.split(',').map(t => t.trim()).filter(t => t);
  const itemData = { name, note, hashtags, quantity: 1 };
  let imageUrl = itemModalEditingImage;
  if (itemModalDeleteImage) {
    imageUrl = null;
    if (itemModalEditingImage) {
      try {
        await deleteObject(storageRef(storage, itemModalEditingImage));
      } catch (e) {
        console.error("Error deleting image:", e);
      }
    }
  }
  if (itemFileInput.files[0]) {
    const file = itemFileInput.files[0];
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 512 });
      const imageRef = storageRef(storage, `arcas/${arcaId}/items/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, compressedFile);
      imageUrl = await getDownloadURL(imageRef);
    } catch (e) {
      showToast("Error uploading image", true);
      return;
    }
  }
  if (imageUrl) itemData.image = imageUrl;
  if (itemModalEditing && itemModalEditingId) {
    await update(ref(db, `arcas/${arcaId}/items/${itemModalEditingId}`), itemData);
    showToast("Item updated");
  } else {
    await push(ref(db, `arcas/${arcaId}/items`), itemData);
    showToast("Item added");
  }
  itemModal.classList.add('hidden');
  backdrop.classList.add('hidden');
  await loadArcaData();
};

deleteItemImgBtn.onclick = () => {
  itemModalDeleteImage = true;
  itemImagePreviewContainer.classList.add('hidden');
  deleteItemImgBtn.classList.add('hidden');
  updateImageActionBtn();
};

itemImageActionBtn.onclick = () => {
  imageModalType = 'item';
  imageOptionsModal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
};

cancelItemModalBtn.onclick = () => {
  itemModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

arcaForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = formArcaName.value.trim();
  if (!name) {
    showToast("Arca name cannot be empty", true);
    return;
  }
  const type = formArcaType.value.trim();
  const location = formArcaLocation.value.trim();
  const note = formArcaNote.value.trim();
  const arcaData = { name, type, location, note };
  let imageUrl = arcaModalEditingImage;
  if (arcaModalDeleteImage) {
    imageUrl = null;
    if (arcaModalEditingImage) {
      try {
        await deleteObject(storageRef(storage, arcaModalEditingImage));
      } catch (e) {
        console.error("Error deleting image:", e);
      }
    }
  }
  if (arcaFileInput.files[0]) {
    const file = arcaFileInput.files[0];
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 512 });
      const imageRef = storageRef(storage, `arcas/${arcaId}/arca_${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, compressedFile);
      imageUrl = await getDownloadURL(imageRef);
    } catch (e) {
      showToast("Error uploading image", true);
      return;
    }
  }
  if (imageUrl) arcaData.image = imageUrl;
  await update(ref(db, `arcas/${arcaId}`), arcaData);
  showToast("Arca updated");
  arcaModal.classList.add('hidden');
  backdrop.classList.add('hidden');
  await loadArcaData();
};

deleteArcaImgBtn.onclick = () => {
  arcaModalDeleteImage = true;
  arcaImagePreviewContainer.classList.add('hidden');
  updateImageActionBtn();
};

arcaImageActionBtn.onclick = () => {
  imageModalType = 'arca';
  imageOptionsModal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
};

closeArcaModalBtn.onclick = () => {
  arcaModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

takePhotoBtn.onclick = () => {
  if (imageModalType === 'item') {
    itemFileInput.setAttribute('capture', 'environment');
    itemFileInput.click();
  } else {
    arcaFileInput.setAttribute('capture', 'environment');
    arcaFileInput.click();
  }
  imageOptionsModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

uploadPhotoBtn.onclick = () => {
  if (imageModalType === 'item') {
    itemFileInput.removeAttribute('capture');
    itemFileInput.click();
  } else {
    arcaFileInput.removeAttribute('capture');
    arcaFileInput.click();
  }
  imageOptionsModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

chooseFromLibraryBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  existingImagesModal.classList.remove('hidden');
  // TODO: Implement library image selection
};

closeImageOptionsBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

galleryCancelBtn.onclick = () => {
  existingImagesModal.classList.add('hidden');
  backdrop.classList.add('hidden');
};

itemFileInput.onchange = async (e) => {
  if (e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      itemImagePreview.src = e.target.result;
      itemImagePreviewContainer.classList.remove('hidden');
      deleteItemImgBtn.classList.remove('hidden');
      itemModalDeleteImage = false;
      updateImageActionBtn();
    };
    reader.readAsDataURL(file);
  }
};

arcaFileInput.onchange = async (e) => {
  if (e.target.files[0]) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      arcaImagePreview.src = e.target.result;
      arcaImagePreviewContainer.classList.remove('hidden');
      arcaModalDeleteImage = false;
      updateImageActionBtn();
    };
    reader.readAsDataURL(file);
  }
};

async function loadArcaData() {
  if (!arcaId || !currentUser) return;
  const arcaRef = ref(db, `arcas/${arcaId}`);
  onValue(arcaRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      showSection(idPrompt);
      return;
    }
    const hasAccess = data.owner === currentUser.uid || (data.sharedWith && data.sharedWith[currentUser.uid]);
    if (!hasAccess) {
      showSection(accessDenied);
      return;
    }
    currentArca = data;
    arcaName.textContent = data.name || 'Unnamed Arca';
    arcaType.textContent = data.type || '';
    arcaLocation.textContent = data.location || '';
    arcaNote.textContent = data.note || '';
    arcaIdDisplay.textContent = arcaId;
    arcaTotalItems.textContent = `${data.items ? Object.values(data.items).reduce((sum, item) => sum + (item.quantity || 1), 0) : 0} items`;
    if (data.image) {
      arcaImage.src = data.image;
      arcaImage.classList.remove('hidden');
    } else {
      arcaImage.classList.add('hidden');
    }
    showSection(arcaDetails);
    itemsSection.classList.remove('hidden');
    renderItems();
  }, (error) => {
    console.error("Error loading arca:", error);
    showSection(idPrompt);
  });
}

setupArcaForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = setupArcaName.value.trim();
  if (!name) {
    showToast("Arca name cannot be empty", true);
    return;
  }
  const type = setupArcaType.value.trim();
  const location = setupArcaLocation.value.trim();
  const note = setupArcaNote.value.trim();
  const newArcaRef = push(ref(db, 'arcas'));
  await set(newArcaRef, {
    name,
    type,
    location,
    note,
    owner: currentUser.uid,
    created: Date.now()
  });
  window.location.href = `index.html?id=${newArcaRef.key}`;
};

addItemBtn.onclick = () => {
  openItemModal(false);
};

editArcaBtn.onclick = () => {
  arcaModal.classList.remove('hidden');
  backdrop.classList.remove('hidden');
  formArcaName.value = currentArca.name || '';
  formArcaType.value = currentArca.type || '';
  formArcaLocation.value = currentArca.location || '';
  formArcaNote.value = currentArca.note || '';
  arcaFileInput.value = "";
  arcaModalEditingImage = currentArca.image || null;
  arcaModalDeleteImage = false;
  if (currentArca.image) {
    arcaImagePreview.src = currentArca.image;
    arcaImagePreviewContainer.classList.remove('hidden');
  } else {
    arcaImagePreview.src = '';
    arcaImagePreviewContainer.classList.add('hidden');
  }
  updateImageActionBtn();
};

goToArcaBtn.onclick = () => {
  const id = enterArcaId.value.trim();
  if (id) {
    window.location.href = `index.html?id=${id}`;
  } else {
    showToast("Please enter an Arca ID", true);
  }
};

dashboardBtn.onclick = () => {
  window.location.href = 'index.html';
};

dashboardBtn2.onclick = () => {
  window.location.href = 'index.html';
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    userInfo.textContent = user.email || user.displayName || 'User';
    const urlParams = new URLSearchParams(window.location.search);
    arcaId = urlParams.get('id');
    if (arcaId) {
      loadArcaData();
    } else {
      showSection(setupArca);
    }
  } else {
    window.location.href = 'login.html';
  }
});

// Add backdrop and Esc key handlers
backdrop.addEventListener('click', () => {
  itemModal.classList.add('hidden');
  arcaModal.classList.add('hidden');
  imageOptionsModal.classList.add('hidden');
  existingImagesModal.classList.add('hidden');
  backdrop.classList.add('hidden');
});
itemModal.addEventListener('click', (e) => e.stopPropagation());
arcaModal.addEventListener('click', (e) => e.stopPropagation());
imageOptionsModal.addEventListener('click', (e) => e.stopPropagation());
existingImagesModal.addEventListener('click', (e) => e.stopPropagation());
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    itemModal.classList.add('hidden');
    arcaModal.classList.add('hidden');
    imageOptionsModal.classList.add('hidden');
    existingImagesModal.classList.add('hidden');
    backdrop.classList.add('hidden');
  }
});

// Focus trapping for itemModal
itemModal.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    const focusableElements = itemModal.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }
});
