"use strict";

// Khởi tạo dữ liệu từ LocalStorage với đúng Key đã thống nhất
let cart = JSON.parse(localStorage.getItem("gm_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("gm_wishlist") || "[]");

// Hàm lưu dữ liệu vào kho (LocalStorage)
function saveCart() {
  localStorage.setItem("gm_cart", JSON.stringify(cart));
}
function saveWishlist() {
  localStorage.setItem("gm_wishlist", JSON.stringify(wishlist));
}

// HÀM QUAN TRỌNG NHẤT: "Bơm" dữ liệu giỏ hàng lên giao diện
function updateCartUI() {
  // 1. Cập nhật số lượng trên các Badge (biểu tượng giỏ hàng)
  const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll(".cart-badge").forEach((badge) => {
    badge.textContent = totalQty;
    badge.classList.toggle("has-items", totalQty > 0);
  });

  // 2. Kiểm tra xem có đang ở trang có giỏ hàng (Sidebar hoặc Checkout) không
  const cartBody =
    document.getElementById("cartItems") ||
    document.getElementById("checkoutItemsList");
  const cartFooter = document.getElementById("cartFooter");
  if (!cartBody) return;

  // 3. Nếu giỏ hàng trống -> Bơm giao diện trống
  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty__icon">🛒</div>
        <p>Giỏ hàng của bạn đang trống</p>
        <a href="category.html" class="btn-shop-now">Mua sắm ngay</a>
      </div>`;
    if (cartFooter) cartFooter.style.display = "none";
    // Reset các con số về 0
    const fields = [
      "cartTotal",
      "cartSubtotal",
      "cartShipping",
      "checkoutFinalTotal",
      "checkoutSubtotal",
      "checkoutShipping",
    ];
    fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "0đ";
    });
    return;
  }

  // 4. Tính toán tiền bạc
  if (cartFooter) cartFooter.style.display = "block";
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const isFreeShip = subtotal >= 200000;
  const shipping = isFreeShip ? 0 : 30000;
  const finalTotal = subtotal + shipping;

  // 5. "Bơm" các con số tổng tiền vào đúng vị trí (Dùng cho cả Sidebar và trang Checkout)
  const setTxt = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  setTxt("cartSubtotal", formatPrice(subtotal));
  setTxt("checkoutSubtotal", formatPrice(subtotal));

  setTxt("cartShipping", isFreeShip ? "Miễn phí 🎉" : formatPrice(shipping));
  setTxt(
    "checkoutShipping",
    isFreeShip ? "Miễn phí 🎉" : formatPrice(shipping),
  );

  setTxt("cartTotal", formatPrice(finalTotal));
  setTxt("checkoutFinalTotal", formatPrice(finalTotal));

  // 6. "Bơm" danh sách sản phẩm vào thân giỏ hàng
  cartBody.innerHTML = cart
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item__img" style="background:${item.bg || "#f5f5f5"}">${item.emoji || "📦"}</div>
      <div class="cart-item__info">
        <div class="cart-item__name">${item.name}</div>
        <div class="cart-item__price">${formatPrice(item.price)}<span class="cart-item__unit">/${item.unit || "sp"}</span></div>
        <div class="cart-item__controls">
          <button class="qty-btn" data-qty-dec="${item.id}">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" data-qty-inc="${item.id}">+</button>
          <button class="cart-item__remove" data-remove="${item.id}" title="Xóa"><i class="fas fa-trash-can"></i></button>
        </div>
      </div>
      <div class="cart-item__line-total">${formatPrice(item.price * item.qty)}</div>
    </div>
  `,
    )
    .join("");

  // 7. Xử lý thanh tiến trình Freeship
  const bar = document.getElementById("freeShipBar");
  if (bar) {
    if (!isFreeShip) {
      const need = 200000 - subtotal;
      const pct = Math.round((subtotal / 200000) * 100);
      bar.innerHTML = `
        <div class="fs-text">Thêm <strong>${formatPrice(need)}</strong> để được freeship!</div>
        <div class="fs-track"><div class="fs-fill" style="width:${pct}%"></div></div>`;
    } else {
      bar.innerHTML = `<div class="fs-text fs-done">🎉 Bạn được miễn phí vận chuyển!</div>`;
    }
    bar.style.display = "block";
  }
}

// Hàm thêm hàng vào giỏ
function addToCart(productId, qty = 1) {
  const prod = getAllProducts().find((p) => p.id === productId);
  if (!prod) return;

  const existing = cart.find((c) => c.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ ...prod, qty });
  }

  saveCart();
  updateCartUI();
  showToast(`Đã thêm <strong>${prod.name}</strong> vào giỏ!`, "🛒");

  // Hiệu ứng rung icon giỏ hàng
  const cartIcon = document.querySelector(".cart-badge");
  if (cartIcon) {
    cartIcon.classList.add("bounce");
    setTimeout(() => cartIcon.classList.remove("bounce"), 400);
  }
}

// --- Các hàm hỗ trợ UI Giỏ hàng ---
function openCart() {
  document.getElementById("cartSidebar")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cartSidebar")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

// Khởi tạo khi trang web tải xong
document.addEventListener("DOMContentLoaded", () => {
  updateCartUI(); // Vẽ lại giao diện từ dữ liệu trong kho

  // Cập nhật số lượng yêu thích
  document
    .querySelectorAll(".wishlist-badge")
    .forEach((b) => (b.textContent = wishlist.length));
});
