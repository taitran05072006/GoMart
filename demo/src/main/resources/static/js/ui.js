"use strict";

function createProductCard(prod, size = "normal") {
  const inWish = wishlist.includes(prod.id);
  const stars = renderStars(prod.rating);
  return `
    <div class="product-card${size === "small" ? " product-card--small" : ""}" data-id="${prod.id}">
      <div class="product-card__img" style="background:${prod.bg || "#f5f5f5"}">
        <span class="product-emoji">${prod.emoji || "📦"}</span>
        ${prod.discount ? `<span class="badge-discount">-${prod.discount}%</span>` : ""}
        ${prod.tag ? `<span class="badge-tag">${prod.tag}</span>` : ""}
        <button class="btn-wish ${inWish ? "active" : ""}" data-wish="${prod.id}" title="Yêu thích">
          <i class="${inWish ? "fas" : "far"} fa-heart"></i>
        </button>
        ${prod.stock <= 10 ? `<div class="badge-stock">Còn ${prod.stock}</div>` : ""}
      </div>
      <div class="product-card__body">
        <div class="product-card__cat">${CATEGORIES.find((c) => c.id === prod.category)?.name || ""}</div>
        <div class="product-card__name">${prod.name}</div>
        <div class="product-card__rating">
          <span class="stars">${stars}</span>
          <span class="review-count">(${prod.reviews?.toLocaleString("vi-VN")})</span>
        </div>
        <div class="product-card__footer">
          <div class="product-card__price">
            <span class="price-current">${formatPrice(prod.price)}</span>
            ${prod.oldPrice ? `<span class="price-old">${formatPrice(prod.oldPrice)}</span>` : ""}
          </div>
          <button class="btn-add-cart" data-add="${prod.id}" title="Thêm vào giỏ">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
        ${prod.unit ? `<div class="product-card__unit">/${prod.unit}</div>` : ""}
      </div>
    </div>`;
}

function createFlashCard(prod) {
  const timeLeft = Math.floor(Math.random() * 50) + 10;
  const soldPct = Math.floor(Math.random() * 60) + 30;
  return `
    <div class="flash-card" data-id="${prod.id}">
      <div class="flash-card__img" style="background:${prod.bg}">
        <span>${prod.emoji}</span>
        <span class="flash-badge">-${prod.discount}%</span>
      </div>
      <div class="flash-card__body">
        <div class="flash-card__name">${prod.name}</div>
        <div class="flash-card__price">
          <span class="flash-price-current">${formatPrice(prod.price)}</span>
          <span class="flash-price-old">${formatPrice(prod.oldPrice)}</span>
        </div>
        <div class="flash-card__sold">
          <div class="sold-bar"><div class="sold-fill" style="width:${soldPct}%"></div></div>
          <span class="sold-text">Đã bán ${soldPct}%</span>
        </div>
        <button class="flash-card__btn" data-add="${prod.id}"><i class="fas fa-bolt"></i> Mua ngay</button>
      </div>
    </div>`;
}

function renderGrid(containerId, products) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Không tìm thấy sản phẩm phù hợp</p></div>`;
    return;
  }
  el.innerHTML = products.map((p) => createProductCard(p)).join("");
}

function renderFlashSale(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = FLASH_SALE_PRODUCTS.map(createFlashCard).join("");
}

/* ---- Flash Sale Countdown ---- */
function initFlashSaleTimer() {
  const el = document.getElementById("flashCountdown");
  if (!el) return;

  // countdown to midnight
  function tick() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(23, 59, 59, 0);
    let diff = Math.max(0, midnight - now);
    const h = String(Math.floor(diff / 3600000)).padStart(2, "0");
    diff %= 3600000;
    const m = String(Math.floor(diff / 60000)).padStart(2, "0");
    diff %= 60000;
    const s = String(Math.floor(diff / 1000)).padStart(2, "0");
    el.innerHTML = `
      <div class="countdown-unit"><span class="cdu-num">${h}</span><span class="cdu-label">giờ</span></div>
      <span class="cdu-sep">:</span>
      <div class="countdown-unit"><span class="cdu-num">${m}</span><span class="cdu-label">phút</span></div>
      <span class="cdu-sep">:</span>
      <div class="countdown-unit"><span class="cdu-num">${s}</span><span class="cdu-label">giây</span></div>`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ---- Category Grid ---- */
function initCategoryQuickLinks() {
  const el = document.getElementById("categoryQuickLinks");
  if (!el) return;
  el.innerHTML = CATEGORIES.filter((c) => c.id !== "all")
    .map(
      (c) => `
    <a href="category.html?cat=${c.id}" class="cat-quick-item">
      <div class="cat-quick-icon"><i class="fas ${c.icon}"></i></div>
      <span>${c.name}</span>
    </a>`,
    )
    .join("");
}

/* ---- Search ---- */
function initSearch() {
  const input = document.getElementById("searchInput");
  const sugBox = document.getElementById("searchSuggestions");
  if (!input || !sugBox) return;

  const handleSearch = debounce(() => {
    const q = input.value.trim().toLowerCase();
    if (!q) {
      sugBox.classList.remove("active");
      return;
    }

    const matchedProducts = PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(q),
    ).slice(0, 4);
    const matchedKeywords = SEARCH_KEYWORDS.filter(
      (k) =>
        k.toLowerCase().includes(q) &&
        !matchedProducts.find((p) =>
          p.name.toLowerCase().includes(k.toLowerCase()),
        ),
    ).slice(0, 3);

    if (!matchedProducts.length && !matchedKeywords.length) {
      sugBox.classList.remove("active");
      return;
    }

    let html = "";
    if (matchedProducts.length) {
      html += matchedProducts
        .map(
          (p) => `
        <div class="suggest-item suggest-product" data-id="${p.id}">
          <div class="sug-img" style="background:${p.bg}">${p.emoji}</div>
          <div class="sug-info">
            <div class="sug-name">${p.name}</div>
            <div class="sug-price">${formatPrice(p.price)}</div>
          </div>
        </div>`,
        )
        .join("");
    }
    if (matchedKeywords.length) {
      html += matchedKeywords
        .map(
          (k) => `
        <div class="suggest-item suggest-keyword">
          <i class="fas fa-search"></i> ${k}
        </div>`,
        )
        .join("");
    }
    sugBox.innerHTML = html;
    sugBox.classList.add("active");
  }, 200);

  input.addEventListener("input", handleSearch);
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".header__search")) sugBox.classList.remove("active");
  });

  // Search button
  document.querySelector(".search-btn")?.addEventListener("click", () => {
    const q = input.value.trim();
    if (q) window.location.href = `category.html?q=${encodeURIComponent(q)}`;
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = input.value.trim();
      if (q) window.location.href = `category.html?q=${encodeURIComponent(q)}`;
    }
  });
}

/* ---- Category Dropdown ---- */
function initCategoryDropdown() {
  const btn = document.getElementById("categoryToggle");
  const drop = document.getElementById("categoryDropdown");
  if (!btn || !drop) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    drop.classList.toggle("open");
  });
  document.addEventListener("click", () => drop.classList.remove("open"));
}

/* ---- Category Page ---- */
function initCategoryPage() {
  const grid = document.getElementById("categoryGrid");
  if (!grid) return;

  const params = new URLSearchParams(window.location.search);
  let activeCat = params.get("cat") || "all";
  let searchQuery = params.get("q") || "";

  // Fill search input if query param
  if (searchQuery) {
    const inp = document.getElementById("searchInput");
    if (inp) inp.value = searchQuery;
  }

  // 1. TỰ ĐỘNG RENDER CATEGORY SIDEBAR TỪ data.js
  const sidebarLinks = document.querySelector(".filter-links");
  if (sidebarLinks) {
    sidebarLinks.innerHTML = CATEGORIES.map(
      (c) => `
      <li>
        <a href="category.html?cat=${c.id}" class="${c.id === activeCat ? "active" : ""}" data-cat="${c.id}">
          ${c.icon !== "fa-border-all" ? `<i class="fas ${c.icon}" style="margin-right: 6px; color: var(--green); font-size: 12px;"></i>` : ""}
          ${c.name}
        </a>
      </li>
    `,
    ).join("");
  }

  function getFiltered() {
    let products = [...PRODUCTS, ...NEW_ARRIVALS];

    // Lọc theo danh mục
    if (activeCat !== "all") {
      products = products.filter((p) => p.category === activeCat);
    }

    // Lọc theo từ khóa tìm kiếm
    if (searchQuery) {
      products = products.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    // 2. LOGIC LỌC THEO MỨC GIÁ (MỚI THÊM)
    const checkedPrices = Array.from(
      document.querySelectorAll(".price-filter:checked"),
    ).map((cb) => cb.value);
    if (checkedPrices.length > 0) {
      products = products.filter((p) => {
        // Kiểm tra xem giá sản phẩm có nằm trong BẤT KỲ khoảng giá nào đang được tick không
        return checkedPrices.some((range) => {
          const [min, max] = range.split("-").map(Number);
          return p.price >= min && p.price <= max;
        });
      });
    }

    // Sắp xếp
    const sortSel = document.getElementById("sortSelect");
    const mode = sortSel ? sortSel.value : "default";
    if (mode === "price_asc") products.sort((a, b) => a.price - b.price);
    else if (mode === "price_desc") products.sort((a, b) => b.price - a.price);
    else if (mode === "rating") products.sort((a, b) => b.rating - a.rating);
    else if (mode === "discount")
      products.sort((a, b) => b.discount - a.discount);

    return products;
  }

  function render() {
    const products = getFiltered();
    const countEl = document.getElementById("productCount");
    if (countEl) countEl.textContent = products.length;
    renderGrid("categoryGrid", products);

    // Update wishlist states
    wishlist.forEach((id) => updateWishButtons(id));
  }

  // Category pills (Các nút tròn tròn trên cùng)
  const catContainer = document.getElementById("categoryPills");
  if (catContainer) {
    catContainer.innerHTML = CATEGORIES.map(
      (c) => `
      <button class="cat-pill ${c.id === activeCat ? "active" : ""}" data-cat="${c.id}">
        <i class="fas ${c.icon}"></i> ${c.name}
      </button>`,
    ).join("");
  }

  // Xử lý sự kiện click chuyển danh mục (cho cả Pills và Sidebar) mà KHÔNG cần load lại trang
  document.addEventListener("click", (e) => {
    // Nếu click vào Cat Pill
    const pill = e.target.closest(".cat-pill");
    if (pill) {
      activeCat = pill.dataset.cat;
      // Cập nhật UI nút
      document
        .querySelectorAll(".cat-pill")
        .forEach((p) =>
          p.classList.toggle("active", p.dataset.cat === activeCat),
        );
      document
        .querySelectorAll(".filter-links a")
        .forEach((a) =>
          a.classList.toggle("active", a.dataset.cat === activeCat),
        );
      render();
    }

    // Nếu click vào Link ở Sidebar
    const sidebarLink = e.target.closest(".filter-links a");
    if (sidebarLink) {
      e.preventDefault(); // Ngăn load lại trang
      activeCat = sidebarLink.dataset.cat;
      // Cập nhật UI nút
      document
        .querySelectorAll(".filter-links a")
        .forEach((a) =>
          a.classList.toggle("active", a.dataset.cat === activeCat),
        );
      document
        .querySelectorAll(".cat-pill")
        .forEach((p) =>
          p.classList.toggle("active", p.dataset.cat === activeCat),
        );
      // Thay đổi URL trên thanh địa chỉ mà không reload
      window.history.pushState({}, "", `category.html?cat=${activeCat}`);
      render();
    }
  });

  document.getElementById("sortSelect")?.addEventListener("change", render);

  // Gắn sự kiện cho các ô tick Giá
  document.querySelectorAll(".price-filter").forEach((cb) => {
    cb.addEventListener("change", render);
  });

  // Chạy render lần đầu
  render();
}

/* ---- Product Detail ---- */
function initProductDetail() {
  if (!document.querySelector(".product-page")) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");
  const prod = productId ? getProductById(+productId) : PRODUCTS[6];

  if (!prod) return;

  // Fill dynamic data
  const titleEl = document.querySelector(".pd-title");
  if (titleEl) titleEl.textContent = prod.name;
  const mainImg = document.getElementById("mainImage");
  if (mainImg) {
    mainImg.style.background = prod.bg;
    const emojiEl = mainImg.querySelector(".pd-emoji");
    if (emojiEl) emojiEl.textContent = prod.emoji;
  }
  const curPrice = document.querySelector(".pd-price-current");
  if (curPrice) curPrice.textContent = formatPrice(prod.price);
  const oldPrice = document.querySelector(".pd-price-old");
  if (oldPrice && prod.oldPrice) {
    oldPrice.textContent = formatPrice(prod.oldPrice);
  }
  const badgeEl = document.querySelector(".pd-badge");
  if (badgeEl && prod.discount) badgeEl.textContent = `-${prod.discount}%`;

  const ratingEl = document.querySelector(".pd-rating .stars");
  if (ratingEl) ratingEl.innerHTML = renderStars(prod.rating);
  const reviewEl = document.querySelector(".pd-reviews");
  if (reviewEl)
    reviewEl.textContent = `(${prod.reviews?.toLocaleString("vi-VN")} đánh giá)`;

  const highlightEl = document.querySelector(".pd-highlights");
  if (highlightEl && prod.highlights) {
    highlightEl.innerHTML = prod.highlights
      .map((h) => `<li><i class="fas fa-check-circle"></i> ${h}</li>`)
      .join("");
  }

  const descEl = document.getElementById("tab-desc");
  if (descEl && prod.description) {
    descEl.querySelector("p").textContent = prod.description;
  }

  // Breadcrumb
  const breadcrumbEl = document.querySelector(".breadcrumb .active");
  if (breadcrumbEl) breadcrumbEl.textContent = prod.name;

  // Set data-add/wish attributes
  document.querySelector("[data-add]")?.setAttribute("data-add", prod.id);
  document.querySelector("[data-wish]")?.setAttribute("data-wish", prod.id);

  // Thumbnails
  const thumbs = document.querySelectorAll(".pd-thumb");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", function () {
      thumbs.forEach((t) => t.classList.remove("active"));
      this.classList.add("active");
      const emojiEl = mainImg?.querySelector(".pd-emoji");
      if (emojiEl) emojiEl.textContent = this.dataset.emoji || prod.emoji;
    });
  });

  // Qty controls
  const btnDec = document.getElementById("pdDec");
  const btnInc = document.getElementById("pdInc");
  const inputQty = document.getElementById("pdQty");
  if (btnDec && btnInc && inputQty) {
    btnDec.addEventListener("click", () => {
      let val = parseInt(inputQty.value);
      if (val > 1) inputQty.value = val - 1;
    });
    btnInc.addEventListener("click", () => {
      inputQty.value = parseInt(inputQty.value) + 1;
    });
  }

  // Add to cart with qty
  document.querySelector(".pd-btn-add")?.addEventListener("click", function () {
    const qty = parseInt(document.getElementById("pdQty")?.value || "1");
    addToCart(prod.id, qty);
  });

  // Tab switching
  document.querySelectorAll(".pd-tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".pd-tab-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".pd-tab-content")
        .forEach((c) => c.classList.remove("active"));
      this.classList.add("active");
      document.getElementById(this.dataset.target)?.classList.add("active");
    });
  });

  // Related products
  const relatedGrid = document.getElementById("relatedGrid");
  if (relatedGrid) {
    const related = PRODUCTS.filter(
      (p) => p.category === prod.category && p.id !== prod.id,
    ).slice(0, 4);
    relatedGrid.innerHTML = related.map((p) => createProductCard(p)).join("");
  }
}

/* ---- Checkout ---- */
function initCheckout() {
  const checkoutList = document.getElementById("checkoutItemsList");
  const checkoutForm = document.getElementById("checkoutForm");
  if (!checkoutList || !checkoutForm) return;

  function renderCheckoutItems() {
    if (!cart.length) {
      checkoutList.innerHTML = `<p style="text-align:center; color:#888; padding: 20px 0">Giỏ hàng trống.</p>`;
      ["checkoutSubtotal", "checkoutShipping", "checkoutFinalTotal"].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (el) el.textContent = "0đ";
        },
      );
      return;
    }
    checkoutList.innerHTML = cart
      .map(
        (item) => `
      <div class="summary-item">
        <div class="summary-item__img" style="background:${item.bg || "#f5f5f5"}">
          ${item.emoji || "📦"}
          <span class="summary-item__qty">${item.qty}</span>
        </div>
        <div class="summary-item__info">
          <div class="summary-item__name">${item.name}</div>
          <div class="summary-item__price">${formatPrice(item.price * item.qty)}</div>
        </div>
      </div>`,
      )
      .join("");

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal >= 200000 ? 0 : 30000;
    document.getElementById("checkoutSubtotal").textContent =
      formatPrice(subtotal);
    document.getElementById("checkoutShipping").textContent =
      shipping === 0 ? "Miễn phí 🎉" : formatPrice(shipping);
    document.getElementById("checkoutFinalTotal").textContent = formatPrice(
      subtotal + shipping,
    );
  }

  renderCheckoutItems();

  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!cart.length) {
      showToast("Giỏ hàng đang trống!", "⚠️", "warning");
      return;
    }

    // 1. Lấy thông tin thanh toán để truyền sang trang Success
    const paymentMethodInput = document.querySelector(
      'input[name="payment"]:checked',
    );
    let paymentText = "Thanh toán khi nhận hàng (COD)";
    if (paymentMethodInput) {
      if (paymentMethodInput.value === "momo") paymentText = "Ví MoMo";
      if (paymentMethodInput.value === "bank")
        paymentText = "Chuyển khoản ngân hàng";
    }

    const orderIdStr = "#GM-" + Math.floor(Math.random() * 1000000);
    localStorage.setItem("lastOrderId", orderIdStr);
    localStorage.setItem("lastPaymentMethod", paymentText);

    // 2. Lưu đơn hàng vào tài khoản (Profile) nếu đã đăng nhập
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = subtotal >= 200000 ? 0 : 30000;

    if (
      typeof saveOrder === "function" &&
      typeof isLoggedIn === "function" &&
      isLoggedIn()
    ) {
      saveOrder({
        id: orderIdStr.replace("#", ""), // Bỏ dấu # để lưu vào logic auth.js
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          emoji: i.emoji,
          qty: i.qty,
          price: i.price,
        })),
        total: subtotal + shipping,
        status: "Đang xử lý",
      });
    }

    // 3. Xóa giỏ hàng chuẩn xác
    cart = [];
    saveCart();
    updateCartUI(); // Cập nhật lại số lượng giỏ hàng trên Header ngay lập tức

    // 4. Hiển thị thông báo và Chuyển hướng sang trang Thành công
    showToast("Đang xử lý đơn hàng...", "⏳");

    // Disable nút submit để tránh click nhiều lần
    const submitBtn = checkoutForm.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
    }

    setTimeout(() => {
      window.location.href = "success.html";
    }, 1500);
  });
}
/* ---- Tự động Render Menu Danh mục ---- */
function renderCategoryMenus() {
  const categoriesList = CATEGORIES.filter((c) => c.id !== "all");

  // 1. Render Navbar Dropdown (Thực đơn xổ xuống)
  const catListEl = document.querySelector(".cat-list");
  if (catListEl) {
    catListEl.innerHTML = categoriesList
      .map(
        (c) =>
          `<li><a href="category.html?cat=${c.id}"><i class="fas ${c.icon}"></i> ${c.name}</a></li>`,
      )
      .join("");
  }

  // 2. Render Hero Sidebar (Cột danh mục ở trang chủ)
  const heroSidebar = document.querySelector(".hero__sidebar");
  if (heroSidebar) {
    heroSidebar.innerHTML = categoriesList
      .map(
        (c) =>
          `<a href="category.html?cat=${c.id}"><i class="fas ${c.icon}"></i> ${c.name}</a>`,
      )
      .join("");
  }

  // 3. Render Navbar ngang (Chỉ lấy 3 mục cố định)
  const navLinks = document.querySelector(".navbar__links");

  if (navLinks) {
    // Xác định xem trang nào đang được mở để thêm class 'active' (làm sáng nút đó)
    const isHome =
      window.location.pathname.includes("index.html") ||
      window.location.pathname === "/";
    const isCategory = window.location.pathname.includes("category.html");
    const isPromo = window.location.search.includes("cat=sale"); // Giả sử khuyến mãi dùng cat=sale

    let html = `
        <li>
            <a href="index.html" class="${isHome ? "active" : ""}">Trang chủ</a>
        </li>
        <li>
            <a href="category.html" class="${isCategory && !isPromo ? "active" : ""}">Tất cả sản phẩm</a>
        </li>
        <li>
            <a href="category.html?cat=sale" class="${isPromo ? "active" : ""}">
                Khuyến mãi <span class="nav-badge">HOT</span>
            </a>
        </li>
    `;

    navLinks.innerHTML = html;
  }
}
