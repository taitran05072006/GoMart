import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import voucherService from '../../services/voucherService';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '-');

const AdminVouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchVouchers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await voucherService.getAll();
      const data = response?.data?.data || response?.data || response || [];
      setVouchers(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Khong the tai danh sach voucher.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return vouchers;
    }

    return vouchers.filter((voucher) =>
      [voucher.code, voucher.discountType, voucher.voucherType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [vouchers, search]);

  const handleDelete = async (code) => {
    if (!window.confirm(`Xóa ${code}?`)) {
      return;
    }

    try {
      await voucherService.remove(code);
      setVouchers((current) => current.filter((voucher) => voucher.code !== code));
    } catch (deleteError) {
      console.error(deleteError);
      const msg = deleteError.response?.data?.message || deleteError.message || 'Xóa thất bại';
      toast.error(msg);
    }
  };

  const handleToggle = async (code, active) => {
    try {
      const response = await voucherService.toggleActive(code, !active);
      const updated = response?.data?.data || response?.data || response;
      setVouchers((current) => current.map((voucher) => (voucher.code === code ? updated : voucher)));
    } catch (toggleError) {
      console.error(toggleError);
      alert('Không thể chuyển đổi trạng thái voucher');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl bg-slate-950 p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Điều chỉnh voucher</p>
          <h2 className="mt-2 text-2xl font-black">Quản lý voucher</h2>
        </div>
        <Link
          to="/admin/vouchers/new"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
        >
          <Plus size={16} />
          Thêm voucher
        </Link>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm kiếm voucher theo code, loại giảm giá hoặc loại voucher..."
        />
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải voucher...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Tên & Loại</th>
                <th className="px-5 py-4 text-left font-semibold">Hình thức</th>
                <th className="px-5 py-4 text-center font-semibold">Giá trị</th>
                <th className="px-5 py-4 text-center font-semibold">Sử dụng</th>
                <th className="px-5 py-4 text-center font-semibold">Thời gian</th>
                <th className="px-5 py-4 text-center font-semibold">Trạng thái</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((voucher) => (
                <tr key={voucher.code} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">{voucher.code}</div>
                    <div className={`text-[10px] font-bold uppercase ${voucher.voucherType === 'SHIPPING' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {voucher.voucherType === 'SHIPPING' ? '🚚 Vận chuyển' : '🛍️ Đơn hàng'}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{voucher.discountType === 'PERCENT' ? 'Giảm phần trăm' : 'Giảm số tiền'}</td>
                  <td className="px-5 py-4 text-center text-slate-700 font-medium">
                    {voucher.discountType === 'PERCENT'
                      ? `${voucher.value}%`
                      : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(voucher.value)}
                  </td>
                  <td className="px-5 py-4 text-center text-slate-700">{voucher.usedCount || 0}/{voucher.usageLimit || 0}</td>
                  <td className="px-5 py-4 text-center text-xs text-slate-500">
                    <div>{formatDateTime(voucher.startDate)}</div>
                    <div>{formatDateTime(voucher.endDate)}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => handleToggle(voucher.code, voucher.isActive === true)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${voucher.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}
                    >
                      {voucher.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <Link to={`/admin/vouchers/edit/${encodeURIComponent(voucher.code)}`} className="rounded-full p-2 text-sky-700 transition hover:bg-sky-50">
                        <Pencil size={18} />
                      </Link>
                      <button onClick={() => handleDelete(voucher.code)} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500">
                    Không tìm thấy voucher nào
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

export default AdminVouchers;
