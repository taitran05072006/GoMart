import axiosClient from '../api/axiosClient';

const authService = {
  login: async (email, password) => {
    return axiosClient.post('/users/login', { email, password });
  },
  register: async (userData) => {
    return axiosClient.post('/users/register', userData);
  },
  updateProfile: async (userId, data) => {
    return axiosClient.put('/users/profile', { userId, ...data });
  },
  changePassword: async (userId, data) => {
    return axiosClient.put('/users/change-password', { userId, ...data });
  },
  getAdminCustomers: async () => {
    return axiosClient.get('/users/admin/customers');
  },
  getAdminShippers: async () => {
    return axiosClient.get('/users/admin/shippers');
  },
  getAdminStoreAdmins: async () => {
    return axiosClient.get('/users/admin/store-admins');
  },
  createAdminAccount: async (data) => {
    return axiosClient.post('/users/admin/accounts', data);
  },
  updateUserRole: async (userId, role, storeId) => {
    return axiosClient.patch(`/users/admin/customers/${userId}/role`, { role, storeId });
  },
  deleteAdminCustomer: async (userId) => {
    return axiosClient.delete(`/users/admin/customers/${userId}`);
  },
  sendOTP: async (phone) => {
    return axiosClient.post('/users/send-otp', { phone });
  },

  sendPasswordResetLink: async (email) => {
    return axiosClient.post('/users/send-password-reset-link', { email });
  },

  resetPasswordByOTP: async (phone, otp, newPassword) => {
    return axiosClient.post('/users/reset-password-otp', {
      phone,
      otp,
      newPassword,
    });
  },

  resetPasswordByEmail: async (email, token, newPassword) => {
    return axiosClient.post('/users/reset-password-email', {
      email,
      token,
      newPassword,
    });
  },
  verifyResetToken: async (email, token) => {
    return axiosClient.post('/users/verify-reset-token', { email, token });
  },
  getUserById: async (userId) => {
    return axiosClient.get(`/users/${userId}`);
  }

};

export default authService;
