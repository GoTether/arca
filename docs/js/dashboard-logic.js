// Dashboard logic — Firebase Realtime Database + Storage, adapted to "arca" branch and your schema.
import {
  getArcaById,
  createArca,
  updateArca,
  addItem as dbAddItem,
  archiveItem as dbArchiveItem,
  uploadArcaPhoto,
  searchItemsByName
} from "./firebase.js";

const toastEl = document.getElementById("toast");
function toast(msg, ms = 2000) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  setTimeout(() => (toastEl.style.display = "none"), ms);
}

// Parse ID (required)
const params = new URLSearchParams(location.search);
const arcaId = (params.get("id") || "").trim();
if (!arcaId) location.replace("index.html");

// Header
document.getElementById("header-id").textContent = arcaId ? `ID: ${arcaId}` : "No ID";
const statusPill = document.getElementById("status-pill");

// Elements
const viewExisting = document.getElementById("view-existing");
const viewSetup = document.getElementById("view-setup");

const arcaNameEl = document.getElementById("arca-name");
const arcaDescEl = document.getElementById("arca-description");
const arcaLocationEl = document.getElementById("arca-location");

const arcaPhotoEl = document.getElementById("arca-photo");
const photoPlaceholderEl = document.getElementById("photo-placeholder");
const photoBtn = document.getElementById("photo-btn");
const photoInput = document.getElementById("photo-input");

const setupForm = document.getElementById("setup-form");
const setupName = document.getElementById("setup-name");
const setupDesc = document.getElementById("setup-description");
const setupLocation = document.getElementById("setup-location");
const setupPhoto = document.getElementById("setup-photo");

const renameBtn = document.getElementById("rename-btn");
const locationBtn = document.getElementById("location-btn");

// Items UI
const itemsSectionEl = document.getElementById("items-section");
const itemsGateHintEl = document.getElementById("items-gate-hint");
const itemsEmptyEl = document.getElementById("items-empty");
const itemsListEl = document.getElementById("items-list");
const addItemToggleBtn = document.getElementById("add-item-toggle");
const addItemForm = document.getElementById("add-item-form");
const itemNameInput = document.getElementById("item-name");
const itemQtyInput = document.getElementById("item-qty");
const itemNoteInput = document.getElementById("item-note");
const addItemCancelBtn = document.getElementById("add-item-cancel");

// Embedded Search UI (created dynamically so no HTML changes needed)
let searchBuilt = false;
let searchInput, searchBtn, searchClearBtn, searchResultsEl, searchWrap;

function ensureSearchUI() {
  if (searchBuilt) return;
  searchWrap = document.createElement("section");
  searchWrap.id = "dash-search";
  searchWrap.style.margin = "12px 0";
  searchWrap.innerHTML = `
    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
      <input id="dash-search-input" type="search" placeholder="Search all Arcas for items…" style="flex:1; min-width:240px; padding:10px 12px; border:1px solid #d7e4ff; border-radius:12px; outline:none;" />
      <button id="dash-search-btn" type="button" style="padding:10px 14px; border-radius:12px; background:#4f46e5; color:white; border:0;">Search</button>
      <button id="dash-search-clear" type="button" style="padding:10px 12px; border-radius:12px; background:#e5e7eb; color:#111827; border:0;">Clear</button>
    </div>
    <div id="dash-search-results" style="margin-top:10px;"></div>
  `;
  // Insert above items section if possible, else at top of existing view
  if (itemsSectionEl && itemsSectionEl.parentNode) {
    itemsSectionEl.parentNode.insertBefore(searchWrap, itemsSectionEl);
  } else if (viewExisting) {
    viewExisting.insertBefore(searchWrap, viewExisting.firstChild);
  } else {
    document.body.insertBefore(searchWrap, document.body.firstChild);
  }

  searchInput = searchWrap.querySelector("#dash-search-input");
  searchBtn = searchWrap.querySelector("#dash-search-btn");
  searchClearBtn = searchWrap.querySelector("#dash-search-clear");
  searchResultsEl = searchWrap.querySelector("#dash-search-results");

  function renderNotice(msg) {
    searchResultsEl.innerHTML = `<p style="color:#6b7280;">${msg}</p>`;
  }
  function renderResults(rows) {
    if (!rows || rows.length === 0) {
      renderNotice("No results.");
      return;
    }
    const frag = document.createDocumentFragment();
    rows.forEach((r) => {
      const row = document.createElement("div");
      row.style.cssText = "display:flex; gap:10px; align-items:start; padding:10px 0; border-bottom:1px solid #eef3ff;";
      const thumb = document.createElement("div");
      thumb.style.cssText = "width:56px; height:56px; border-radius:10px; background:#f3f4f6; overflow:hidden; flex:0 0 56px; display:grid; place-items:center;";
      if (r.image) {
        const img = document.createElement("img");
        img.src = r.image;
        img.alt = "";
        img.style.cssText = "width:100%; height:100%; object-fit:cover;";
        thumb.appendChild(img);
      } else {
        thumb.innerHTML = `<span style="font-size:12px; color:#9ca3af;">No image</span>`;
      }

      const main = document.createElement("div");
      main.style.cssText = "flex:1;";
      const title = document.createElement("div");
      title.textContent = r.name;
      title.style.cssText = "font-weight:600;";
      const meta = document.createElement("div");
      const qtyTxt = Number.isFinite(r.qty) ? ` • Qty: ${r.qty}` : "";
      meta.textContent = `Arca: ${r.arcaId}${qtyTxt}`;
      meta.style.cssText = "font-size:12px; color:#6b7280;";

      main.appendChild(title);
      main.appendChild(meta);

      const actions = document.createElement("div");
      const open = document.createElement("a");
      open.textContent = r.arcaId === arcaId ? "Open here" : "Open";
      open.href = `./dashboard.html?id=${encodeURIComponent(r.arcaId)}`;
      open.style.cssText = "padding:8px 10px; border-radius:10px; background:#e7efff; color:#0f3fa1; border:1px solid #cfe0ff; text-decoration:none; white-space:nowrap;";
      if (r.arcaId === arcaId) {
        // Already on this Arca: keep link but also scroll to items section
        open.addEventListener("click", (e) => {
          e.preventDefault();
          itemsSectionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
      actions.appendChild(open);

      row.appendChild(thumb);
      row.appendChild(main);
      row.appendChild(actions);
      frag.appendChild(row);
    });
    searchResultsEl.innerHTML = "";
    searchResultsEl.appendChild(frag);
  }

  async function runSearch() {
    const q = (searchInput.value || "").trim();
    if (!q) {
      searchResultsEl.innerHTML = "";
      return;
    }
    renderNotice("Searching…");
    try {
      const rows = await searchItemsByName(q, { limit: 100 });
      renderResults(rows);
    } catch (err) {
      console.error(err);
      renderNotice("Search failed. Check database rules for read access to /arca.");
    }
  }

  let typingTimer;
  function debounceRun() {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(runSearch, 280);
  }

  searchBtn.addEventListener("click", runSearch);
  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchResultsEl.innerHTML = "";
    searchInput.focus();
  });
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });
  searchInput.addEventListener("input", debounceRun);

  searchBuilt = true;
}

// Render
function renderExisting(arca) {
  viewSetup.hidden = true;
  viewExisting.hidden = false;
  statusPill.textContent = "Active";

  arcaNameEl.textContent = arca.name || arca.id;
  // Your DB uses "notes" at the arca level
  arcaDescEl.textContent = arca.notes || "";

  const loc = (arca.location || "").trim();
  arcaLocationEl.textContent = loc || "Not set";

  const hasPhoto = Boolean(arca.photo);
  if (hasPhoto) {
    arcaPhotoEl.src = arca.photo;
    arcaPhotoEl.hidden = false;
    photoPlaceholderEl.style.display = "none";
  } else {
    arcaPhotoEl.hidden = true;
    arcaPhotoEl.removeAttribute("src");
    photoPlaceholderEl.style.display = "flex";
  }
  photoBtn.textContent = hasPhoto ? "Change photo" : "Add photo";

  // If you already have items in DB, show them even without a photo.
  const hasItems = Array.isArray(arca.items) && arca.items.length > 0;
  itemsSectionEl.hidden = !(hasPhoto || hasItems);
  itemsGateHintEl.hidden = hasPhoto || hasItems;

  // Build or keep the embedded search UI
  ensureSearchUI();

  renderItems(arca.items || []);
}

function renderSetup() {
  viewExisting.hidden = true;
  viewSetup.hidden = false;
  statusPill.textContent = "New";
  setupName.value = arcaId || "Arca1";
  setTimeout(() => setupName.focus(), 0);
}

function renderItems(items) {
  if (!itemsEmptyEl || !itemsListEl) return;

  if (!items || items.length === 0) {
    itemsEmptyEl.style.display = "block";
  } else {
    itemsEmptyEl.style.display = "none";
  }

  itemsListEl.innerHTML = "";
  (items || []).forEach((it) => {
    const li = document.createElement("li");
    li.className = "item-row";
    li.dataset.itemId = it.id;

    const main = document.createElement("div");
    main.className = "item-main";

    const nameEl = document.createElement("p");
    nameEl.className = "item-name";
    nameEl.textContent = it.name;

    const metaEl = document.createElement("div");
    metaEl.className = "item-meta";
    const qtyTxt =
      typeof it.qty === "number" && !Number.isNaN(it.qty) ? `Qty: ${it.qty}` : "";
    metaEl.textContent = qtyTxt;

    const noteEl = document.createElement("p");
    noteEl.className = "item-note";
    noteEl.textContent = it.notes || "";

    main.appendChild(nameEl);
    if (qtyTxt) main.appendChild(metaEl);
    if (it.notes && it.notes.trim()) main.appendChild(noteEl);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-soft btn-sm danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", async () => {
      await removeItem(it.id);
    });

    actions.appendChild(removeBtn);

    li.appendChild(main);
    li.appendChild(actions);

    itemsListEl.appendChild(li);
  });
}

// Items ops
async function addItem(data) {
  await dbAddItem(arcaId, data);
  const arca = await getArcaById(arcaId);
  if (arca) {
    currentArca = arca;
    renderExisting(arca);
    toast("Item added");
  }
}
async function removeItem(itemId) {
  await dbArchiveItem(arcaId, itemId);
  const arca = await getArcaById(arcaId);
  if (arca) {
    currentArca = arca;
    renderExisting(arca);
    toast("Item removed");
  }
}

// Init
let currentArca = null;
(async function init() {
  try {
    currentArca = await getArcaById(arcaId);
    if (currentArca) renderExisting(currentArca);
    else renderSetup();
  } catch (err) {
    console.error(err);
    toast("Error loading Arca");
  }
})();

// Setup submit (Enter to save; textarea allows Shift+Enter for newline)
setupForm?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement && !e.shiftKey)) {
    e.preventDefault();
    setupForm.requestSubmit ? setupForm.requestSubmit() : setupForm.submit();
  }
});
setupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = (setupName?.value || "").trim();
  if (!name) {
    setupName?.focus();
    return toast("Name is required");
  }

  const file = setupPhoto?.files?.[0];
  const locationVal = (setupLocation?.value || "").trim();

  try {
    let photoUrl = null;
    if (file) {
      photoUrl = await uploadArcaPhoto(arcaId, file);
    }
    const arca = await createArca(arcaId, {
      name,
      notes: (setupDesc?.value || "").trim(), // map description -> notes
      location: locationVal || null,
      photo: photoUrl || null
    });
    currentArca = arca;
    toast("Saved");
    renderExisting(arca);
  } catch (err) {
    console.error(err);
    toast("Could not save");
  }
});

// Photo button
photoBtn?.addEventListener("click", () => photoInput?.click());
photoInput?.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  photoInput.value = ""; // allow choosing the same file again later
  if (!file) return;
  try {
    const photoUrl = await uploadArcaPhoto(arcaId, file);
    currentArca = await updateArca(arcaId, { photo: photoUrl });
    toast("Photo updated");
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast("Could not update photo");
  }
});

// Rename
renameBtn?.addEventListener("click", async () => {
  const newName = prompt("New name", currentArca?.name || "");
  if (newName === null) return; // cancel
  try {
    currentArca = await updateArca(arcaId, { name: newName.trim() });
    toast("Renamed");
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast("Could not rename");
  }
});

// Edit location
locationBtn?.addEventListener("click", async () => {
  const newLoc = prompt("Location", currentArca?.location || "");
  if (newLoc === null) return; // cancel
  try {
    const trimmed = newLoc.trim();
    currentArca = await updateArca(arcaId, { location: trimmed || null });
    toast(trimmed ? "Location updated" : "Location cleared");
    renderExisting(currentArca);
  } catch (err) {
    console.error(err);
    toast("Could not update location");
  }
});

// Add item UI events
addItemToggleBtn?.addEventListener("click", () => {
  addItemForm.hidden = !addItemForm.hidden;
  if (!addItemForm.hidden) {
    itemNameInput.value = "";
    itemQtyInput.value = "";
    itemNoteInput.value = "";
    itemNameInput.focus();
  }
});
addItemCancelBtn?.addEventListener("click", () => {
  addItemForm.hidden = true;
});
addItemForm?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement && !e.shiftKey)) {
    e.preventDefault();
    addItemForm.requestSubmit ? addItemForm.requestSubmit() : addItemForm.submit();
  }
});
addItemForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = (itemNameInput?.value || "").trim();
  if (!name) {
    itemNameInput?.focus();
    return;
  }
  let qtyVal = itemQtyInput?.value;
  const qty = qtyVal === "" ? undefined : Number(qtyVal);
  const notes = (itemNoteInput?.value || "").trim();
  await addItem({ name, qty: Number.isFinite(qty) ? qty : undefined, notes: notes || undefined });
  addItemForm.hidden = true;
});
