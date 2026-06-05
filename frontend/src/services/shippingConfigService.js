import axiosClient from '../api/axiosClient';

const shippingConfigService = {
  getConfig: async () => axiosClient.get('/admin/shipping-config'),
  updateConfig: async (data) => axiosClient.put('/admin/shipping-config', data),
};

export default shippingConfigService;
