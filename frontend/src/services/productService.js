import axiosClient from '../api/axiosClient';

const productService = {
  getAll: async () => {
    return axiosClient.get('/products');
  },
  getByStoreId: async (storeId, { includeOutOfStock } = {}) => {
    return axiosClient.get(`/stores/${storeId}/products`, { params: { includeOutOfStock } });
  },
  create: async (data, storeId) => {
    return axiosClient.post('/products', data, { params: { storeId } });
  },
  getById: async (id, storeId) => {
    return axiosClient.get(`/products/${id}`, { params: { storeId } });
  },
  update: async (id, data) => {
    return axiosClient.put(`/products/${id}`, data);
  },
  updateForStore: async (id, data, storeId) => {
    return axiosClient.put(`/products/${id}`, data, { params: { storeId } });
  },
  delete: async (id) => {
    return axiosClient.delete(`/products/${id}`);
  },
  toggleSelling: async (id, storeId) => {
    return axiosClient.post(`/products/${id}/store/${storeId}/toggle-selling`);
  },
  getByCategory: async (categoryId) => {
    return axiosClient.get(`/products/category/${categoryId}`);
  },
  search: async ({ keyword, categoryId, minPrice, maxPrice } = {}) => {
    return axiosClient.get('/products/search', {
      params: { keyword, categoryId, minPrice, maxPrice },
    });
  },
  filter: async ({ categoryId, minPrice, maxPrice, sortBy, sortDir } = {}) => {
    return axiosClient.get('/products/filter', {
      params: { categoryId, minPrice, maxPrice, sortBy, sortDir },
    });
  },
  getLowStock: async () => {
    return axiosClient.get('/products/low-stock');
  },
  getExpiringSoon: async () => {
    return axiosClient.get('/products/expiring-soon');
  },
};

export default productService;