import React, { useEffect, useMemo, useState } from 'react';
import { Search, Trash2 } from 'lucide-react';
import authService from '../../services/authService';

const AdminCustomers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const fetchCustomers = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authService.getAdminCustomers();
      const data = response?.data?.data || response?.data || response || [];
      setCustomers(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      console.error(fetchError);
      setError('Khong the tai danh sach khach hang.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return customers;
    }

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.phone, customer.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [customers, search]);

  const handleRoleChange = async (userId, role) => {
    try {
      const response = await authService.updateUserRole(userId, role);
      const updated = response?.data?.data || response?.data || response;
      setCustomers((current) => current.map((customer) => (customer.id === userId ? updated : customer)));
    } catch (updateError) {
      console.error(updateError);
      alert('Vai trò cập nhật thất bại');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Xóa khách hàng này?')) {
      return;
    }

    try {
      await authService.deleteAdminCustomer(userId);
      setCustomers((current) => current.filter((customer) => customer.id !== userId));
    } catch (deleteError) {
      console.error(deleteError);
      alert('Không thể xóa khách hàng');
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Hệ thống</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Quản lý khách hàng</h2>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full border-0 bg-transparent p-0 text-sm outline-none focus:ring-0"
          placeholder="Tìm kiếm khách hàng theo tên, email, vai trò..."
        />
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-slate-500">Đang tải danh sách khách hàng...</div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-left font-semibold">Tên</th>
                <th className="px-5 py-4 text-left font-semibold">Email</th>
                <th className="px-5 py-4 text-left font-semibold">Số điện thoại</th>
                <th className="px-5 py-4 text-left font-semibold">Địa chỉ</th>
                <th className="px-5 py-4 text-center font-semibold">Vai trò</th>
                <th className="px-5 py-4 text-right font-semibold">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4 font-semibold text-slate-900">{customer.name || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{customer.email || '-'}</td>
                  <td className="px-5 py-4 text-slate-700">{customer.phone || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{customer.address || '-'}</td>
                  <td className="px-5 py-4 text-center">
                    <select
                      value={customer.role || 'CUSTORMER'}
                      onChange={(event) => handleRoleChange(customer.id, event.target.value)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      <option value="CUSTORMER">Khách hàng</option>
                      <option value="ADMIN">Quản trị viên</option>
                      <option value="SHIPPER">SHIPPER</option>
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleDelete(customer.id)} className="rounded-full p-2 text-rose-600 transition hover:bg-rose-50">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-5 py-12 text-center text-slate-500">
                    Không tìm thấy khách hàng nào.
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

export default AdminCustomers;
