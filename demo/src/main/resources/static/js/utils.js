"use strict";

export function formatPrice(p) {
  return p.toLocaleString("vi-VN") + "đ";
}

export function showToast(msg, icon = "✅", type = "success") {
  const t = document.getElementById("toast");
  if (!t) return;
  t.className = `toast toast--${type} show`;
  t.innerHTML = `<span class="toast-icon">${icon}</span> ${msg}`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

export function renderStars(rating) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  let s = "";
  for (let i = 0; i < full; i++) s += '<i class="fas fa-star"></i>';
  if (half) s += '<i class="fas fa-star-half-stroke"></i>';
  const empty = 5 - full - (half ? 1 : 0);
  for (let i = 0; i < empty; i++) s += '<i class="far fa-star"></i>';
  return s;
}

export function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}
