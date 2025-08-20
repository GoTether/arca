// ... [all your firebase imports and config as before] ...

// DOM elements
// ... [all your DOM element assignments as before] ...

// UI helpers (modal backdrop logic added)
function showToast(msg, warn = false) {
  toastEl.textContent = msg;
  toastEl.style.background = warn ? "linear-gradient(90deg,#d32f2f 0%,#ff4b4b 100%)" : "linear-gradient(90deg,#4757db 0%,#4c90d2 100%)";
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
function showModal(modal) {
  document.getElementById('modalBackdrop').classList.add('active');
  modal.classList.add('active');
}
function hideModal(modal) {
  document.getElementById('modalBackdrop').classList.remove('active');
  modal.classList.remove('active');
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

    // Make image, name, note, hashtags into one button for long-press
    const editBtn = document.createElement('button');
    editBtn.className = 'chunky-edit-btn';
    editBtn.type = 'button';
    editBtn.tabIndex = -1;
    editBtn.innerHTML = `
      ${item.image ? `<img src="${item.image}" class="chunky-item-img" draggable="false" />` : '<div class="chunky-item-img"></div>'}
      <div class="chunky-item-name">${item.name}</div>
      ${item.note ? `<div class="chunky-item-note">${item.note}</div>` : ''}
      <div class="chunky-item-hashtags">${(item.hashtags||[]).map(t => `<span>#${t}</span>`).join(' ')}</div>
    `;

    // --- Long-press logic for edit modal ---
    let pressTimer = null;
    let longPressTriggered = false;
    editBtn.addEventListener('mousedown', startPress);
    editBtn.addEventListener('touchstart', startPress);
    editBtn.addEventListener('mouseup', cancelPress);
    editBtn.addEventListener('mouseleave', cancelPress);
    editBtn.addEventListener('touchend', cancelPress);

    function startPress(e) {
      longPressTriggered = false;
      // Prevent default to avoid highlight/copy menu
      e.preventDefault();
      cancelPress();
      pressTimer = setTimeout(() => {
        longPressTriggered = true;
        openItemModal(true, itemId);
      }, 500);
    }
    function cancelPress(e) {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }

    // Also allow normal click to open edit modal (for accessibility)
    editBtn.onclick = (e) => {
      // Only trigger if not from longPress
      if (!longPressTriggered) openItemModal(true, itemId);
    };

    // Prevent context menu on long-press (image, text)
    editBtn.oncontextmenu = (e) => e.preventDefault();

    div.appendChild(editBtn);

    // Quantity controls remain as real buttons (not in editBtn)
    const controls = document.createElement('div');
    controls.className = 'chunky-quantity-controls';
    controls.innerHTML = `
      <button class="chunky-qty-btn minus" data-action="decr" data-id="${itemId}" title="Decrease quantity">−</button>
      <span class="chunky-quantity-value" id="qty-${itemId}">${item.quantity}</span>
      <button class="chunky-qty-btn plus" data-action="incr" data-id="${itemId}" title="Increase quantity">+</button>
    `;
    div.appendChild(controls);

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
  showModal(itemModal);
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
  updateImageActionBtn();
  deleteItemBtn.classList.add('hidden');
  deleteItemBtn.onclick = null;
};

closeItemModalBtn.onclick = () => {
  hideModal(itemModal);
};

function updateImageActionBtn() {
  if (itemImagePreview.src && !itemImagePreviewContainer.classList.contains('hidden')) {
    itemImageActionBtn.textContent = 'Replace Image';
  } else {
    itemImageActionBtn.textContent = 'Add Image';
  }
}

// --- Show image options modal for items/arcas ---
itemImageActionBtn.onclick = () => {
  showModal(imageOptionsModal);
  imageOptionsModal.dataset.context = 'item';
};

arcaImageActionBtn.onclick = () => {
  showModal(imageOptionsModal);
  imageOptionsModal.dataset.context = 'arca';
};

// --- Handle "Take a photo" and "Upload a photo" ---
takePhotoBtn.onclick = () => {
  hideModal(imageOptionsModal);
  if (imageOptionsModal.dataset.context === 'item') {
    itemFileInput.value = "";
    itemImageSource = "upload";
    itemFileInput.setAttribute('capture', 'environment');
    itemFileInput.click();
    setTimeout(() => itemFileInput.removeAttribute('capture'), 1000);
  } else if (imageOptionsModal.dataset.context === 'arca') {
    arcaFileInput.value = "";
    arcaImageSource = "upload";
    arcaFileInput.setAttribute('capture', 'environment');
    arcaFileInput.click();
    setTimeout(() => arcaFileInput.removeAttribute('capture'), 1000);
  }
};

uploadPhotoBtn.onclick = () => {
  hideModal(imageOptionsModal);
  if (imageOptionsModal.dataset.context === 'item') {
    itemFileInput.value = "";
    itemImageSource = "upload";
    itemFileInput.removeAttribute('capture');
    itemFileInput.click();
  } else if (imageOptionsModal.dataset.context === 'arca') {
    arcaFileInput.value = "";
    arcaImageSource = "upload";
    arcaFileInput.removeAttribute('capture');
    arcaFileInput.click();
  }
};

closeImageOptionsBtn.onclick = () => {
  hideModal(imageOptionsModal);
};

// --- File input change handlers ---
itemFileInput.onchange = () => {
  const file = itemFileInput.files[0];
  if (!file) return;
  itemImageSource = "upload";
  const reader = new FileReader();
  reader.onload = (e) => {
    itemImagePreview.src = e.target.result;
    itemImagePreviewContainer.classList.remove('hidden');
    updateImageActionBtn();
  };
  reader.readAsDataURL(file);
};

deleteItemImgBtn.onclick = () => {
  itemImagePreview.src = '';
  itemImagePreviewContainer.classList.add('hidden');
  itemModalDeleteImage = true;
  updateImageActionBtn();
};

async function compressAndUploadImage(file, storagePath) {
  const options = {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1080,
    useWebWorker: true,
  };
  const compressedFile = await imageCompression(file, options);
  const imgRef = storageRef(storage, storagePath);
  await uploadBytes(imgRef, compressedFile);
  return await getDownloadURL(imgRef);
}

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

  if (itemModalDeleteImage && previous.image) {
    try {
      const storagePath = previous.image.split('?')[0].split('/o/')[1].split('?')[0];
      await deleteObject(storageRef(storage, decodeURIComponent(storagePath)));
    } catch (err) {}
    imageUrl = "";
  }

  if (itemImageSource === "upload" && itemFileInput.files && itemFileInput.files[0]) {
    const file = itemFileInput.files[0];
    imageUrl = await compressAndUploadImage(file, `arcas/${arcaId}/items/${itemId}/${file.name}`);
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
  hideModal(itemModal);
  itemFileInput.value = "";
  itemModalDeleteImage = false;
  itemImageSource = null;
  await loadArcaData();
};

function openItemModal(isEdit, itemId) {
  showModal(itemModal);
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
    } else {
      itemImagePreview.src = '';
      itemImagePreviewContainer.classList.add('hidden');
    }
    updateImageActionBtn();
    deleteItemBtn.classList.remove('hidden');
    deleteItemBtn.onclick = async function() {
      if (confirm("Are you sure you want to delete this item?")) {
        await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
        showToast("Item deleted", true);
        hideModal(itemModal);
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
  }
}

// ---------- MODAL LOGIC FOR ARCA ----------
editArcaBtn.onclick = () => {
  showModal(arcaModal);
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
  updateArcaImageActionBtn();
};

closeArcaModalBtn.onclick = () => {
  hideModal(arcaModal);
};

function updateArcaImageActionBtn() {
  if (arcaImagePreview.src && !arcaImagePreviewContainer.classList.contains('hidden')) {
    arcaImageActionBtn.textContent = 'Replace Image';
  } else {
    arcaImageActionBtn.textContent = 'Add Image';
  }
}

arcaFileInput.onchange = () => {
  const file = arcaFileInput.files[0];
  if (!file) return;
  arcaImageSource = "upload";
  const reader = new FileReader();
  reader.onload = (e) => {
    arcaImagePreview.src = e.target.result;
    arcaImagePreviewContainer.classList.remove('hidden');
    updateArcaImageActionBtn();
  };
  reader.readAsDataURL(file);
};

deleteArcaImgBtn.onclick = () => {
  arcaImagePreview.src = '';
  arcaImagePreviewContainer.classList.add('hidden');
  arcaModalDeleteImage = true;
  updateArcaImageActionBtn();
};

arcaForm.onsubmit = async (e) => {
  e.preventDefault();
  let imageUrl = currentArca.image || "";

  if (arcaModalDeleteImage && currentArca.image) {
    try {
      const storagePath = currentArca.image.split('?')[0].split('/o/')[1].split('?')[0];
      await deleteObject(storageRef(storage, decodeURIComponent(storagePath)));
    } catch (err) {}
    imageUrl = "";
  }

  if (arcaImageSource === "upload" && arcaFileInput.files && arcaFileInput.files[0]) {
    const file = arcaFileInput.files[0];
    imageUrl = await compressAndUploadImage(file, `arcas/${arcaId}/arca-image/${file.name}`);
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
  hideModal(arcaModal);
  arcaFileInput.value = "";
  arcaModalDeleteImage = false;
  arcaImageSource = null;
  await loadArcaData();
};

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

dashboardBtn.onclick = dashboardBtn2.onclick = () => {
  window.location.href = "index.html";
};

if (goToArcaBtn) {
  goToArcaBtn.onclick = () => {
    const enteredId = enterArcaId.value.trim();
    if (enteredId) {
      window.location.href = `view.html?id=${enteredId}`;
    }
  };
}

window.addEventListener("orientationchange", () => {
  document.body.classList.add("orientation-changed");
  setTimeout(() => document.body.classList.remove("orientation-changed"), 100);
});

initAuth();
