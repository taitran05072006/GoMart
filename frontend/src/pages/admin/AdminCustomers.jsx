import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
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
      setError('Không thể tải danh sách khách hàng.');
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
      [customer.name, customer.email, customer.phone, customer.role, customer.storeName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    );
  }, [customers, search]);

  return (
    <div className="space-y-6 relative">
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
                    <div className="flex flex-col items-center gap-1">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${customer.role === 'SUPER_ADMIN' ? 'bg-amber-100 text-amber-700' : customer.role === 'STORE_ADMIN' ? 'bg-blue-100 text-blue-700' : customer.role === 'SHIPPER' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                        {customer.role === 'SUPER_ADMIN'
                          ? 'SUPER_ADMIN'
                          : customer.role === 'STORE_ADMIN'
                            ? 'STORE_ADMIN'
                              : customer.role === 'SHIPPER'
                                ? 'SHIPPER'
                                : 'CUSTOMER'}
                      </span>
                      {customer.role === 'STORE_ADMIN' && customer.storeName && (
                        <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                          {customer.storeName}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-5 py-12 text-center text-slate-500">
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
