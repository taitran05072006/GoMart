"use strict";

function initDelegation() {
  document.addEventListener("click", (e) => {
    // Add to cart
    const addBtn = e.target.closest("[data-add]");
    if (addBtn && !e.target.closest(".pd-btn-add")) {
      addToCart(+addBtn.dataset.add);
      openCart();
      return;
    }

    // Wishlist
    const wishBtn = e.target.closest("[data-wish]");
    if (wishBtn) {
      e.stopPropagation();
      toggleWishlist(+wishBtn.dataset.wish);
      return;
    }

    // Cart qty inc/dec
    const incBtn = e.target.closest("[data-qty-inc]");
    if (incBtn) {
      const item = cart.find((c) => c.id === +incBtn.dataset.qtyInc);
      if (item) {
        item.qty++;
        saveCart();
        updateCartUI();
      }
      return;
    }
    const decBtn = e.target.closest("[data-qty-dec]");
    if (decBtn) {
      const item = cart.find((c) => c.id === +decBtn.dataset.qtyDec);
      if (item) {
        item.qty--;
        if (item.qty <= 0) cart = cart.filter((c) => c.id !== item.id);
        saveCart();
        updateCartUI();
      }
      return;
    }
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      cart = cart.filter((c) => c.id !== +removeBtn.dataset.remove);
      saveCart();
      updateCartUI();
      return;
    }

    // Navigate to product
    const card = e.target.closest(".product-card");
    if (
      card &&
      !e.target.closest("[data-add]") &&
      !e.target.closest("[data-wish]")
    ) {
      window.location.href = `product.html?id=${card.dataset.id}`;
      return;
    }
    const flashCard = e.target.closest(".flash-card");
    if (flashCard && !e.target.closest("[data-add]")) {
      window.location.href = `product.html?id=${flashCard.dataset.id}`;
      return;
    }

    // Checkout — yêu cầu đăng nhập
    if (
      e.target.closest(".checkout-btn") ||
      e.target.closest(".btn-checkout")
    ) {
      closeCart();
      if (!isLoggedIn()) {
        showToast("Vui lòng đăng nhập để thanh toán!", "🔐", "warning");
        setTimeout(
          () => (window.location.href = "login.html?redirect=checkout.html"),
          900,
        );
        return;
      }
      window.location.href = "checkout.html";
      return;
    }

    // Cart open/close
    if (e.target.closest("#cartBtn")) {
      openCart();
      return;
    }
    if (e.target.closest("#cartClose") || e.target.closest("#cartOverlay")) {
      closeCart();
      return;
    }

    // Suggestion click
    const sugProd = e.target.closest(".suggest-product");
    if (sugProd) {
      window.location.href = `product.html?id=${sugProd.dataset.id}`;
      return;
    }
  });
}

function initScrollBehaviors() {
  const header = document.getElementById("header");
  const scrollTop = document.getElementById("scrollTopBtn");
  window.addEventListener(
    "scroll",
    () => {
      if (header) header.classList.toggle("scrolled", window.scrollY > 60);
      if (scrollTop)
        scrollTop.classList.toggle("visible", window.scrollY > 400);
    },
    { passive: true },
  );
  scrollTop?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: "smooth" }),
  );
}
function initProducts() {
  // 1. Render Sản phẩm nổi bật
  renderGrid("featuredGrid", PRODUCTS.slice(0, 8));

  // 2. Render Flash Sale
  renderFlashSale("flashSaleGrid");

  // 3. Render Danh mục nhanh
  initCategoryQuickLinks();

  // 4. THÊM MỚI: Render Hàng mới về
  if (typeof NEW_ARRIVALS !== "undefined") {
    renderGrid("newArrivalsGrid", NEW_ARRIVALS);
  }

  // 5. Cập nhật trạng thái nút Trái tim (Wishlist) cho tất cả sản phẩm
  PRODUCTS.forEach((p) => updateWishButtons(p.id));
  if (typeof NEW_ARRIVALS !== "undefined") {
    NEW_ARRIVALS.forEach((p) => updateWishButtons(p.id));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCartUI();
  document
    .querySelectorAll(".wishlist-badge")
    .forEach((b) => (b.textContent = wishlist.length));

  // Khởi tạo Auth Header (user avatar/login button)
  if (typeof initAuthHeader === "function") initAuthHeader();

  initSlider();
  initSearch();
  initCategoryDropdown();
  initScrollBehaviors();
  initDelegation();
  initFlashSaleTimer();

  // Page-specific init
  if (document.getElementById("featuredGrid")) initProducts();
  if (document.getElementById("categoryGrid")) initCategoryPage();
  if (document.querySelector(".product-page")) initProductDetail();
  if (document.getElementById("checkoutForm")) initCheckout();
});

document.addEventListener("DOMContentLoaded", () => {
  updateCartUI();
  // ... các dòng code khác

  // Thêm dòng này vào:
  renderCategoryMenus();

  initSlider();
  initSearch();
  // ...
});

document.addEventListener("DOMContentLoaded", function () {
  const checkoutForm = document.getElementById("checkoutForm");

  if (checkoutForm) {
    checkoutForm.addEventListener("submit", function (event) {
      // 1. NGĂN CHẶN TRÌNH DUYỆT RELOAD TRANG
      event.preventDefault();

      // 2. Thu thập toàn bộ dữ liệu người dùng đã nhập
      const formData = new FormData(checkoutForm);
      const orderData = Object.fromEntries(formData.entries());

      // (Tùy chọn) Thêm thông tin giỏ hàng vào object orderData ở đây
      // orderData.cartItems = getCartItems();
      // orderData.totalAmount = getCartTotal();

      // In ra console để kiểm tra xem đã lấy đúng dữ liệu chưa
      console.log("Dữ liệu đơn hàng chuẩn bị gửi đi:", orderData);

      // 3. Xử lý UI - Đổi trạng thái nút bấm
      const submitBtn = checkoutForm.querySelector(".btn-place-order");
      const originalText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

      // 4. Giả lập gửi dữ liệu lên server (chờ 1.5 giây)
      setTimeout(function () {
        // Nếu có hàm hiển thị thông báo (toast), gọi ở đây
        if (typeof showToast === "function") {
          showToast(
            "Đặt hàng thành công! Đang chuyển hướng...",
            "✅",
            "success",
          );
        } else {
          alert("Đặt hàng thành công!");
        }

        // Chuyển hướng người dùng sang trang thành công (nếu có)
        // window.location.href = "success.html";

        // Khôi phục nút bấm (nếu không chuyển trang)
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }, 1500);
    });
  }
});
