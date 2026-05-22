import React, { useState, useEffect, createContext } from "react";
import orderService from "../services/orderService";

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔹 Load orders
  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await orderService.getOrders();
      const data = res?.data ?? res;
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      setError("Lấy danh sách đơn hàng không thành công");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Load lần đầu
  useEffect(() => {
    fetchOrders();
  }, []);

  // 🔹 Get by ID
  const getOrderById = async (id) => {
    try {
      const res = await orderService.getOrderById(id);
      return res?.data ?? res;
    } catch (err) {
      setError("Lấy chi tiết đơn hàng không thành công");
      throw err;
    }
  };

  // 🔹 Get by user
  const getOrdersByUserId = async (userId) => {
    try {
      const res = await orderService.getOrdersByUserId(userId);
      return res?.data ?? res;
    } catch (err) {
      setError("Lấy danh sách đơn hàng của bạn không thành công");
      throw err;
    }
  };

  // 🔹 Create
  const createOrder = async (orderData) => {
    setLoading(true);
    try {
      const res = await orderService.createOrder(orderData);
      const newOrder = res?.data ?? res;

      // update UI
      setOrders(prev => [newOrder, ...prev]);

      return newOrder;
    } catch (err) {
      setError("Đặt hàng không thành công");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Update status
  const updateOrderStatus = async (orderId, status) => {
    try {
      const res = await orderService.updateOrderStatus(orderId, status);
      const updated = res?.data ?? res;

      setOrders(prev =>
        prev.map(o => (o.id === orderId ? updated : o))
      );

      return updated;
    } catch (err) {
      setError("Cập nhật trạng thái đơn hàng thất bại");
      throw err;
    }
  };

  // 🔹 Delete
  const deleteOrder = async (orderId) => {
    try {
      await orderService.deleteOrder(orderId);

      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      setError("Xóa đơn hàng không thành công");
      throw err;
    }
  };

  // 🔹 Lifecycle
  const getOrderLifecycle = async (orderId) => {
    try {
      const res = await orderService.getOrderLifecycle(orderId);
      return res?.data ?? res;
    } catch (err) {
      setError("Lấy lịch sử đơn hàng không thành công");
      throw err;
    }
  };

  const transitionOrderLifecycle = async (orderId, request) => {
    try {
      const res = await orderService.transitionOrderLifecycle(orderId, request);
      return res?.data ?? res;
    } catch (err) {
      setError("Thay đổi trạng thái đơn hàng không thành công");
      throw err;
    }
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        error,
        fetchOrders,
        getOrderById,
        getOrdersByUserId,
        createOrder,
        updateOrderStatus,
        deleteOrder,
        getOrderLifecycle,
        transitionOrderLifecycle
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};