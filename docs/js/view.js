// Reverted and cleaned logic with dynamic "N Items" badge update

// Replace these imports with your actual Firebase and utility imports
// import { db, storage, auth } from './shared.js';
// import { ref, get, set, update, push, remove } from 'firebase/database';
// import { uploadBytes, getDownloadURL, ref as sRef, deleteObject } from 'firebase/storage';
// import { getQueryParam, resizeImage, showToast } from './utils.js';
// import { initLogout } from './auth.js';

// DOM Elements
const arcaImageEl = document.getElementById('arcaImage');
const addItemBtn = document.getElementById('addItemBtn');
const itemModal = document.getElementById('itemModal');
const itemForm = document.getElementById('itemForm');
const formItemName = document.getElementById('formItemName');
const formItemNote = document.getElementById('formItemNote');
const formItemHashtags = document.getElementById('formItemHashtags');
const formItemImage = document.getElementById('formItemImage');
const closeItemModalBtn = document.getElementById('closeItemModal');
const itemsList = document.getElementById('itemsList');
const arcaTotalItemsEl = document.getElementById('arcaTotalItems');

// Dummy data for demonstration
let currentArca = {
  name: 'Demo Arca',
  type: 'Box',
  location: 'Shelf A',
  note: 'Sample note.',
  image: 'https://placekitten.com/200/200',
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

function displayArca() {
  // Show image if available
  if (currentArca.image) {
    arcaImageEl.src = currentArca.image;
    arcaImageEl.classList.remove('hidden');
  } else {
    arcaImageEl.classList.add('hidden');
  }
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
      <div class="chunky-item-hashtags">${item.hashtags.map(t => `<span>#${t}</span>`).join(' ')}</div>
      <div class="chunky-quantity-controls">
        <button class="chunky-qty-btn minus" data-action="decr" data-id="${itemId}">−</button>
        <span class="chunky-quantity-value" id="qty-${itemId}">${item.quantity}</span>
        <button class="chunky-qty-btn plus" data-action="incr" data-id="${itemId}">+</button>
      </div>
    `;
    itemsList.appendChild(div);
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

function updateTotalItemsDisplay() {
  const totalQty = Object.values(currentArca.items || {}).reduce(
    (sum, item) => sum + (typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1),
    0
  );
  arcaTotalItemsEl.textContent = `${totalQty} Items`;
  arcaTotalItemsEl.classList.toggle('hidden', totalQty === 0);
}

// Add Item Modal Logic
addItemBtn.addEventListener('click', () => {
  itemModal.classList.remove('hidden');
});
closeItemModalBtn.addEventListener('click', () => {
  itemModal.classList.add('hidden');
});
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = formItemName.value.trim();
  if (!name) return;
  // Add item with quantity 1
  const newId = 'item' + Math.random().toString(36).slice(2, 8);
  currentArca.items[newId] = {
    name,
    note: formItemNote.value.trim(),
    hashtags: formItemHashtags.value.trim().split(',').map(t => t.trim()).filter(Boolean),
    image: '', // Implement upload logic as needed
    quantity: 1,
  };
  itemModal.classList.add('hidden');
  displayArca();
});

// Quantity adjustment logic
function adjustItemQuantity(itemId, delta) {
  const item = currentArca.items[itemId];
  if (!item) return;
  let newQty = (item.quantity || 1) + delta;
  if (newQty < 1) {
    if (confirm("Setting quantity to zero will delete this item. Proceed?")) {
      delete currentArca.items[itemId];
    } else {
      return;
    }
  } else {
    item.quantity = newQty;
  }
  displayArca();
}

// Initial display
displayArca();
