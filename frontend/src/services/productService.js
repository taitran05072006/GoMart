import axiosClient from '../api/axiosClient';

const productService = {
  getAll: async () => {
    return axiosClient.get('/products');
  },
  create: async (data) => {
    return axiosClient.post('/products', data);
  },
  getById: async (id) => {
    return axiosClient.get(`/products/${id}`);
  },
  update: async (id, data) => {
    return axiosClient.put(`/products/${id}`, data);
  },
  delete: async (id) => {
    return axiosClient.delete(`/products/${id}`);
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