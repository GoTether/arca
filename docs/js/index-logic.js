// index-logic.js for improved index.html with modern UI and interaction

// Elements
const arcaForm = document.getElementById('arca-form');
const arcaIdInput = document.getElementById('arca-id');
const scanBtn = document.getElementById('scan-btn');
const toast = document.getElementById('arca-toast');

// Helper: show toast notification
function showToast(message, duration = 2300) {
  toast.textContent = message;
  toast.style.display = 'block';
  toast.style.opacity = '1';
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.style.display = 'none', 350);
  }, duration);
}

// Form submit handler
arcaForm.addEventListener('submit', function (e) {
  e.preventDefault();
  const arcaId = arcaIdInput.value.trim();
  if (!arcaId) {
    showToast('Please enter a valid Arca ID.');
    arcaIdInput.focus();
    return;
  }
  // Replace with your actual logic for finding/creating Arca
  showToast(`Looking up Arca "${arcaId}"...`);
  setTimeout(() => {
    // Simulate navigation or action
    window.location.href = `dashboard.html?id=${encodeURIComponent(arcaId)}`;
  }, 1100);
});

// Scan QR code stub (add actual scanner logic if needed)
scanBtn.addEventListener('click', function () {
  showToast('QR Scan feature coming soon!');
  // Example for integration: open a modal or use a library like html5-qrcode
});

// Optional: Autofocus input on page load
window.addEventListener('DOMContentLoaded', () => {
  arcaIdInput.focus();
});
