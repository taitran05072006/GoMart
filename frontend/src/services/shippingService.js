import axiosClient from '../api/axiosClient';

const shippingService = {
  calculateFee: async (address, subtotal) => {
    return axiosClient.get('/shipping/calculate', {
      params: { address, subtotal },
    });
  },
  getLocations: async () => {
    return axiosClient.get('/shipping-locations');
  },
  createLocation: async (data) => {
    return axiosClient.post('/shipping-locations', data);
  },
  updateLocation: async (id, data) => {
    return axiosClient.put(`/shipping-locations/${id}`, data);
  },
  deleteLocation: async (id) => {
    return axiosClient.delete(`/shipping-locations/${id}`);
  },
};

export default shippingService;