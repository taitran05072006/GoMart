import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Boxes, LogOut, ShieldCheck, Store, Tags, Ticket, Archive, Users, Bell, Truck, ChevronDown } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive
    ? 'bg-white text-slate-900 shadow-sm'
    : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;

const SubNavItem = ({ to, label }) => {
  const location = useLocation();
  // So sánh toàn bộ đường dẫn bao gồm cả search params
  const isActive = location.pathname + location.search === to;

  return (
    <NavLink
      to={to}
      className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition-all border ${
        isActive
          ? 'bg-white/10 text-white border-blue-500/50 font-bold shadow-sm shadow-blue-500/10'
          : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
      }`}
    >
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-1 bg-blue-500 rounded-r-full animate-in fade-in slide-in-from-left-1 duration-300"></div>
      )}
      {label}
    </NavLink>
  );
};

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [orderMenuOpen, setOrderMenuOpen] = useState(location.pathname.startsWith('/admin/orders'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-hidden">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-white/10 bg-slate-950/95 p-6 backdrop-blur xl:p-8">
          <div className="mb-8 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-slate-950 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em]">Admin điều khiển</p>
                <h1 className="text-xl font-black">TUBA Điều khiển</h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-900/80"></p>
          </div>

          <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quản trị viên</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 font-black">
                {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-white">{user?.name || user?.username || 'Administrator'}</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            <NavLink to="/admin" end className={navItemClass}>
              <LayoutDashboard size={18} />
              Tổng quan
            </NavLink>
            <NavLink to="/admin/products" className={navItemClass}>
              <Boxes size={18} />
              Sản phẩm
            </NavLink>
            <NavLink to="/admin/categories" className={navItemClass}>
              <Tags size={18} />
              Danh mục
            </NavLink>
            <NavLink to="/admin/suppliers" className={navItemClass}>
              <Truck size={18} />
              Nhà cung cấp
            </NavLink>
            <NavLink to="/admin/vouchers" className={navItemClass}>
              <Ticket size={18} />
              Vouchers
            </NavLink>
            <NavLink to="/admin/stock-receipts" className={navItemClass}>
              <Archive size={18} />
              Nhập kho
            </NavLink>
            <NavLink to="/admin/customers" className={navItemClass}>
              <Users size={18} />
              Khách hàng
            </NavLink>
            <NavLink to="/admin/notifications" className={navItemClass}>
              <Bell size={18} />
              Thông báo
            </NavLink>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setOrderMenuOpen(!orderMenuOpen);
                  navigate('/admin/orders'); // Mặc định về tất cả đơn hàng
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${location.pathname.startsWith('/admin/orders')
                    ? 'bg-white/10 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Package size={18} />
                  Đơn hàng
                </div>
                <ChevronDown size={14} className={`transition-transform ${orderMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {orderMenuOpen && (
                <div className="ml-9 space-y-1 overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  <SubNavItem to="/admin/orders" label="Tất cả đơn hàng" />
                  <SubNavItem to="/admin/orders?status=PENDING" label="Chờ xác nhận" />
                  <SubNavItem to="/admin/orders?status=ACTIVE" label="Đang xử lý" />
                  <SubNavItem to="/admin/orders?status=SHIPPING" label="Đang giao" />
                  <SubNavItem to="/admin/orders?status=DELIVERED" label="Đã giao" />
                  <SubNavItem to="/admin/orders?status=CANCELLED" label="Đã hủy" />
                  <SubNavItem to="/admin/orders?status=RETURN_REQUESTED" label="Trả hàng / Hoàn tiền" />
                </div>
              )}
            </div>

            <NavLink to="/admin/shipping" className={navItemClass}>
              <Truck size={18} />
              Vận chuyển
            </NavLink>
            <NavLink to="/" className={navItemClass}>
              <Store size={18} />
              Trở về cửa hàng
            </NavLink>
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 hover:text-white"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </aside>

        <section className="p-4 sm:p-6 xl:p-8">
          <div className="min-h-[calc(100vh-64px)] rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6 xl:p-8">
            <Outlet />
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminLayout;