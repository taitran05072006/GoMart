import axiosClient from '../api/axiosClient';

const orderService = {
  createOrder: async (data) => {
    return axiosClient.post('/orders', data);
  },
  getAllOrders: async () => {
    return axiosClient.get('/orders');
  },
  getOrderById: async (id) => {
    return axiosClient.get(`/orders/${id}`);
  },
  updateStatus: async (id, status, rating = null) => {
    return axiosClient.put(`/orders/${id}/status`, { status, rating });
  },
  confirmCodOrder: async (id) => {
    return axiosClient.patch(`/orders/${id}/admin/confirm-cod`);
  },
  assignShipper: async (orderId, shipperId) => {
    return axiosClient.patch(`/orders/${orderId}/admin/assign-shipper/${shipperId}`);
  },
  getShipperOrders: async (shipperId) => {
    return axiosClient.get(`/orders/shipper/${shipperId}`);
  },
  getShipperOrderDetail: async (shipperId, orderId) => {
    return axiosClient.get(`/orders/shipper/${shipperId}/${orderId}`);
  },
  shipperAcceptOrder: async (orderId, shipperId) => {
    return axiosClient.patch(`/orders/${orderId}/shipper/${shipperId}/accept`);
  },
  shipperDeliverOrder: async (orderId, shipperId) => {
    return axiosClient.patch(`/orders/${orderId}/shipper/${shipperId}/delivered`);
  },
  shipperFailOrder: async (orderId, shipperId, reason) => {
    return axiosClient.patch(`/orders/${orderId}/shipper/${shipperId}/failed`, null, {
      params: { reason },
    });
  },
  shipperReturnPicked: async (orderId, shipperId) => {
    return axiosClient.patch(`/orders/${orderId}/shipper/${shipperId}/return-picked`);
  },
  shipperReturnCompleted: async (orderId, shipperId) => {
    return axiosClient.patch(`/orders/${orderId}/shipper/${shipperId}/returned`);
  },
  getLifecycle: async (id) => {
    return axiosClient.get(`/orders/${id}/lifecycle`);
  },
  transitionLifecycle: async (id, request) => {
    return axiosClient.patch(`/orders/${id}/lifecycle`, request);
  },
  deleteOrder: async (id) => {
    return axiosClient.delete(`/orders/${id}`);
  },
  cancelOrder: async (id, reason) => {
    return axiosClient.post(`/orders/${id}/cancel`, { reason });
  },
  requestReturn: async (id, reason) => {
    return axiosClient.post(`/orders/${id}/return`, null, {
      params: { reason }
    });
  },
};

export default orderService;
