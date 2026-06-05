import axios from 'axios';

const DEFAULT_BASE_URL = 'http://localhost:8080/api';
const baseURL = import.meta.env.VITE_API_BASE_URL || DEFAULT_BASE_URL;
const timeout = Number(import.meta.env.VITE_API_TIMEOUT_MS || 15000);

// Dùng CustomEvent thay vì window.location.assign để tránh reload cứng gây màn hình đen
let redirectingToLogin = false;
export const AUTH_REDIRECT_EVENT = 'auth:redirect-to-login';

const dispatchRedirectToLogin = () => {
  if (!redirectingToLogin) {
    redirectingToLogin = true;
    window.dispatchEvent(new CustomEvent(AUTH_REDIRECT_EVENT));
    // Reset sau 3s để tránh block redirect nếu có lỗi khác
    setTimeout(() => { redirectingToLogin = false; }, 3000);
  }
};

const axiosClient = axios.create({
  baseURL,
  timeout: Number.isFinite(timeout) ? timeout : 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const requestPath = config.url || '';
    const isPublicAuthEndpoint =
      requestPath.startsWith('/users/login') ||
      requestPath.startsWith('/users/register');

    if (token && !isPublicAuthEndpoint) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined') {
        const u = JSON.parse(storedUser);
        if (u && u.id && String(u.id) !== 'null') config.headers['X-User-Id'] = String(u.id);
      }
      const impersonatedStoreId = localStorage.getItem('impersonatedStoreId');
      if (impersonatedStoreId && impersonatedStoreId !== 'null' && impersonatedStoreId !== 'undefined') {
        config.headers['X-Impersonate-Store-Id'] = impersonatedStoreId;
      }
    } catch (err) {
      // ignore
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosClient.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data && data.success === false) {
      const err = new Error(data.message || 'Có lỗi xảy ra');
      err.data = data;
      return Promise.reject(err);
    }
    return data;
  },
  (error) => {
    const status = error?.response?.status;
    const requestPath = error?.config?.url || '';
    const isPublicAuthEndpoint =
      requestPath.startsWith('/users/login') ||
      requestPath.startsWith('/users/register');

    if (status === 401 && !isPublicAuthEndpoint) {
      // Handle unauthorized: xóa token và dispatch event để React Router xử lý
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        dispatchRedirectToLogin();
      }
    }

    let message =
      error?.response?.data?.message ||
      error?.message ||
      '';

    // Axios timeout / network errors can be confusing; make them explicit.
    const code = error?.code;
    if (code === 'ECONNABORTED' || String(message).toLowerCase().includes('timeout')) {
      message = 'Không thể kết nối đến server';
    } else if (!error?.response) {
      message = 'Không thể kết nối đến server';
    }

    const err = new Error(message);
    err.status = status;
    err.data = error?.response?.data;
    err.code = code;
    return Promise.reject(err);
  }
);

export default axiosClient;
