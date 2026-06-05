import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2, Package, Image as ImageIcon } from 'lucide-react';
import productService from '../../services/productService';
import toast from 'react-hot-toast';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const { user, impersonatedStoreId } = useContext(AuthContext);
  const isStoreMode = user?.role === 'SUPER_ADMIN' && Boolean(impersonatedStoreId);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productService.getAll();
      const productsData = response?.data?.data || response?.data || response || [];
      const allProducts = Array.isArray(productsData) ? productsData : [];

      // Sắp xếp theo tên
      allProducts.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
      setProducts(allProducts);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc muốn xóa / ngưng hoạt động sản phẩm "${name}"? Thao tác này có thể không hoàn tác được.`)) {
      return;
    }
    try {
      await productService.delete(id);
      toast.success('Đã xóa sản phẩm thành công');
      fetchProducts();
    } catch (err) {
      console.error(err);
      toast.error('Có lỗi xảy ra khi xóa sản phẩm');
    }
  };

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return [product.name, product.category, product.tag]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [products, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản trị Hệ thống</p>
          <h2 className="mt-2 text-2xl font-black">Danh sách Sản phẩm</h2>
          <p className="mt-2 text-sm text-white/70">Quản lý thêm, sửa, xóa các sản phẩm cốt lõi của toàn bộ hệ thống.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition-all hover:bg-amber-300 hover:scale-105 shadow-lg shadow-amber-400/20"
          >
            <Plus size={18} />
            Thêm sản phẩm mới
          </Link>
        </div>
      </div>

      {isStoreMode && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Bạn đang chọn một cửa hàng. Màn hình này vẫn giữ nguyên trang hiện tại, nhưng chỉ nên dùng ở chế độ toàn hệ thống.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Sản phẩm</p>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-slate-900">{products.length}</p>
              <p className="text-xs text-slate-500">Loại sản phẩm có trong hệ thống</p>
            </div>
            <div className="text-sm font-semibold text-slate-600">Loại</div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50">
        <Search size={20} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm font-medium outline-none focus:ring-0 placeholder:text-slate-400"
          placeholder="Tìm kiếm sản phẩm theo tên, danh mục, nhãn (tag)..."
        />
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-24 text-center">
            <Package size={48} className="mx-auto text-slate-200 animate-pulse mb-4" />
            <p className="text-sm font-bold text-slate-500">Đang tải dữ liệu sản phẩm...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs">Sản phẩm</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs">Danh mục</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs text-right">Giá gốc</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs text-right">Giá khuyến mãi</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs text-center">Đơn vị</th>
                  <th className="px-6 py-4 font-black uppercase tracking-wider text-slate-500 text-xs text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <p className="text-slate-500 font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const price = product.price || 0;
                    const discount = product.discount || 0;
                    const discountedPrice = price * (1 - discount / 100);

                    return (
                      <tr key={product.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                              {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                              ) : (
                                <ImageIcon size={20} className="text-slate-300" />
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{product.name}</p>
                              {product.tag && (
                                <span className="mt-1 inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                                  {product.tag}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-600">
                          {product.category || 'Chưa phân loại'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`font-bold ${discount > 0 ? 'text-slate-400 line-through text-xs' : 'text-slate-900'}`}>
                            {currency.format(price)}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {discount > 0 ? (
                            <div>
                              <p className="font-black text-rose-600">{currency.format(discountedPrice)}</p>
                              <p className="text-[10px] font-bold text-rose-500">-{discount}%</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs font-medium">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                            {product.unit || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              to={`/admin/products/edit/${product.id}`}
                              className="rounded-xl p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil size={18} />
                            </Link>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Xóa / Ngưng hoạt động"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;