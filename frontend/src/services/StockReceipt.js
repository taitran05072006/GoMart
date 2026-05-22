import axiosClient from "../api/axiosClient";

const stockReceiptService = {
    getAll: async () => {
        return axiosClient.get(`/admin/stock-receipts`);
    },
    getById: async (id) => {
        return axiosClient.get(`/admin/stock-receipts/${id}`);
    },
    create: async (data) => {
        return axiosClient.post(`/admin/stock-receipts`, data);
    },
    update: async (id, data) => {
        return axiosClient.put(`/admin/stock-receipts/${id}`, data);
    },
    delete: async (id) => {
        return axiosClient.delete(`/admin/stock-receipts/${id}`);
    }
};

export default stockReceiptService;