// Index: Enter to open (always), no scan/new language, elegant behavior

// If user somehow arrives with ?id=..., redirect (defense-in-depth)
(function immediateRedirectOnId() {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && id.trim()) {
      window.location.replace('dashboard.html?id=' + encodeURIComponent(id.trim()));
    }
  } catch (e) {}
})();

const form = document.getElementById('arca-form');
const input = document.getElementById('arca-id');

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = (input.value || '').trim();
  if (!id) {
    input.focus();
    input.setAttribute('aria-invalid', 'true');
    return;
  }
  window.location.href = `dashboard.html?id=${encodeURIComponent(id)}`;
});

// Ensure Enter always submits from the input (explicit, even though forms do this by default)
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    form.requestSubmit ? form.requestSubmit() : form.submit();
  }
});

window.addEventListener('DOMContentLoaded', () => input?.focus());
