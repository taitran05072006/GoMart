import React, { useContext, useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Boxes, LogOut, ShieldCheck, Store, Tags, Ticket, Archive, Users, Bell, Truck, ChevronDown, Building2, Globe, UserPlus, Warehouse, Menu, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import axiosClient from '../../api/axiosClient';

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive
    ? 'bg-white text-slate-900 shadow-sm'
    : 'text-slate-300 hover:bg-white/10 hover:text-white'}`;

const SubNavItem = ({ to, label }) => {
  const location = useLocation();
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
  const { user, logout, impersonatedStoreId, setImpersonatedStoreId } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const isStoreMode = user?.role === 'SUPER_ADMIN' && Boolean(impersonatedStoreId);
  const [orderMenuOpen, setOrderMenuOpen] = useState(location.pathname.startsWith('/admin/orders'));
  const [stores, setStores] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchStores = () => {
      if (user?.role === 'SUPER_ADMIN') {
        axiosClient.get('/stores').then(res => {
          const data = res?.data?.data || res?.data || res || [];
          setStores(Array.isArray(data) ? data.filter((store) => store?.deleted !== true) : []);
        }).catch(err => console.error(err));
      }
    };

    fetchStores();

    window.addEventListener('refreshStores', fetchStores);
    return () => window.removeEventListener('refreshStores', fetchStores);
  }, [user?.role]);

  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && impersonatedStoreId && stores.length > 0) {
      const stillAvailable = stores.some((store) => String(store.id) === String(impersonatedStoreId));
      if (!stillAvailable) {
        setImpersonatedStoreId('');
      }
    }
  }, [impersonatedStoreId, setImpersonatedStoreId, stores, user?.role]);

  // Tự động đóng sidebar di động khi chuyển hướng
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row">
      
      {/* Mobile Top Header */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-5 py-4 text-white lg:hidden z-30 sticky top-0 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 transition"
            aria-label="Open sidebar"
          >
            <Menu size={22} />
          </button>
          <Link to="/" className="flex items-center gap-1">
            <span className="text-lg font-black tracking-tight">TUBA</span>
            <span className="text-lg font-black tracking-tight text-amber-300">Mart</span>
          </Link>
        </div>

        {user?.role === 'SUPER_ADMIN' && stores.length > 0 && (
          <div className="relative inline-flex items-center">
            <Building2 className="absolute left-2.5 text-blue-700 pointer-events-none" size={14} />
            <select
              value={impersonatedStoreId}
              onChange={(e) => setImpersonatedStoreId(e.target.value)}
              className="pl-7 pr-6 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none shadow-sm cursor-pointer"
            >
              <option value="">Toàn hệ thống</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </header>

      {/* Sidebar Overlay Backdrop (Mobile) */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col bg-slate-950/95 p-6 backdrop-blur transition-transform duration-300 lg:static lg:translate-x-0 xl:p-8 overflow-y-auto h-screen shrink-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button on Mobile */}
        <div className="flex items-center justify-between mb-4 lg:hidden">
          <span className="text-slate-400 text-xs font-semibold uppercase tracking-[0.2em]">Menu Quản trị</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition active:scale-95"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Dashboard Title Card */}
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-5 text-slate-950 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-950/80">Admin điều khiển</p>
              <h1 className="text-lg font-black">TUBA Điều khiển</h1>
            </div>
          </div>
        </div>

        {/* Admin Info Card */}
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quản trị viên</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 font-black shrink-0">
              {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{user?.name || user?.username || 'Administrator'}</p>
              <p className="text-sm text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {isStoreMode && (
          <div className="mb-6 rounded-3xl border border-blue-400/20 bg-blue-500/10 p-4 text-blue-100">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200/80">Chế độ cửa hàng</p>
            <p className="mt-2 text-sm text-blue-50">Đang giả lập quyền của cửa hàng đã chọn. Ẩn các màn hình toàn hệ thống.</p>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="space-y-2 flex-grow">
          <NavLink to="/admin" end className={navItemClass}>
            <LayoutDashboard size={18} />
            Tổng quan
          </NavLink>
          
          {!isStoreMode && user?.role === 'SUPER_ADMIN' && (
            <NavLink to="/admin/products" className={navItemClass}>
              <Boxes size={18} />
              Sản phẩm hệ thống
            </NavLink>
          )}
          
          {isStoreMode && user?.role === 'SUPER_ADMIN' && (
            <NavLink to="/admin/store-products" className={navItemClass}>
              <Boxes size={18} />
              Sản phẩm theo cửa hàng
            </NavLink>
          )}
          
          {user?.role === 'STORE_ADMIN' && (
            <NavLink to="/admin/store-products" className={navItemClass}>
              <Boxes size={18} />
              Sản phẩm theo cửa hàng
            </NavLink>
          )}
          
          {!isStoreMode && user?.role === 'SUPER_ADMIN' && (
            <>
              <NavLink to="/admin/categories" className={navItemClass}>
                <Tags size={18} />
                Danh mục
              </NavLink>
              <NavLink to="/admin/vouchers" className={navItemClass}>
                <Ticket size={18} />
                Vouchers
              </NavLink>
              <NavLink to="/admin/customers" className={navItemClass}>
                <Users size={18} />
                Khách hàng
              </NavLink>
            </>
          )}
          
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN') && (
            <NavLink to="/admin/accounts" className={navItemClass}>
              <UserPlus size={18} />
              Tạo tài khoản
            </NavLink>
          )}
          
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN') && (
            <NavLink to="/admin/suppliers" className={navItemClass}>
              <Truck size={18} />
              Nhà cung cấp
            </NavLink>
          )}
          
          {(user?.role === 'SUPER_ADMIN' || user?.role === 'STORE_ADMIN') && (
            <NavLink to="/admin/stock-receipts" className={navItemClass}>
              <Archive size={18} />
              Nhập kho
            </NavLink>
          )}
          
          {!isStoreMode && user?.role === 'SUPER_ADMIN' && (
            <NavLink to="/admin/inventory" className={navItemClass}>
              <Warehouse size={18} />
              Tồn kho toàn hệ thống
            </NavLink>
          )}
          
          <NavLink to="/admin/notifications" className={navItemClass}>
            <Bell size={18} />
            Thông báo
          </NavLink>

          {/* Orders collapsible menu */}
          <div className="space-y-1">
            <button
              onClick={() => {
                setOrderMenuOpen(!orderMenuOpen);
                navigate('/admin/orders');
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

          {user?.role === 'SUPER_ADMIN' && (
            <>
              <NavLink to="/admin/shipping" className={navItemClass}>
                <Truck size={18} />
                Vận chuyển
              </NavLink>
              <NavLink to="/admin/stores" className={navItemClass}>
                <Building2 size={18} />
                Cửa hàng & Khu vực
              </NavLink>
            </>
          )}
          
          <NavLink to="/" className={navItemClass}>
            <Store size={18} />
            Trở về cửa hàng
          </NavLink>
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 hover:text-white"
        >
          <LogOut size={18} />
          Đăng xuất
        </button>
      </aside>

      {/* Main Content Area */}
      <section className="flex-1 p-4 sm:p-6 xl:p-8 min-w-0 flex flex-col h-[calc(100vh-73px)] lg:h-screen overflow-y-auto">
        {/* Desktop Top Store Impersonator Selector */}
        {user?.role === 'SUPER_ADMIN' && stores.length > 0 && (
          <div className="hidden lg:flex items-center justify-end mb-4">
            <div className="relative inline-flex items-center">
              <Building2 className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <ChevronDown className="absolute right-3 top-3 text-slate-400 pointer-events-none" size={15} />
              <select
                value={impersonatedStoreId}
                onChange={(e) => setImpersonatedStoreId(e.target.value)}
                className="pl-9 pr-8 py-2 text-sm font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none shadow-sm cursor-pointer"
              >
                <option value="">Toàn hệ thống (Tất cả cửa hàng)</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.region?.name || 'Chưa phân khu vực'})</option>
                ))}
              </select>
            </div>
          </div>
        )}
        
        {/* Page Inner Content Panel */}
        <div className="flex-1 rounded-[28px] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/40 sm:p-6 xl:p-8 overflow-x-auto">
          <Outlet />
        </div>
      </section>
    </div>
  );
};

export default AdminLayout;