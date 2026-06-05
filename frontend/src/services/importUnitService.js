import axiosClient from '../api/axiosClient';

const importUnitService = {
  getByProduct: async (productId) => axiosClient.get(`/admin/import-units?productId=${productId}`),
  getAll: async () => axiosClient.get('/admin/import-units'),
  create: async (data) => axiosClient.post('/admin/import-units', data),
  update: async (id, data) => axiosClient.put(`/admin/import-units/${id}`, data),
  remove: async (id) => axiosClient.delete(`/admin/import-units/${id}`),
};

export default importUnitService;
