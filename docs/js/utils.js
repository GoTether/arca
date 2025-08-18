// utils.js
// Common helper functions for Arca app

// Resize an image to a maximum dimension while maintaining aspect ratio.
// Returns a Promise that resolves with a Blob of the resized JPEG image.
export function resizeImage(file, maxSize = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        // Scale dimensions proportionally
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Parse query parameters from current URL.
export function getQueryParam(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// Format a timestamp into a readable date/time string.
export function formatDate(ts) {
  const date = new Date(ts);
  return date.toLocaleString();
}

// Show a simple toast notification. Requires Tailwind classes for styling.
export function showToast(message) {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.className =
    'fixed bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded shadow-lg z-50';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
