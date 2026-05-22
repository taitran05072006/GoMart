import React, {useEffect, useState, createContext} from "react";
import paymentService from "../services/Payment";

export const PaymentContext = createContext();

export const PaymentProvider = ({ children }) => {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPaymentMethods();
    }, []);

    const fetchPaymentMethods = async () => {
        setLoading(true);
        try {
            const response = await paymentService.getMethods();
            const data = response?.data || response;
            setPaymentMethods(data || []);
        } catch (err) {
            console.error("Lấy danh sách phương thức thanh toán không thành công", err);
            setError("Lấy danh sách phương thức thanh toán không thành công");
        } finally {
            setLoading(false);
        }
    };

    return (
        <PaymentContext.Provider value={{ paymentMethods, loading, error }}>
            {children}
        </PaymentContext.Provider>
    );
};