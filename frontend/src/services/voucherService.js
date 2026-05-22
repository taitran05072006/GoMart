  import axiosClient from '../api/axiosClient';

const voucherService = {
  getAll: async () => {
    return axiosClient.get('/vouchers');
  },
  getByCode: async (code) => {
    return axiosClient.get(`/vouchers/${encodeURIComponent(code)}`);
  },
  create: async (data) => {
    return axiosClient.post('/vouchers', data);
  },
  update: async (code, data) => {
    return axiosClient.put(`/vouchers/${encodeURIComponent(code)}`, data);
  },
  remove: async (code) => {
    return axiosClient.delete(`/vouchers/${encodeURIComponent(code)}`);
  },
  toggleActive: async (code, active) => {
    return axiosClient.patch(`/vouchers/${encodeURIComponent(code)}/active`, null, {
      params: { active },
    });
  },
  validateVoucher: async (code, subtotal, userId, productIds) => {
    return axiosClient.get('/vouchers/validate', {
      params: { code, subtotal, userId, productIds: productIds?.join(',') },
    });
  },
  getAvailableVouchers: async (userId, productIds) => {
    return axiosClient.get('/vouchers/available', {
      params: { userId, productIds: productIds?.join(',') },
    });
  },
  getCheckoutVouchers: async (userId, subtotal, productIds) => {
    return axiosClient.get('/vouchers/checkout', {
      params: { 
        userId, 
        subtotal, 
        productIds: productIds?.join(',') 
      },
    });
  },
};

export default voucherService;