import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getDatabase,
  ref,
  get,
  set,
  remove,
  update,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import {
  getStorage,
  uploadBytes,
  getDownloadURL,
  ref as storageRef,
  deleteObject,
  listAll,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

// Firebase config
const firebaseConfig = {
  apiKey: 'AIzaSyAZoL7FPJ8wBqz_sX81Fo5eKXpsOVrLUZ0',
  authDomain: 'tether-71e0c.firebaseapp.com',
  databaseURL: 'https://tether-71e0c-default-rtdb.firebaseio.com',
  projectId: 'tether-71e0c',
  storageBucket: 'tether-71e0c.firebasestorage.app',
  messagingSenderId: '277809008742',
  appId: '1:277809008742:web:2586a2b821d8da8f969da7',
  measurementId: 'G-X7ZQ6DJYEN'
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);

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
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const formItemName = document.getElementById('formItemName');
const formItemNote = document.getElementById('formItemNote');
const formItemHashtags = document.getElementById('formItemHashtags');
const itemImagePreviewContainer = document.getElementById('itemImagePreviewContainer');
const itemImagePreview = document.getElementById('itemImagePreview');
const deleteItemImgBtn = document.getElementById('deleteItemImgBtn');
const closeItemModalBtn = document.getElementById('closeItemModal');
const itemImageActionBtn = document.getElementById('itemImageActionBtn');
const itemFileInput = document.getElementById('itemFileInput');

const dashboardBtn = document.getElementById('dashboardBtn');
const dashboardBtn2 = document.getElementById('dashboardBtn2');
const toastEl = document.getElementById('toast');
const idPrompt = document.getElementById('idPrompt');
const enterArcaId = document.getElementById('enterArcaId');
const goToArcaBtn = document.getElementById('goToArcaBtn');
const userInfoEl = document.getElementById('userInfo');
const accessDeniedEl = document.getElementById('accessDenied');
const editArcaBtn = document.getElementById('editArcaBtn');

// Arca Modal
const arcaModal = document.getElementById('arcaModal');
const arcaForm = document.getElementById('arcaForm');
const formArcaName = document.getElementById('formArcaName');
const formArcaType = document.getElementById('formArcaType');
const formArcaLocation = document.getElementById('formArcaLocation');
const formArcaNote = document.getElementById('formArcaNote');
const arcaImagePreviewContainer = document.getElementById('arcaImagePreviewContainer');
const arcaImagePreview = document.getElementById('arcaImagePreview');
const deleteArcaImgBtn = document.getElementById('deleteArcaImgBtn');
const closeArcaModalBtn = document.getElementById('closeArcaModal');
const arcaImageActionBtn = document.getElementById('arcaImageActionBtn');
const arcaFileInput = document.getElementById('arcaFileInput');

// Image options modal
const imageOptionsModal = document.getElementById('imageOptionsModal');
const takePhotoBtn = document.getElementById('takePhotoBtn');
const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
const chooseFromLibraryBtn = document.getElementById('chooseFromLibraryBtn');
const closeImageOptionsBtn = document.getElementById('closeImageOptionsBtn');

// Gallery modal
const existingImagesModal = document.getElementById('existingImagesModal');
const galleryGrid = document.getElementById('galleryGrid');
const galleryCancelBtn = document.getElementById('galleryCancelBtn');

// Setup arca
const setupArcaSection = document.getElementById('setupArca');
const setupArcaForm = document.getElementById('setupArcaForm');
const setupArcaName = document.getElementById('setupArcaName');
const setupArcaType = document.getElementById('setupArcaType');
const setupArcaLocation = document.getElementById('setupArcaLocation');
const setupArcaNote = document.getElementById('setupArcaNote');

let currentArca = null;
let arcaId = null;
let user = null;

// For item image delete/replace
let itemModalEditing = false;
let itemModalEditingId = null;
let itemModalEditingImage = null;
let itemModalDeleteImage = false;
let itemImageSource = null; // "upload", "camera", "gallery"
let itemGalleryUrl = "";

// For arca image delete/replace
let arcaModalEditingImage = null;
let arcaModalDeleteImage = false;
let arcaImageSource = null; // "upload", "camera", "gallery"
let arcaGalleryUrl = "";

// Current image picker context
let currentImagePickerContext = null; // "item" or "arca"

// UI helpers
function showToast(msg, warn = false) {
  toastEl.textContent = msg;
  toastEl.style.background = warn ? "#d32f2f" : "#2545a8";
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1800 + Math.max(0, msg.length * 25));
}
function showSection(section) {
  [idPrompt, accessDeniedEl, setupArcaSection, arcaDetailsSection, itemsSection].forEach(el => el.classList.add('hidden'));
  if (section === 'idPrompt') idPrompt.classList.remove('hidden');
  if (section === 'accessDenied') accessDeniedEl.classList.remove('hidden');
  if (section === 'setupArca') setupArcaSection.classList.remove('hidden');
  if (section === 'arcaDetails') {
    arcaDetailsSection.classList.remove('hidden');
    itemsSection.classList.remove('hidden');
  }
}

// Routing helpers
function getArcaIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id');
}

// Auth and user info
function initAuth() {
  onAuthStateChanged(auth, async (u) => {
    if (!u) {
      window.location.href = "login.html";
      return;
    }
    user = u;
    userInfoEl.textContent = user.email || '';
    arcaId = getArcaIdFromUrl();
    if (!arcaId) showSection('idPrompt');
    else await loadArcaData();
  });
}

// Firebase data
async function loadArcaData() {
  showSection(null);
  const arcaRef = ref(db, 'arcas/' + arcaId);
  const arcaSnap = await get(arcaRef);
  if (!arcaSnap.exists()) {
    // Show setup arca modal instead of access denied
    showSection('setupArca');
    return;
  }
  currentArca = arcaSnap.val();

  // ACCESS CHECK
  if (!currentArca.allowedUsers || !currentArca.allowedUsers[user.uid]) {
    showSection('accessDenied');
    return;
  }
  renderArca();
}

function renderArca() {
  showSection('arcaDetails');
  // Details
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
      <div class="item-actions">
        <button data-action="edit" data-id="${itemId}" title="Edit">✏️</button>
        <button data-action="delete" data-id="${itemId}" title="Delete">🗑️</button>
      </div>
    `;
    itemsList.appendChild(div);
  });

  // Handlers
  itemsList.querySelectorAll('button[data-action="decr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, -1);
  });
  itemsList.querySelectorAll('button[data-action="incr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, 1);
  });
  itemsList.querySelectorAll('button[data-action="edit"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => openItemModal(true, id);
  });
  itemsList.querySelectorAll('button[data-action="delete"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => deleteItem(id);
  });
}

function updateTotalItemsDisplay() {
  const totalQty = Object.values(currentArca.items || {}).reduce(
    (sum, item) => sum + (typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1), 0
  );
  arcaTotalItemsEl.textContent = `${totalQty} Items`;
  arcaTotalItemsEl.classList.toggle('hidden', totalQty === 0);
}

// ---------- SETUP ARCA LOGIC ----------
setupArcaForm.onsubmit = async (e) => {
  e.preventDefault();
  const name = setupArcaName.value.trim();
  const type = setupArcaType.value.trim();
  const location = setupArcaLocation.value.trim();
  const note = setupArcaNote.value.trim();

  // Basic arca object
  const newArca = {
    name,
    type,
    location,
    note,
    allowedUsers: { [user.uid]: true },
    items: {},
    image: ""
  };
  await set(ref(db, 'arcas/' + arcaId), newArca);
  showToast("Arca created!");
  await loadArcaData();
};


// ---------- MODAL LOGIC FOR ITEMS ----------
addItemBtn.onclick = () => {
  itemModal.classList.remove('hidden');
  itemForm.reset();
  document.getElementById('itemId').value = '';
  document.getElementById('itemModalTitle').textContent = 'Add Item';
  itemImagePreviewContainer.classList.add('hidden');
  itemImagePreview.src = '';
  itemModalEditing = false;
  itemModalEditingId = null;
  itemModalEditingImage = null;
  itemModalDeleteImage = false;
  itemImageSource = null;
  itemGalleryUrl = "";
  updateImageActionBtn();
};

closeItemModalBtn.onclick = () => {
  itemModal.classList.add('hidden');
};

function updateImageActionBtn() {
  if (itemImagePreview.src && !itemImagePreviewContainer.classList.contains('hidden')) {
    itemImageActionBtn.textContent = 'Replace Image';
  } else {
    itemImageActionBtn.textContent = 'Add Image';
  }
}

// --- Show image options modal ---
itemImageActionBtn.onclick = () => {
  imageOptionsModal.classList.remove('hidden');
  currentImagePickerContext = "item";
};
// --- Cancel image options modal ---
closeImageOptionsBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  currentImagePickerContext = null;
};
// --- Upload photo ---
uploadPhotoBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  itemFileInput.value = "";
  itemImageSource = "upload";
  itemFileInput.click();
};
// --- Take photo (uses camera on mobile) ---
takePhotoBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  itemFileInput.setAttribute('capture', 'environment');
  itemImageSource = "camera";
  itemFileInput.value = "";
  itemFileInput.click();
  setTimeout(() => itemFileInput.removeAttribute('capture'), 1000);
};
// --- Handle file input ---
itemFileInput.onchange = () => {
  const file = itemFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    itemImagePreview.src = e.target.result;
    itemImagePreviewContainer.classList.remove('hidden');
    updateImageActionBtn();
    itemGalleryUrl = "";
  };
  reader.readAsDataURL(file);
};
// --- Choose from library ---
chooseFromLibraryBtn.onclick = async () => {
  imageOptionsModal.classList.add('hidden');
  await openExistingImagesPicker("item");
};

deleteItemImgBtn.onclick = () => {
  itemImagePreview.src = '';
  itemImagePreviewContainer.classList.add('hidden');
  itemModalDeleteImage = true;
  itemGalleryUrl = "";
  updateImageActionBtn();
};

// ---------- ITEM FORM SUBMIT ----------
itemForm.onsubmit = async (e) => {
  e.preventDefault();
  const itemId = document.getElementById('itemId').value || 'item' + Math.random().toString(36).slice(2, 8);
  const previous = (currentArca.items && currentArca.items[itemId]) ? currentArca.items[itemId] : {};

  const name = formItemName.value.trim() || previous.name || "";
  const note = formItemNote.value.trim() || previous.note || "";
  const hashtags = formItemHashtags.value.trim()
    ? formItemHashtags.value.trim().split(',').map(t => t.trim()).filter(Boolean)
    : previous.hashtags || [];

  let imageUrl = previous.image || "";

  // Handle image delete
  if (itemModalDeleteImage && previous.image) {
    try {
      const storagePath = previous.image.split('?')[0].split('/o/')[1].split('?')[0];
      await deleteObject(storageRef(storage, decodeURIComponent(storagePath)));
    } catch (err) {}
    imageUrl = "";
  }

  // Upload new file if picked
  if ((itemImageSource === "upload" || itemImageSource === "camera") && itemFileInput.files && itemFileInput.files[0]) {
    const file = itemFileInput.files[0];
    const imgRef = storageRef(storage, `arcas/${arcaId}/items/${itemId}/${file.name}`);
    await uploadBytes(imgRef, file);
    imageUrl = await getDownloadURL(imgRef);
  }

  // Picked from gallery
  if (itemGalleryUrl) {
    imageUrl = itemGalleryUrl;
  }

  const quantity = previous.quantity || 1;

  const itemObj = {
    name,
    note,
    hashtags,
    image: imageUrl,
    quantity,
  };

  await set(ref(db, `arcas/${arcaId}/items/${itemId}`), itemObj);
  itemModal.classList.add('hidden');
  itemFileInput.value = "";
  itemGalleryUrl = "";
  itemModalDeleteImage = false;
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
    itemFileInput.value = "";
    itemGalleryUrl = "";
    itemModalEditing = true;
    itemModalEditingId = itemId;
    itemModalEditingImage = item.image || null;
    itemModalDeleteImage = false;
    if (item.image) {
      itemImagePreview.src = item.image;
      itemImagePreviewContainer.classList.remove('hidden');
    } else {
      itemImagePreview.src = '';
      itemImagePreviewContainer.classList.add('hidden');
    }
    updateImageActionBtn();
  } else {
    itemForm.reset();
    document.getElementById('itemModalTitle').textContent = 'Add Item';
    document.getElementById('itemId').value = '';
    itemImagePreviewContainer.classList.add('hidden');
    itemImagePreview.src = '';
    itemFileInput.value = "";
    itemGalleryUrl = "";
    itemModalEditing = false;
    itemModalEditingId = null;
    itemModalEditingImage = null;
    itemModalDeleteImage = false;
    updateImageActionBtn();
  }
}

// ---------- MODAL LOGIC FOR ARCA ----------
editArcaBtn.onclick = () => {
  arcaModal.classList.remove('hidden');
  formArcaName.value = currentArca.name || '';
  formArcaType.value = currentArca.type || '';
  formArcaLocation.value = currentArca.location || '';
  formArcaNote.value = currentArca.note || '';
  arcaFileInput.value = "";
  arcaGalleryUrl = "";
  arcaModalEditingImage = currentArca.image || null;
  arcaModalDeleteImage = false;
  if (currentArca.image) {
    arcaImagePreview.src = currentArca.image;
    arcaImagePreviewContainer.classList.remove('hidden');
  } else {
    arcaImagePreview.src = '';
    arcaImagePreviewContainer.classList.add('hidden');
  }
  updateArcaImageActionBtn();
};

closeArcaModalBtn.onclick = () => {
  arcaModal.classList.add('hidden');
};

function updateArcaImageActionBtn() {
  if (arcaImagePreview.src && !arcaImagePreviewContainer.classList.contains('hidden')) {
    arcaImageActionBtn.textContent = 'Replace Image';
  } else {
    arcaImageActionBtn.textContent = 'Add Image';
  }
}

// --- Show image options modal ---
arcaImageActionBtn.onclick = () => {
  imageOptionsModal.classList.remove('hidden');
  currentImagePickerContext = "arca";
};
// --- Cancel image options modal ---
closeImageOptionsBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  currentImagePickerContext = null;
};
// --- Upload photo ---
uploadPhotoBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  arcaFileInput.value = "";
  arcaImageSource = "upload";
  arcaFileInput.click();
};
// --- Take photo (uses camera on mobile) ---
takePhotoBtn.onclick = () => {
  imageOptionsModal.classList.add('hidden');
  arcaFileInput.setAttribute('capture', 'environment');
  arcaImageSource = "camera";
  arcaFileInput.value = "";
  arcaFileInput.click();
  setTimeout(() => arcaFileInput.removeAttribute('capture'), 1000);
};
// --- Handle file input ---
arcaFileInput.onchange = () => {
  const file = arcaFileInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    arcaImagePreview.src = e.target.result;
    arcaImagePreviewContainer.classList.remove('hidden');
    updateArcaImageActionBtn();
    arcaGalleryUrl = "";
  };
  reader.readAsDataURL(file);
};
// --- Choose from library ---
chooseFromLibraryBtn.onclick = async () => {
  imageOptionsModal.classList.add('hidden');
  await openExistingImagesPicker("arca");
};

deleteArcaImgBtn.onclick = () => {
  arcaImagePreview.src = '';
  arcaImagePreviewContainer.classList.add('hidden');
  arcaModalDeleteImage = true;
  arcaGalleryUrl = "";
  updateArcaImageActionBtn();
};

// ---------- ARCA FORM SUBMIT ----------
arcaForm.onsubmit = async (e) => {
  e.preventDefault();
  let imageUrl = currentArca.image || "";

  // Handle image delete
  if (arcaModalDeleteImage && currentArca.image) {
    try {
      const storagePath = currentArca.image.split('?')[0].split('/o/')[1].split('?')[0];
      await deleteObject(storageRef(storage, decodeURIComponent(storagePath)));
    } catch (err) {}
    imageUrl = "";
  }

  // Upload new file if picked
  if ((arcaImageSource === "upload" || arcaImageSource === "camera") && arcaFileInput.files && arcaFileInput.files[0]) {
    const file = arcaFileInput.files[0];
    const imgRef = storageRef(storage, `arcas/${arcaId}/arca-image/${file.name}`);
    await uploadBytes(imgRef, file);
    imageUrl = await getDownloadURL(imgRef);
  }

  // Picked from gallery
  if (arcaGalleryUrl) {
    imageUrl = arcaGalleryUrl;
  }

  const arcaObj = {
    ...currentArca,
    name: formArcaName.value.trim() || currentArca.name || "",
    type: formArcaType.value.trim() || currentArca.type || "",
    location: formArcaLocation.value.trim() || currentArca.location || "",
    note: formArcaNote.value.trim() || currentArca.note || "",
    image: imageUrl
  };

  await update(ref(db, `arcas/${arcaId}`), arcaObj);
  arcaModal.classList.add('hidden');
  arcaFileInput.value = "";
  arcaGalleryUrl = "";
  arcaModalDeleteImage = false;
  await loadArcaData();
};

// ---------- GALLERY PICKER CODE ----------
galleryCancelBtn.onclick = () => {
  existingImagesModal.classList.add('hidden');
  galleryGrid.innerHTML = "";
  currentImagePickerContext = null;
};

async function openExistingImagesPicker(contextType) {
  existingImagesModal.classList.remove('hidden');
  galleryGrid.innerHTML = '<div style="text-align:center;color:#2545a8a0;">Loading...</div>';

  // List images from all arcas/items/arca-image folders.
  let folderPath = "arcas/";
  try {
    const folderRef = storageRef(storage, folderPath);
    const arcaList = await listAll(folderRef);
    let imageRefs = [];
    for (const arcaPrefix of arcaList.prefixes) {
      // Items images
      const itemsRef = storageRef(storage, arcaPrefix.fullPath + "/items/");
      try {
        const itemsList = await listAll(itemsRef);
        imageRefs.push(...itemsList.items);
      } catch {}
      // Arca image
      const arcaImgRef = storageRef(storage, arcaPrefix.fullPath + "/arca-image/");
      try {
        const arcaImgList = await listAll(arcaImgRef);
        imageRefs.push(...arcaImgList.items);
      } catch {}
    }
    if (imageRefs.length === 0) {
      galleryGrid.innerHTML = '<div style="text-align:center;color:#2545a8a0;">No images found.</div>';
      return;
    }
    galleryGrid.innerHTML = "";
    for (const fileRef of imageRefs) {
      const url = await getDownloadURL(fileRef);
      const filename = fileRef.name;
      const div = document.createElement('div');
      div.className = "gallery-item";
      div.innerHTML = `
        <img src="${url}" alt="${filename}">
        <div class="gallery-filename">${filename}</div>
      `;
      div.onclick = () => {
        Array.from(galleryGrid.querySelectorAll('.gallery-item.selected')).forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        if (currentImagePickerContext === "item") {
          itemImagePreview.src = url;
          itemImagePreviewContainer.classList.remove('hidden');
          updateImageActionBtn();
          itemFileInput.value = "";
          itemGalleryUrl = url;
        }
        if (currentImagePickerContext === "arca") {
          arcaImagePreview.src = url;
          arcaImagePreviewContainer.classList.remove('hidden');
          updateArcaImageActionBtn();
          arcaFileInput.value = "";
          arcaGalleryUrl = url;
        }
        setTimeout(() => {
          existingImagesModal.classList.add('hidden');
          galleryGrid.innerHTML = "";
          currentImagePickerContext = null;
        }, 350);
      };
      galleryGrid.appendChild(div);
    }
  } catch (err) {
    galleryGrid.innerHTML = '<div style="text-align:center;color:#d32f2f;">Error loading images.</div>';
  }
}

// ---------- QUANTITY CONTROLS ----------
async function adjustItemQuantity(itemId, delta) {
  const item = currentArca.items[itemId];
  if (!item) return;
  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) {
    if (confirm("Setting quantity to zero will delete this item. Are you sure you want to delete it?")) {
      await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
      showToast("Item deleted", true);
    }
  } else {
    await set(ref(db, `arcas/${arcaId}/items/${itemId}/quantity`), newQty);
    showToast("Quantity updated");
  }
  await loadArcaData();
}

async function deleteItem(itemId) {
  if (confirm("Are you sure you want to delete this item?")) {
    await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
    showToast("Item deleted", true);
    await loadArcaData();
  }
}

// Dashboard navigation
dashboardBtn.onclick = dashboardBtn2.onclick = () => {
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

// Start
initAuth();
