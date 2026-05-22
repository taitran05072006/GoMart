"use strict";

/* ============================================================
   GoMart — Authentication Module (auth.js)
   - Lưu users trong localStorage (gm_users)
   - Session hiện tại trong localStorage (gm_session)
   - Không cần backend — hoạt động 100% phía client
   ============================================================ */

const AUTH_SESSION_KEY = "gm_session";
const AUTH_USERS_KEY = "gm_users";

// ── Đọc session hiện tại ──────────────────────────────────────
function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function isLoggedIn() {
  return !!getCurrentUser();
}

// ── Đăng ký ──────────────────────────────────────────────────
function registerUser(name, email, password) {
  const users = _getUsers();
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, message: "Email này đã được đăng ký!" };
  }
  const user = {
    id: Date.now(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    password, // ⚠️ Demo only — production cần hash
    avatar: name.trim().charAt(0).toUpperCase(),
    phone: "",
    address: "",
    createdAt: new Date().toISOString(),
    orders: [],
  };
  users.push(user);
  _saveUsers(users);
  _startSession(user);
  return { success: true, user: _safeUser(user) };
}

// ── Đăng nhập ─────────────────────────────────────────────────
function loginUser(email, password) {
  const users = _getUsers();
  const user = users.find(
    (u) =>
      u.email.toLowerCase() === email.trim().toLowerCase() &&
      u.password === password,
  );
  if (!user) {
    return { success: false, message: "Email hoặc mật khẩu không chính xác!" };
  }
  _startSession(user);
  return { success: true, user: _safeUser(user) };
}

// ── Đăng xuất ─────────────────────────────────────────────────
function logoutUser() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  showToast("Đã đăng xuất thành công!", "👋");
  setTimeout(() => (window.location.href = "index.html"), 800);
}

// ── Lưu đơn hàng ──────────────────────────────────────────────
function saveOrder(orderData) {
  const session = getCurrentUser();
  if (!session) return false;
  const users = _getUsers();
  const idx = users.findIndex((u) => u.id === session.id);
  if (idx === -1) return false;
  if (!users[idx].orders) users[idx].orders = [];
  const order = {
    id: "GM" + Date.now(),
    date: new Date().toISOString(),
    status: "Đang xử lý",
    ...orderData,
  };
  users[idx].orders.unshift(order);
  _saveUsers(users);
  _startSession(users[idx]); // refresh session
  return order;
}

// ── Cập nhật hồ sơ ────────────────────────────────────────────
function updateProfile(data) {
  const session = getCurrentUser();
  if (!session) return { success: false, message: "Chưa đăng nhập" };
  const users = _getUsers();
  const idx = users.findIndex((u) => u.id === session.id);
  if (idx === -1)
    return { success: false, message: "Người dùng không tồn tại" };
  Object.assign(users[idx], {
    name: data.name || users[idx].name,
    phone: data.phone || users[idx].phone,
    address: data.address || users[idx].address,
    avatar: (data.name || users[idx].name).charAt(0).toUpperCase(),
  });
  _saveUsers(users);
  _startSession(users[idx]);
  return { success: true };
}

// ── Đổi mật khẩu ──────────────────────────────────────────────
function changePassword(oldPass, newPass) {
  const session = getCurrentUser();
  if (!session) return { success: false, message: "Chưa đăng nhập" };
  const users = _getUsers();
  const idx = users.findIndex((u) => u.id === session.id);
  if (idx === -1)
    return { success: false, message: "Không tìm thấy tài khoản" };
  if (users[idx].password !== oldPass)
    return { success: false, message: "Mật khẩu cũ không đúng!" };
  users[idx].password = newPass;
  _saveUsers(users);
  return { success: true };
}

// ── Lấy đơn hàng của user ─────────────────────────────────────
function getUserOrders() {
  const session = getCurrentUser();
  if (!session) return [];
  const users = _getUsers();
  const user = users.find((u) => u.id === session.id);
  return user?.orders || [];
}

// ── Khởi tạo Header Auth UI ────────────────────────────────────
function initAuthHeader() {
  const actionsEl = document.querySelector(".header__actions");
  if (!actionsEl) return;

  const user = getCurrentUser();

  // Remove existing user-btn nếu có
  actionsEl.querySelector(".user-action-btn")?.remove();

  if (user) {
    // Đã đăng nhập → hiển thị avatar + dropdown
    const userBtn = document.createElement("div");
    userBtn.className = "action-btn user-action-btn";
    userBtn.innerHTML = `
      <div class="user-avatar-wrap">
        <div class="user-avatar">${user.avatar}</div>
        <div class="user-dropdown" id="userDropdown">
          <div class="user-dropdown__header">
            <div class="ud-avatar">${user.avatar}</div>
            <div>
              <div class="ud-name">${user.name}</div>
              <div class="ud-email">${user.email}</div>
            </div>
          </div>
          <ul class="ud-menu">
            <li><a href="profile.html"><i class="fas fa-user-circle"></i> Tài khoản của tôi</a></li>
            <li><a href="profile.html?tab=orders"><i class="fas fa-box"></i> Đơn hàng</a></li>
            <li><a href="profile.html?tab=wishlist"><i class="fas fa-heart"></i> Yêu thích</a></li>
            <li class="ud-divider"></li>
            <li><a href="#" id="logoutLink"><i class="fas fa-right-from-bracket"></i> Đăng xuất</a></li>
          </ul>
        </div>
      </div>
      <span class="action-label">${user.name.split(" ").pop()}</span>
    `;
    actionsEl.prepend(userBtn);

    // Toggle dropdown
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.getElementById("userDropdown")?.classList.toggle("open");
    });
    document.addEventListener("click", () => {
      document.getElementById("userDropdown")?.classList.remove("open");
    });
    document.getElementById("logoutLink")?.addEventListener("click", (e) => {
      e.preventDefault();
      logoutUser();
    });
  } else {
    // Chưa đăng nhập → nút đăng nhập
    const loginBtn = document.createElement("a");
    loginBtn.href = "login.html";
    loginBtn.className = "action-btn user-action-btn";
    loginBtn.innerHTML = `
      <div class="action-icon"><i class="fas fa-user-circle"></i></div>
      <span class="action-label">Đăng nhập</span>
    `;
    actionsEl.prepend(loginBtn);
  }
}

// ── Bảo vệ trang yêu cầu đăng nhập ───────────────────────────
function requireLogin(redirectAfter = "") {
  if (!isLoggedIn()) {
    const url =
      "login.html" +
      (redirectAfter ? `?redirect=${encodeURIComponent(redirectAfter)}` : "");
    window.location.href = url;
    return false;
  }
  return true;
}

// ── Private helpers ────────────────────────────────────────────
function _getUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function _saveUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function _startSession(user) {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(_safeUser(user)));
}

function _safeUser(user) {
  const { password, ...safe } = user;
  return safe;
}
