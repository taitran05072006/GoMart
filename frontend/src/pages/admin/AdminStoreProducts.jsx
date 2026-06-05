import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import productService from '../../services/productService';
import toast from 'react-hot-toast';
import { Search, Store, RefreshCw } from 'lucide-react';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const AdminStoreProducts = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const storeId = user?.role === 'SUPER_ADMIN' ? impersonatedStoreId : user?.storeId;
  const isSystemMode = user?.role === 'SUPER_ADMIN' && !storeId;

  const [products, setProducts] = useState([]);
  const [systemProducts, setSystemProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('selling');

  const fetchProducts = async () => {
    if (!storeId) {
      setProducts([]);
      setSystemProducts([]);
      return;
    }

    setLoading(true);
    try {
      const [storeRes, systemRes] = await Promise.all([
        productService.getByStoreId(storeId),
        productService.getAll()
      ]);
      const data = storeRes?.data?.data || storeRes?.data || storeRes || [];
      const sysData = systemRes?.data?.data || systemRes?.data || systemRes || [];

      const list = Array.isArray(data) ? data : [];
      setProducts(list);
      setSystemProducts(Array.isArray(sysData) ? sysData : []);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const currentList = activeTab === 'selling' ? products : systemProducts;

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return currentList;
    return currentList.filter((product) =>
      [product.name, product.category, product.tag]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [currentList, search]);



  const handleToggleSelling = async (productId) => {
    setSavingId(productId);
    try {
      await productService.toggleSelling(productId, storeId);
      toast.success('Đã cập nhật trạng thái bán');
      await fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (product) => {
    if (user?.role === 'STORE_ADMIN') {
      toast.error('Xóa sản phẩm chỉ dành cho SUPER_ADMIN');
      return;
    }
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này không? Hành động không thể hoàn tác.')) return;
    try {
      await productService.delete(product.id);
      toast.success('Đã xóa sản phẩm');
      await fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Xóa sản phẩm thất bại');
    }
  };

  if (isSystemMode) {
    return <Navigate to="/admin/inventory" replace />;
  }

  return (
    <div className="space-y-6">

      {!storeId && user?.role === 'SUPER_ADMIN' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chọn một cửa hàng ở góc phải phía trên. Nếu muốn xem toàn bộ hệ thống, vào menu Tồn kho toàn hệ thống.
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-2xl w-max">
          <button
            onClick={() => setActiveTab('selling')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'selling'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            Sản phẩm đang bán ({products.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'system'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            Thêm từ hệ thống
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:w-80 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
          <Search size={18} className="text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
            placeholder="Tìm theo tên, danh mục..."
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải sản phẩm...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Sản phẩm</th>
                {activeTab === 'selling' && (
                  <>
                    <th className="px-5 py-4 text-center font-semibold">Giá bán</th>
                    <th className="px-5 py-4 text-center font-semibold">Tồn kho</th>
                  </>
                )}
                <th className="px-5 py-4 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const isSelling = products.some(p => p.id === product.id);

                return (
                  <tr key={product.id} className={`hover:bg-slate-50/80 ${activeTab === 'system' && isSelling ? 'opacity-50' : ''}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          onError={(e) => {
                            e.target.src = 'https://placehold.co/100x100?text=No+Image';
                            e.target.onerror = null;
                          }}
                          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200 bg-white"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">ID: {product.id} {activeTab === 'system' && `• Giá gốc: ${currency.format(product.price || 0)}`}</p>
                          <p className="text-xs text-slate-400">{product.category || 'Uncategorized'}</p>
                        </div>
                      </div>
                    </td>

                    {activeTab === 'selling' && (
                      <>
                        <td className="px-5 py-4 text-center font-bold text-slate-700">
                          {currency.format(product.price || 0)}
                        </td>
                        <td className="px-5 py-4 text-center font-bold text-slate-700">
                          {product.stock ?? 0}
                        </td>
                      </>
                    )}

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'selling' ? (
                          <>
                            {(user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN') && (
                              <Link
                                to={`/admin/products/edit/${product.id}`}
                                className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
                              >
                                Chỉnh sửa
                              </Link>
                            )}
                            <button
                              type="button"
                              disabled={savingId === product.id}
                              onClick={() => handleToggleSelling(product.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              Ngừng bán
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            disabled={savingId === product.id}
                            onClick={() => handleToggleSelling(product.id)}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                              isSelling
                                ? 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                            }`}
                          >
                            {savingId === product.id ? 'Đang xử lý...' : (isSelling ? 'Đang bán (Bấm để Ngừng)' : 'Bán tại cửa hàng')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={activeTab === 'selling' ? 4 : 2} className="px-5 py-12 text-center text-slate-500">
                    {activeTab === 'selling' ? 'Cửa hàng này chưa bán sản phẩm nào.' : 'Không tìm thấy sản phẩm trong hệ thống.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminStoreProducts;