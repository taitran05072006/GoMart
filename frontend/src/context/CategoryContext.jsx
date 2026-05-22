import React, { useEffect, useState, createContext } from "react";
import categoryService from "../services/categoryService";

export const CategoryContext = createContext();

export const CategoryProvider = ({ children }) => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await categoryService.getAll();
            const data = response?.data || response;
            setCategories(data || []);
        } catch (err) {
            console.error("Lỗi hệ thống", err);
            setError("Lỗi hệ thống");
        } finally {
            setLoading(false);
        }
    };

    const getCategoryById = async (id) => {
        setLoading(true);
        try {
            const response = await categoryService.getById(id);
            return response?.data || response;
        } catch (err) {
            console.error("Lỗi hệ thống", err);
            setError("Lỗi hệ thống");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return (
        <CategoryContext.Provider value={{ categories, loading, error, fetchCategories, getCategoryById }}>
            {children}
        </CategoryContext.Provider>
    );
};