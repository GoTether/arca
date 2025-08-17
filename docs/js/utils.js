// /js/utils.js – tiny DOM helpers + query params
export const qs = (s, el=document) => el.querySelector(s);
export const qsa = (s, el=document) => [...el.querySelectorAll(s)];
export const byId = (id) => document.getElementById(id);
export const param = (k) => new URL(location.href).searchParams.get(k);

export function toast(msg) {
  const t = document.createElement('div');
  t.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-black/80 text-white text-sm shadow-lg z-50';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
