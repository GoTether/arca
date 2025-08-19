// ... (existing imports and setup code remain unchanged) ...

// ---------- MODAL LOGIC FOR ITEMS ----------
// Add/Edit Item Modal logic unchanged except for showing/hiding delete button
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
  updateImageActionBtn();
  document.getElementById('deleteItemBtn').classList.add('hidden');
};

closeItemModalBtn.onclick = () => {
  itemModal.classList.add('hidden');
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
    // Show delete button in modal
    document.getElementById('deleteItemBtn').classList.remove('hidden');
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
    document.getElementById('deleteItemBtn').classList.add('hidden');
  }
}

// --- Modal delete button handler ---
document.getElementById('deleteItemBtn').onclick = async function() {
  const itemId = document.getElementById('itemId').value;
  if (itemId && confirm("Are you sure you want to delete this item?")) {
    await remove(ref(db, `arcas/${arcaId}/items/${itemId}`));
    showToast("Item deleted", true);
    itemModal.classList.add('hidden');
    await loadArcaData();
  }
};


// ---------- ITEM GRID: LONG-PRESS FOR EDIT ----------
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

    // --- Add long-press listener for edit ---
    let pressTimer = null;
    div.addEventListener('mousedown', startPress);
    div.addEventListener('touchstart', startPress);
    div.addEventListener('mouseup', cancelPress);
    div.addEventListener('mouseleave', cancelPress);
    div.addEventListener('touchend', cancelPress);

    function startPress(e) {
      cancelPress();
      pressTimer = setTimeout(() => {
        openItemModal(true, itemId);
      }, 500); // 500ms for long-press
    }
    function cancelPress() {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    }

    itemsList.appendChild(div);
  });

  // Quantity button handlers
  itemsList.querySelectorAll('button[data-action="decr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, -1);
  });
  itemsList.querySelectorAll('button[data-action="incr"]').forEach(btn => {
    const id = btn.getAttribute('data-id');
    btn.onclick = () => adjustItemQuantity(id, 1);
  });
}

// ... (rest of your JS remains unchanged) ...
