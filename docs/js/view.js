// Demo logic: replace with Firebase and utility imports for production.
// import { db, storage, auth } from './shared.js';

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
const formItemImage = document.getElementById('formItemImage');
const closeItemModalBtn = document.getElementById('closeItemModal');
const dashboardBtn = document.getElementById('dashboardBtn');
const toastEl = document.getElementById('toast');

// Dummy data for demonstration
let currentArca = {
  name: 'Demo Arca',
  type: 'Box',
  location: 'Shelf A',
  note: 'Sample note.',
  image: 'https://placekitten.com/200/200',
  id: 'demo-id',
  items: {
    "item1": {
      name: "Item One",
      note: "First item",
      hashtags: ["tag1", "tag2"],
      image: "https://placekitten.com/100/100",
      quantity: 2,
    },
    "item2": {
      name: "Item Two",
      note: "Second item",
      hashtags: ["tag3"],
      image: "https://placekitten.com/101/101",
      quantity: 1,
    }
  }
};

function showToast(msg, warn = false) {
  toastEl.textContent = msg;
  toastEl.style.background = warn ? "#ff4b4b" : "#333b";
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1500 + Math.max(0, msg.length * 25));
}

function displayArca() {
  arcaDetailsSection.classList.remove('hidden');
  itemsSection.classList.remove('hidden');
  // Image
  if (currentArca.image) {
    arcaImageEl.src = currentArca.image;
    arcaImageEl.classList.remove('hidden');
  } else {
    arcaImageEl.classList.add('hidden');
  }
  // Details
  arcaNameEl.textContent = currentArca.name || '';
  arcaTypeEl.textContent = currentArca.type || '';
  arcaLocationEl.textContent = currentArca.location || '';
  arcaNoteEl.textContent = currentArca.note || '';
  arcaIdDisplayEl.textContent = currentArca.id || '';
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

itemForm.onsubmit = (e) => {
  e.preventDefault();
  const name = formItemName.value.trim();
  if (!name) return;
  // Add item with quantity 1
  const newId = document.getElementById('itemId').value || 'item' + Math.random().toString(36).slice(2, 8);
  currentArca.items[newId] = {
    name,
    note: formItemNote.value.trim(),
    hashtags: formItemHashtags.value.trim().split(',').map(t => t.trim()).filter(Boolean),
    image: '', // Implement upload logic as needed
    quantity: 1,
  };
  itemModal.classList.add('hidden');
  displayArca();
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

function adjustItemQuantity(itemId, delta) {
  const item = currentArca.items[itemId];
  if (!item) return;
  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) {
    // Show warning before delete
    if (confirm("Setting quantity to zero will delete this item. Are you sure you want to delete it?")) {
      delete currentArca.items[itemId];
      showToast("Item deleted", true);
    }
  } else {
    item.quantity = newQty;
    showToast("Quantity updated");
  }
  displayArca();
}

function deleteItem(itemId) {
  if (confirm("Are you sure you want to delete this item?")) {
    delete currentArca.items[itemId];
    showToast("Item deleted", true);
    displayArca();
  }
}

// Dashboard navigation
dashboardBtn.onclick = () => {
  window.location.href = "dashboard.html";
};

// Initial display
displayArca();
