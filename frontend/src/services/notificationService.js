import axiosClient from '../api/axiosClient';

const notificationService = {
  broadcastToAllCustomers: async (data) => {
    return axiosClient.post('/notifications/admin/broadcast', data);
  },
  markAsRead: async (id) => {
    return axiosClient.post(`/notifications/${id}/read`);
  },
  getUserNotifications: async (userId) => {
    return axiosClient.get(`/notifications/${userId}`);
  }
};

export default notificationService;
