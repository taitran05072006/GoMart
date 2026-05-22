import React, { useState, useEffect, createContext } from "react";
import axiosClient from "../api/axiosClient";

export const VoucherContext = createContext();

export const VoucherProvider = ({ children }) => {
  const [vouchers, setVouchers] = useState([]);
  const [availableVouchers, setAvailableVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get("/vouchers");
      setVouchers(response.data || []);
    } catch (err) {
      console.error("Failed to fetch vouchers", err);
      setError("Không thể tải danh sách voucher");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableVouchers = async (userId, productIds = []) => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("userId", userId);
      if (productIds.length > 0) {
        params.append("productIds", productIds.join(","));
      }
      const response = await axiosClient.get(`/vouchers/available?${params.toString()}`);
      setAvailableVouchers(response.data || []);
    } catch (err) {
      console.error("Failed to fetch available vouchers", err);
    } finally {
      setLoading(false);
    }
  };

  const [myVouchers, setMyVouchers] = useState([]);

  const fetchMyVouchers = async (userId) => {
    if (!userId) return;
    try {
      const response = await axiosClient.get(`/vouchers/my-vouchers?userId=${userId}`);
      setMyVouchers(response.data || []);
    } catch (err) {
      console.error("Failed to fetch my vouchers", err);
    }
  };

  const [checkoutVouchers, setCheckoutVouchers] = useState([]);
  const fetchCheckoutVouchers = async (userId, subtotal, productIds = []) => {
    if (!userId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("userId", userId);
      params.append("subtotal", subtotal);
      if (productIds.length > 0) {
        params.append("productIds", productIds.join(","));
      }
      const response = await axiosClient.get(`/vouchers/checkout?${params.toString()}`);
      setCheckoutVouchers(response.data || []);
      return response.data;
    } catch (err) {
      console.error("Failed to fetch checkout vouchers", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const collectVoucher = async (userId, code) => {
    if (!userId) throw new Error("Vui lòng đăng nhập để lưu mã");
    try {
      await axiosClient.post(`/vouchers/collect?userId=${userId}&code=${encodeURIComponent(code)}`);
      await fetchMyVouchers(userId);
      return { success: true };
    } catch (err) {
      console.error("Failed to collect voucher", err);
      return { success: false, message: err.response?.data?.message || err.message };
    }
  };

  const updateVoucher = async (code, updatedData) => {
    try {
      const response = await axiosClient.put(`/vouchers/${code}`, updatedData);
      const updatedVoucher = response.data;
      setVouchers((prev) =>
        prev.map((voucher) => (voucher.code === code ? updatedVoucher : voucher))
      );
      return { success: true, data: updatedVoucher };
    } catch (err) {
      console.error("Failed to update voucher", err);
      return { success: false, message: err.message };
    }
  };

  return (
    <VoucherContext.Provider
      value={{
        vouchers,
        availableVouchers,
        myVouchers,
        checkoutVouchers,
        loading,
        error,
        fetchVouchers,
        fetchAvailableVouchers,
        fetchMyVouchers,
        fetchCheckoutVouchers,
        collectVoucher,
        updateVoucher,
      }}
    >
      {children}
    </VoucherContext.Provider>
  );
};