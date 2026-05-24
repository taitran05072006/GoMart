import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import productService from '../../services/productService';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await productService.getAll();
      const data = response?.data?.data || response?.data || response || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) {
      return;
    }

    try {
      await productService.delete(id);
      setProducts((current) => current.filter((product) => product.id !== id));
    } catch (deleteError) {
      console.error(deleteError);
      alert('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Quản lý sản phẩm</p>
          <h2 className="mt-2 text-2xl font-black">Quản lý sản phẩm</h2>
        </div>
        <Link
          to="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          <Plus size={16} />
          Thêm sản phẩm
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm kiếm sản phẩm theo tên, danh mục hoặc tag..."
        />
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải sản phẩm...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Sản phẩm</th>
                <th className="px-5 py-4 text-left font-semibold">Danh mục</th>
                <th className="px-5 py-4 text-center font-semibold">Giá</th>
                <th className="px-5 py-4 text-center font-semibold">Kho</th>
                <th className="px-5 py-4 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        onError={(e) => {
                          e.target.src = 'https://placehold.co/100x100?text=No+Image';
                          e.target.onerror = null;
                        }}
                        className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">ID: {product.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{product.category || 'Uncategorized'}</td>
                  <td className="px-5 py-4 text-center font-semibold text-slate-900">{currency.format(Number(product.oldPrice || 0))}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(product.stock || 0) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {Number(product.stock || 0) > 0 ? `${product.stock}` : 'Hết hàng'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/products/edit/${product.id}`} className="rounded-full p-2 text-sky-700 transition hover:bg-sky-50">
                        <Pencil size={18} />
                      </Link>
                      <button onClick={() => handleDelete(product.id)} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
                    Không tìm thấy sản phẩm nào.
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

export default AdminProducts;