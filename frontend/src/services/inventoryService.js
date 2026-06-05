import axiosClient from '../api/axiosClient';

const inventoryService = {
  getSummary: async (storeId) => {
    return axiosClient.get('/admin/inventory/summary', {
      params: storeId ? { storeId } : {},
    });
  },
  getHistory: async (storeId) => {
    return axiosClient.get('/admin/inventory/history', {
      params: storeId ? { storeId } : {},
    });
  },

  getStores: async () => {
    return axiosClient.get('/stores');
  },
};

export default inventoryService;