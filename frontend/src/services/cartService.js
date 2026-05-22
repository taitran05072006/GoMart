import axiosClient from '../api/axiosClient';

const cartService = {
  getCart: async (userId) => {
    return axiosClient.get(`/cart/${userId}`);
  },
  addItem: async (userId, productId, quantity, unit = null, conversionRate = 1.0) => {
    return axiosClient.post(`/cart/${userId}/add`, { productId, quantity, unit, conversionRate });
  },
  updateItemQuantity: async (userId, cartItemId, quantity) => {
    return axiosClient.put(`/cart/${userId}/update/${cartItemId}`, null, { params: { quantity }});
  },
  removeItem: async (userId, cartItemId) => {
    return axiosClient.delete(`/cart/${userId}/remove/${cartItemId}`);
  },
  clearCart: async (userId) => {
    return axiosClient.delete(`/cart/${userId}/clear`);
  },
  selectItem: async (userId, productId, selected) => {
    return axiosClient.post(`/cart/${userId}/select/${productId}`, null, { params: { selected }});
  },
  toggleAllTick: async (userId, selected) => {
    return axiosClient.put(`/cart/${userId}/toggle-all`, null, { params: { selected }});
  },
  updateUnit: async (userId, cartItemId, unit, conversionRate) => {
    return axiosClient.put(`/cart/${userId}/update-unit/${cartItemId}`, null, { params: { unit, conversionRate }});
  }

};

export default cartService;
