import React, { useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AUTH_REDIRECT_EVENT } from './api/axiosClient';
import { NotificationProvider } from './context/NotificationContext';
import { AuthContext } from './context/AuthContext';
import toast from 'react-hot-toast';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Profile from './pages/Profile';
import PrivateRoute from './components/layout/PrivateRoute';
import AdminRoute from './components/layout/AdminRoute';
import ShipperRoute from './components/layout/ShipperRoute';
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminStoreProducts from './pages/admin/AdminStoreProducts';
import AdminProductForm from './pages/admin/AdminProductForm';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCategories from './pages/admin/AdminCategories';
import AdminCategoryForm from './pages/admin/AdminCategoryForm';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminVoucherForm from './pages/admin/AdminVoucherForm';
import AdminStockReceipts from './pages/admin/AdminStockReceipts';
import AdminStockReceiptForm from './pages/admin/AdminStockReceiptForm';
import AdminImportUnits from './pages/admin/AdminImportUnits';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminInventory from './pages/admin/AdminInventory';
import AdminNotifications from './pages/admin/AdminNotifications';
import ShipperOrders from './pages/ShipperOrders';
import OrderSuccess from './pages/OrderSuccess';
import { Navigate } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import AdminShipping from './pages/admin/AdminShipping';
import AdminShippingConfig from './pages/admin/AdminShippingConfig';
import AdminSuppliers from './pages/admin/AdminSuppliers';
import AdminStores from './pages/admin/AdminStores';
import VoucherProducts from './pages/VoucherProducts';

const AppShell = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const { user } = useContext(AuthContext);

  // Lắng nghe sự kiện 401 từ axiosClient → chuyển trang bằng React Router (không reload)
  useEffect(() => {
    const handleAuthRedirect = () => {
      navigate('/login', { replace: true });
    };
    window.addEventListener(AUTH_REDIRECT_EVENT, handleAuthRedirect);
    return () => window.removeEventListener(AUTH_REDIRECT_EVENT, handleAuthRedirect);
  }, [navigate]);

  // Chặn khách hàng chưa có địa chỉ vào hệ thống chính, buộc chuyển sang trang cập nhật cá nhân
  useEffect(() => {
    if (user && user.role === 'CUSTORMER' && !user.province) {
      // Cho phép truy cập route profile hoặc logout
      if (!location.pathname.startsWith('/profile') && location.pathname !== '/login') {
        toast.error("Vui lòng cập nhật tỉnh/thành phố để tiếp tục sử dụng hệ thống", { id: 'address-warning' });
        navigate('/profile?tab=info', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      {!isAdminRoute && <Navbar />}
      <main className={isAdminRoute ? 'flex-grow px-0 py-0' : 'mx-auto w-full max-w-7xl flex-grow px-4 py-8'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/voucher/:code" element={<VoucherProducts />} />
          <Route path="/management/products" element={<Navigate to="/admin/products" replace />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-password-otp" element={<ForgotPassword />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/ordersuccess" element={<OrderSuccess />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="store-products" element={<AdminStoreProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/edit/:id" element={<AdminProductForm />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="categories/new" element={<AdminCategoryForm />} />
            <Route path="categories/edit/:id" element={<AdminCategoryForm />} />
            <Route path="vouchers" element={<AdminVouchers />} />
            <Route path="vouchers/new" element={<AdminVoucherForm />} />
            <Route path="vouchers/edit/:code" element={<AdminVoucherForm />} />
            <Route path="suppliers" element={<AdminSuppliers />} />
            <Route path="stock-receipts" element={<AdminStockReceipts />} />
            <Route path="stock-receipts/new" element={<AdminStockReceiptForm />} />
            <Route path="import-units" element={<AdminImportUnits />} />
            <Route path="inventory" element={<AdminInventory />} />
            <Route path="accounts" element={<AdminAccounts />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="shipping" element={<AdminShipping />} />
            <Route path="shipping/config" element={<AdminShippingConfig />} />
            <Route path="stores" element={<AdminStores />} />

          </Route>

          {/* Protected Routes */}
          <Route path="/cart" element={
            <PrivateRoute>
              <Cart />
            </PrivateRoute>
          } />
          <Route path="/checkout" element={
            <PrivateRoute>
              <Checkout />
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          } />

          <Route path="/shipper/orders" element={
            <ShipperRoute>
              <ShipperOrders />
            </ShipperRoute>
          } />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </div>
  );
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <NotificationProvider>
        <AppShell />
      </NotificationProvider>
    </Router>
  );
}

export default App;
