import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axiosClient from '../../api/axiosClient';
import authService from '../../services/authService';
import { AuthContext } from '../../context/AuthContext';
import { X, Mail, Phone, MapPin, Calendar, Shield, Store } from 'lucide-react';

const initialForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  role: '',
  storeId: '',
};

const AdminAccounts = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const [stores, setStores] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [storeAdmins, setStoreAdmins] = useState([]);
  const [shippers, setShippers] = useState([]);
  const [expandedStoreId, setExpandedStoreId] = useState(null);
  const [selectedShipper, setSelectedShipper] = useState(null);

  const canCreate = user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN';
  const allowedRoles = useMemo(() => {
    if (user?.role === 'SUPER_ADMIN' && impersonatedStoreId) return ['SHIPPER'];
    if (user?.role === 'SUPER_ADMIN') return ['SUPER_ADMIN', 'STORE_ADMIN'];
    if (user?.role === 'STORE_ADMIN') return ['SHIPPER'];
    return [];
  }, [impersonatedStoreId, user?.role]);

  const loadData = async () => {
    try {
      if (user?.role === 'SUPER_ADMIN') {
        const [storesRes, adminsRes, shippersRes] = await Promise.all([
          axiosClient.get('/stores'),
          authService.getAdminStoreAdmins(),
          authService.getAdminShippers()
        ]);
        const storesData = storesRes?.data?.data || storesRes?.data || storesRes || [];
        setStores(Array.isArray(storesData) ? storesData.filter((store) => store?.deleted !== true) : []);
        setStoreAdmins(adminsRes?.data?.data || adminsRes?.data || []);
        setShippers(shippersRes?.data?.data || shippersRes?.data || []);
      } else if (user?.role === 'STORE_ADMIN') {
        const shippersRes = await authService.getAdminShippers();
        setShippers(shippersRes?.data?.data || shippersRes?.data || []);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (canCreate) {
      loadData();
    }
  }, [user?.role, canCreate]);

  useEffect(() => {
    if (allowedRoles.length > 0 && !allowedRoles.includes(form.role)) {
      setForm((current) => ({
        ...current,
        role: allowedRoles[0],
        storeId: '',
      }));
    }
  }, [allowedRoles, form.role]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && impersonatedStoreId) {
      setForm((current) => ({
        ...current,
        role: 'SHIPPER',
        storeId: impersonatedStoreId,
      }));
    }
  }, [impersonatedStoreId, user?.role]);

  useEffect(() => {
    if (form.storeId && !stores.some((store) => String(store.id) === String(form.storeId))) {
      setForm((current) => ({
        ...current,
        storeId: '',
      }));
    }
  }, [form.storeId, stores]);

  if (!canCreate) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    const role = form.role || allowedRoles[0];
    if (!role) {
      toast.error('Vui lòng chọn vai trò');
      return;
    }

    if (user?.role === 'SUPER_ADMIN' && impersonatedStoreId && role !== 'SHIPPER') {
      toast.error('Trong chế độ cửa hàng chỉ được tạo SHIPPER');
      return;
    }

    if (role === 'STORE_ADMIN' && !form.storeId) {
      toast.error('Vui lòng chọn cửa hàng cho tài khoản STORE_ADMIN');
      return;
    }

    setSaving(true);
    try {
      await authService.createAdminAccount({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role,
        storeId: role === 'STORE_ADMIN' ? Number(form.storeId) : null,
      });
      toast.success('Tạo tài khoản thành công');
      setForm({
        ...initialForm,
        role: allowedRoles[0] || '',
        storeId: user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? String(impersonatedStoreId) : '',
      });
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Không thể tạo tài khoản');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (userId, userName) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${userName}" không?`)) {
      return;
    }
    try {
      await authService.deleteAdminCustomer(userId);
      toast.success('Xóa tài khoản thành công');
      loadData();
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Không thể xóa tài khoản');
    }
  };

  const showStoreSelect = form.role === 'STORE_ADMIN' && !(user?.role === 'SUPER_ADMIN' && impersonatedStoreId);
  const isStoreMode = user?.role === 'SUPER_ADMIN' && Boolean(impersonatedStoreId);
  const pageTitle = user?.role === 'SUPER_ADMIN' ? 'Nhân viên' : 'Tài khoản Shipper';

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Tài khoản</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">{pageTitle}</h2>
        <p className="mt-2 text-sm text-slate-500">
          {user?.role === 'SUPER_ADMIN'
            ? 'SUPER_ADMIN có thể tạo STORE_ADMIN ở chế độ toàn hệ thống. Quản lý tài khoản và shipper.'
            : 'Tạo và quản lý các tài khoản SHIPPER thuộc cửa hàng của bạn.'}
        </p>
      </div>

      {isStoreMode && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Bạn đang ở chế độ cửa hàng: tài khoản mới sẽ được tạo với vai trò SHIPPER cho cửa hàng đã chọn.
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">Tạo tài khoản mới</h3>
        </div>
        <Field label="Họ và tên" name="name" value={form.name} onChange={handleChange} />
        <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} />
        <Field label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} />
        <Field label="Mật khẩu" name="password" type="password" value={form.password} onChange={handleChange} />
        <Field label="Xác nhận mật khẩu" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} />

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Vai trò</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={isStoreMode}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
          >
            {allowedRoles.map((role) => (
              <option key={role} value={role}>
                {role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : role === 'STORE_ADMIN' ? 'STORE_ADMIN' : 'SHIPPER'}
              </option>
            ))}
          </select>
        </div>

        {showStoreSelect && user?.role === 'SUPER_ADMIN' && (
          <div className="lg:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-700">Cửa hàng</label>
            <select
              name="storeId"
              value={form.storeId}
              onChange={handleChange}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">-- Chọn cửa hàng --</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}{store.address ? ` - ${store.address}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {showStoreSelect && user?.role === 'STORE_ADMIN' && (
          <div className="lg:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Tài khoản SHIPPER sẽ tự động gắn với cửa hàng của bạn.
          </div>
        )}

        <div className="lg:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </div>
      </form>

      {/* Danh sách */}
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4">Danh sách tài khoản</h3>

        {user?.role === 'SUPER_ADMIN' && !impersonatedStoreId ? (
          <div className="space-y-4">
            {storeAdmins.length === 0 ? (
              <p className="text-sm text-slate-500">Chưa có tài khoản STORE_ADMIN nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Tên / Cửa hàng</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">SĐT</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {storeAdmins.map((admin) => (
                      <React.Fragment key={admin.id}>
                        <tr className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            <div>{admin.name}</div>
                            <div className="text-[11px] font-medium text-amber-600 mt-0.5">{admin.storeName || 'Không có cửa hàng'}</div>
                          </td>
                          <td className="px-4 py-3">{admin.email}</td>
                          <td className="px-4 py-3">{admin.phone}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              <button
                                onClick={() => setExpandedStoreId(expandedStoreId === admin.storeId ? null : admin.storeId)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                              >
                                {expandedStoreId === admin.storeId ? 'Thu gọn' : 'Xem Shipper'}
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(admin.id, admin.name)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                        {expandedStoreId === admin.storeId && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={4} className="px-6 py-4">
                              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                                <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 border-b border-slate-100 pb-2">Shipper thuộc cửa hàng: {admin.storeName}</h4>
                                {shippers.filter(s => s.storeId === admin.storeId).length === 0 ? (
                                  <p className="text-sm text-slate-500">Cửa hàng này chưa có Shipper nào.</p>
                                ) : (
                                  <table className="w-full text-left text-sm text-slate-600">
                                    <thead className="text-[11px] uppercase text-slate-400">
                                      <tr>
                                        <th className="pb-2">Tên</th>
                                        <th className="pb-2">Email</th>
                                        <th className="pb-2">SĐT</th>
                                        <th className="pb-2 text-right">Thao tác</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                      {shippers.filter(s => s.storeId === admin.storeId).map((shipper) => (
                                        <tr 
                                          key={shipper.id}
                                          onClick={() => setSelectedShipper(shipper)}
                                          className="cursor-pointer hover:bg-slate-50 transition"
                                        >
                                          <td className="py-2 font-medium text-slate-700">{shipper.name}</td>
                                          <td className="py-2">{shipper.email}</td>
                                          <td className="py-2">{shipper.phone}</td>
                                          <td className="py-2 text-right">
                                            <button 
                                              type="button"
                                              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                                            >
                                              Chi tiết
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {(user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? shippers.filter(s => String(s.storeId) === String(impersonatedStoreId)) : shippers).length === 0 ? (
              <p className="text-sm text-slate-500">{user?.role === 'SUPER_ADMIN' ? 'Cửa hàng này chưa có Shipper nào.' : 'Bạn chưa có Shipper nào.'}</p>
            ) : (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Số điện thoại</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(user?.role === 'SUPER_ADMIN' && impersonatedStoreId ? shippers.filter(s => String(s.storeId) === String(impersonatedStoreId)) : shippers).map((shipper) => (
                    <tr 
                      key={shipper.id} 
                      onClick={() => setSelectedShipper(shipper)}
                      className="cursor-pointer hover:bg-slate-100/50 transition"
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{shipper.name}</td>
                      <td className="px-4 py-3">{shipper.email}</td>
                      <td className="px-4 py-3">{shipper.phone}</td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          type="button"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal chi tiết Shipper */}
      {selectedShipper && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedShipper(null)}
        >
          <div 
            className="w-full max-w-lg overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 font-bold uppercase text-xl">
                  {selectedShipper.name ? selectedShipper.name.charAt(0) : '?'}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{selectedShipper.name}</h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 mt-1">
                    <Shield className="h-3 w-3" />
                    Shipper
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedShipper(null)}
                className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Email</span>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="break-all">{selectedShipper.email}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Số điện thoại</span>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{selectedShipper.phone || 'Chưa cung cấp'}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Cửa hàng liên kết</span>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Store className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{selectedShipper.storeName || 'Không có cửa hàng'}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Địa chỉ</span>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{selectedShipper.address || 'Chưa cung cấp'}</span>
                  </div>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Ngày tạo tài khoản</span>
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>
                      {selectedShipper.createdAt
                        ? new Date(selectedShipper.createdAt).toLocaleString('vi-VN', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Không rõ'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-between items-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  handleDeleteAccount(selectedShipper.id, selectedShipper.name);
                  setSelectedShipper(null);
                }}
                className="rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition"
              >
                Xóa tài khoản
              </button>
              <button
                type="button"
                onClick={() => setSelectedShipper(null)}
                className="rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, ...props }) => (
  <div>
    <label className="mb-2 block text-sm font-semibold text-slate-700">{label}</label>
    <input
      {...props}
      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
    />
  </div>
);

export default AdminAccounts;