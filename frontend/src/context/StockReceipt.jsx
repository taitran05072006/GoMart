import React, {useEffect, useState, createContext} from "react";
import StockReceiptService from "../services/StockReceipt";

export const StockReceiptContext = createContext();

export const StockReceiptProvider = ({ children }) => {
    const [stockReceipts, setStockReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchStockReceipts();
    }, []);

    const fetchStockReceipts = async () => {
        setLoading(true);
        try {
            const response = await StockReceiptService.getAll();
            const data = response?.data || response;
            setStockReceipts(data || []);
        } catch (err) {
            console.error("Lấy danh sách phiếu nhập kho không thành công", err);
            setError("Lấy danh sách phiếu nhập kho không thành công");
        } finally {
            setLoading(false);
        }
    };
    const getStockReceiptById = async (id) => {
        try {
            const response = await StockReceiptService.getById(id);
            return response?.data || response;
        } catch (err) {
            console.error("Lấy phiếu nhập kho không thành công", err);
            setError("Lấy phiếu nhập kho không thành công");
            throw err;
        }
    };
    const updateStockReceipt = async (id, updatedData) => {
        try {
            const response = await StockReceiptService.update(id, updatedData);
            const updatedReceipt = response?.data || response;
            setStockReceipts((prev) =>
                prev.map((receipt) => (receipt.id === id ? updatedReceipt : receipt))
            );
            return { success: true, data: updatedReceipt };
        } catch (err) {
            console.error("Cập nhật phiếu nhập kho không thành công", err);
            setError("Cập nhật phiếu nhập kho không thành công");
            return { success: false, message: err.message };
        }
    };

    return (
        <StockReceiptContext.Provider value={{ stockReceipts, loading, error, getStockReceiptById, updateStockReceipt }}>
            {children}
        </StockReceiptContext.Provider>
    );
};