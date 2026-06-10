import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import categoryService from '../../services/categoryService';
import productService from '../../services/productService';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState('');

  const fetchProductsByCategory = async (categoryId) => {
    setLoadingProducts(true);
    setProductsError('');
    try {
      const response = await productService.getByCategory(categoryId);
      const data = response?.data || response || [];
      setCategoryProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProductsError('Không thể tải danh sách sản phẩm của danh mục này.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    fetchProductsByCategory(category.id);
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      return;
    }
    try {
      await productService.delete(productId);
      setCategoryProducts((current) => current.filter((p) => p.id !== productId));
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert('Xóa sản phẩm thất bại');
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    setError('');

    try {
      const response = search.trim()
        ? await categoryService.search(search.trim())
        : await categoryService.getAll();

      const data = response?.data?.data || response?.data || response || [];
      setCategories(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Khong the tai danh sach danh muc.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return categories;
    }

    return categories.filter((category) =>
      String(category.name).toLowerCase().includes(keyword)
    );
  }, [categories, search]);

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa danh mục này?')) {
      return;
    }

    try {
      await categoryService.delete(id);
      setCategories((current) => current.filter((category) => category.id !== id));
    } catch (deleteError) {
      console.error(deleteError);
      const msg = deleteError.response?.data?.message || deleteError.response?.data || 'Xóa thất bại';
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản lý</p>
          <h2 className="mt-2 text-2xl font-black">Quản lý danh mục</h2>
        </div>
        <Link
          to="/admin/categories/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          <Plus size={16} />
          Thêm danh mục
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm kiếm danh mục theo tên..."
        />
        <button
          onClick={fetchCategories}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Tìm kiếm
        </button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải danh mục...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Danh mục</th>
                <th className="px-5 py-4 text-left font-semibold">Ngưỡng cảnh báo</th>
                <th className="px-5 py-4 text-center font-semibold">Sản phẩm</th>
                <th className="px-5 py-4 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-slate-50/80 cursor-pointer group transition-all duration-150">
                  <td onClick={() => handleCategoryClick(category)} className="px-5 py-4">
                    <p className="font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">{category.name}</p>
                    <p className="text-xs text-slate-500">#: {category.id}</p>
                  </td>
                  <td onClick={() => handleCategoryClick(category)} className="px-5 py-4 text-slate-600 font-medium">{category.expiryThresholdDays} ngày</td>
                  <td onClick={() => handleCategoryClick(category)} className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors">
                      {category.productCount || 0} sản phẩm
                    </span>
                  </td>
                  <td onClick={(e) => e.stopPropagation()} className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/categories/edit/${category.id}`} className="rounded-full p-2 text-sky-700 transition hover:bg-sky-50" title="Chỉnh sửa danh mục">
                        <Pencil size={18} />
                      </Link>
                      <button onClick={() => handleDelete(category.id)} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50" title="Xóa danh mục">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-5 py-12 text-center text-slate-500">
                    Không tìm thấy danh mục nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Premium Glassmorphism Modal */}
      {selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop Blur overlay */}
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-all duration-300"
            onClick={() => setSelectedCategory(null)}
          />
          
          {/* Modal content box */}
          <div className="relative z-10 flex flex-col w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/90 text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold">Danh mục: {selectedCategory.name}</p>
                <h3 className="mt-1 text-xl font-extrabold text-white">Sản phẩm thuộc danh mục</h3>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/admin/categories/edit/${selectedCategory.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-amber-300"
                  id={`btn-edit-cat-${selectedCategory.id}`}
                >
                  <Pencil size={12} />
                  Sửa danh mục
                </Link>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white"
                  aria-label="Đóng"
                  id="btn-close-modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent"></div>
                  <p className="mt-4 text-sm text-white/60">Đang tải danh sách sản phẩm...</p>
                </div>
              ) : productsError ? (
                <div className="rounded-2xl border border-rose-950 bg-rose-950/30 px-4 py-4 text-center text-sm text-rose-300">
                  {productsError}
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="rounded-full bg-white/5 p-4 text-white/30">
                    <Search size={32} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-white/80">Không có sản phẩm nào</p>
                  <p className="mt-1 text-sm text-white/50">Danh mục này hiện chưa có sản phẩm nào được gán.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <table className="min-w-full divide-y divide-white/10 text-sm">
                    <thead className="bg-white/5 text-white/60">
                      <tr>
                        <th className="px-5 py-3.5 text-left font-semibold">Sản phẩm</th>
                        <th className="px-5 py-3.5 text-center font-semibold">Giá bán</th>
                        <th className="px-5 py-3.5 text-center font-semibold">Kho hàng</th>
                        <th className="px-5 py-3.5 text-right font-semibold">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {categoryProducts.map((product) => (
                        <tr key={product.id} className="transition hover:bg-white/5">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                onError={(e) => {
                                  e.target.src = 'https://placehold.co/100x100?text=No+Image';
                                  e.target.onerror = null;
                                }}
                                className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10"
                              />
                              <div>
                                <p className="font-semibold text-white">{product.name}</p>
                                <p className="text-[11px] text-white/40">ID: {product.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center font-medium text-white/95">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(product.oldPrice || 0))}
                            {product.unit ? <span className="text-white/60 text-xs ml-1">/ {product.unit}</span> : ''}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${Number(product.stock || 0) > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                              {Number(product.stock || 0) > 0 ? `${product.stock}` : 'Hết hàng'}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link 
                                to={`/admin/products/edit/${product.id}`}
                                className="rounded-full p-2 text-sky-400 transition hover:bg-white/5"
                                title="Chỉnh sửa sản phẩm"
                                id={`btn-edit-prod-${product.id}`}
                              >
                                <Pencil size={16} />
                              </Link>
                              <button 
                                onClick={() => handleDeleteProduct(product.id)}
                                className="rounded-full p-2 text-rose-400 transition hover:bg-white/5"
                                title="Xóa sản phẩm"
                                id={`btn-del-prod-${product.id}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-slate-950">
              <span className="text-xs text-white/50">
                Tổng số: <strong className="text-white">{categoryProducts.length}</strong> sản phẩm
              </span>
              <button
                onClick={() => setSelectedCategory(null)}
                className="rounded-full border border-white/20 bg-transparent px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/30"
                id="btn-cancel-modal"
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
