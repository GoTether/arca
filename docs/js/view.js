// Minimal working JS for Arca Viewer

// Replace these with your actual Firebase imports/setup
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
}

function updateTotalItemsDisplay() {
  const numItems = currentArca.items ? Object.keys(currentArca.items).length : 0;
  arcaTotalItemsEl.textContent = numItems;
  arcaTotalItemsEl.classList.toggle('hidden', numItems === 0);
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

// Initial display
displayArca();
