import axiosClient from "../api/axiosClient";

const pickPayload = (response) => response?.data ?? response;

const paymentService = {
    createPayment: async  (orderId, request) =>{
        const res = await axiosClient.post(`/orders/${orderId}/payment`, request);
        return pickPayload(res);
    },
    getPaymentStatus: async (orderId) => {
        const res = await axiosClient.get(`/orders/${orderId}/payment/status`);
        return pickPayload(res);
    },
    getPayment: async(orderId) =>{
        const res = await axiosClient.get(`/orders/${orderId}/payment`);
        return pickPayload(res);
    },
    updateConfirmPayment: async(orderId) =>{
        const res = await axiosClient.post(`/orders/${orderId}/payment/confirm`);
        return pickPayload(res);
    },
    updateCancelPayment: async(orderId, reason) =>{
        const res = await axiosClient.post(`/orders/${orderId}/payment/fail`, { reason });
        return pickPayload(res);
    },
    getMethods: async() => {
        const res = await axiosClient.get(`/payments/methods`);
        return pickPayload(res);
    },
    preparePayment: async (orderRequest) => {
        const res = await axiosClient.post('/payments/prepare', orderRequest);
        return pickPayload(res);
    },
    getPaymentSession: async (transactionCode) => {
        const res = await axiosClient.get(`/payments/session/${transactionCode}`);
        return pickPayload(res);
    }
}
export default paymentService;