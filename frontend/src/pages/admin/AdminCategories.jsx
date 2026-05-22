import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import categoryService from '../../services/categoryService';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

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
      alert('Xóa thất bại');
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
                <tr key={category.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">{category.name}</p>
                    <p className="text-xs text-slate-500">#: {category.id}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 font-bold">{category.expiryThresholdDays} ngày</td>
                  <td className="px-5 py-4 text-center text-slate-700 font-bold">{category.productCount || 0}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/categories/edit/${category.id}`} className="rounded-full p-2 text-sky-700 transition hover:bg-sky-50">
                        <Pencil size={18} />
                      </Link>
                      <button onClick={() => handleDelete(category.id)} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50">
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
    </div>
  );
};

export default AdminCategories;
