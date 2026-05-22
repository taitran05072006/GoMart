import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import productService from "../services/productService";

export const ProductContext = createContext(null);

export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getAll();
      const data = response?.data ?? response;
      setProducts(Array.isArray(data) ? data : []);
      setFeatured((Array.isArray(data) ? data : []).slice(0, 8));
      return data;
    } catch (err) {
      console.error("Lấy danh sách sản phẩm không thành công", err);
      setError("Lấy danh sách sản phẩm không thành công");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductById = useCallback(async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getById(id);
      return response?.data ?? response;
    } catch (err) {
      console.error("Lấy chi tiết sản phẩm không thành công", err);
      setError("Lấy chi tiết sản phẩm không thành công");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProductsByCategory = useCallback(async (categoryId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.getByCategory(categoryId);
      return response?.data ?? response;
    } catch (err) {
      console.error("Lấy sản phẩm theo danh mục không thành công", err);
      setError("Lấy sản phẩm theo danh mục không thành công");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchProducts = useCallback(async (searchParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.search(searchParams);
      return response?.data ?? response;
    } catch (err) {
      console.error("Tìm kiếm sản phẩm thất bại", err);
      setError("Tìm kiếm sản phẩm thất bại");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const filterProducts = useCallback(async (filterParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await productService.filter(filterParams);
      return response?.data ?? response;
    } catch (err) {
      console.error("Lọc sản phẩm thất bại", err);
      setError("Lọc sản phẩm thất bại");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Best-effort preload for pages that use context
    fetchProducts().catch(() => undefined);
  }, [fetchProducts]);

  const value = useMemo(
    () => ({
      products,
      featured,
      loading,
      error,
      fetchProducts,
      getProductById,
      getProductsByCategory,
      searchProducts,
      filterProducts,
    }),
    [
      products,
      featured,
      loading,
      error,
      fetchProducts,
      getProductById,
      getProductsByCategory,
      searchProducts,
      filterProducts,
    ]
  );

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>;
};

