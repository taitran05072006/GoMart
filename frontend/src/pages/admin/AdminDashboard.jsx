import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CircleDollarSign, Package, ShoppingBag, Clock } from 'lucide-react';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import paymentService from '../../services/Payment';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const badgeClass = (status) => {
  switch (status) {
    case 'CONFIRMED':
    case 'PACKING':
    case 'SHIPPING':
    case 'DELIVERED':
    case 'COMPLETED':
      return 'border border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'PAID':
      return 'border border-teal-200 bg-teal-50 text-teal-700';
    case 'UNPAID':
    case 'PENDING':
      return 'border border-amber-200 bg-amber-50 text-amber-700';
    case 'FAILED':
    case 'CANCELLED':
      return 'border border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border border-slate-500/40 bg-slate-500/10 text-slate-300';
  }
};

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState({});
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [expiringSoonProducts, setExpiringSoonProducts] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const [productsResponse, ordersResponse, lowStockResponse, expiringSoonResponse] = await Promise.all([
          productService.getAll(),
          orderService.getAllOrders(),
          productService.getLowStock(),
          productService.getExpiringSoon(),
        ]);

        const productList = productsResponse?.data?.data || productsResponse?.data || productsResponse || [];
        const orderList = ordersResponse?.data?.data || ordersResponse?.data || ordersResponse || [];

        const recentOrders = Array.isArray(orderList)
          ? [...orderList].sort((left, right) => {
              const leftTime = new Date(left.orderDate || left.createdAt || 0).getTime();
              const rightTime = new Date(right.orderDate || right.createdAt || 0).getTime();
              return rightTime - leftTime;
            })
          : [];

        const paymentEntries = await Promise.all(
          recentOrders.map(async (order) => {
            try {
              const response = await paymentService.getPayment(order.id);
              const payment = response?.data?.data || response?.data || response;
              return [order.id, payment];
            } catch {
              return [order.id, null];
            }
          })
        );

        if (!mounted) {
          return;
        }

        setProducts(Array.isArray(productList) ? productList : []);
        setOrders(recentOrders);
        setPayments(Object.fromEntries(paymentEntries));
        setLowStockProducts(lowStockResponse?.data?.data || lowStockResponse?.data || lowStockResponse || []);
        setExpiringSoonProducts(expiringSoonResponse?.data?.data || expiringSoonResponse?.data || expiringSoonResponse || []);
      } catch (error) {
        console.error('Failed to load admin dashboard', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const pendingPayments = orders.filter((order) => payments[order.id]?.status === 'UNPAID').length;
  const cancelledOrders = orders.filter((order) => order.status === 'CANCELLED').length;
  const totalRevenue = orders
    .filter((order) => payments[order.id]?.status === 'PAID')
    .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

  return (
    <div className="space-y-6">
      <div className="relative min-h-[40vh] overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_40%)]" />
        
        <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-slate-500 font-bold">Hệ thống</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Tổng quan</h2>
              <p className="mt-2 text-sm text-slate-600">Theo dõi hoạt động kinh doanh của bạn</p>
            </div>
            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-800 shadow-lg shadow-slate-200"
            >
              Xem đơn hàng <span className="sr-only">View orders</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-3 w-3">
              <span className="absolute inset-0 animate-ping rounded-full bg-red-500/60" />
              <span className="relative block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_20px_6px_rgba(239,68,68,0.4)]" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<ShoppingBag size={18} />} label="Sản phẩm" value={products.length} />
            <MetricCard icon={<Package size={18} />} label="Đơn hàng" value={orders.length} />
            <MetricCard icon={<CircleDollarSign size={18} />} label="Thanh toán đang chờ" value={pendingPayments} />
            <MetricCard icon={<Package size={18} />} label="Đơn hàng đã hủy" value={cancelledOrders} />
          </div>
        </div>
      </div>

      {expiringSoonProducts.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/50 p-6">
          <div className="mb-4 flex items-center gap-2 text-amber-700">
            <Clock size={20} />
            <h3 className="text-sm font-bold uppercase tracking-[0.28em]">Sản phẩm sắp hết hạn</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {expiringSoonProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{p.name}</p>
                    <p className="text-xs text-amber-600 font-medium">HSD: {p.expiryDate}</p>
                  </div>
                </div>
                <Link 
                  to={`/admin/products/edit/${p.id}`}
                  className="rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold text-black hover:bg-amber-400 transition-colors whitespace-nowrap"
                >
                  Giảm giá ngay
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {lowStockProducts.length > 0 && (
        <section className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6">
          <div className="mb-4 flex items-center gap-2 text-rose-700">
            <Package size={20} />
            <h3 className="text-sm font-bold uppercase tracking-[0.28em]">Tồn kho thấp</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{p.name}</p>
                    <p className="text-xs text-rose-600 font-medium">Còn lại: {p.stock} {p.unit}</p>
                  </div>
                </div>
                <Link 
                  to="/admin/stock-receipts/new" 
                  className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-bold text-white hover:bg-rose-400 transition-colors"
                >
                  Nhập hàng
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 hover:text-blue-700">
              Xem tất cả
            </Link>
          </div>
          
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium">Đang tải dữ liệu...</div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 transition hover:border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">#{order.orderCode || order.id}</p>
                      <p className="text-xs text-slate-400 font-medium">{new Date(order.orderDate || order.createdAt || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest ${badgeClass(order.status)}`}>
                        {order.status || 'UNKNOWN'}
                      </span>
                      <span className="text-sm font-bold text-slate-900">{currency.format(Number(order.totalPrice || 0))}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>{payments[order.id]?.method || 'N/A'}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span>{payments[order.id]?.status || 'N/A'}</span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="py-12 text-center text-slate-400 font-medium">Chưa có đơn hàng nào.</p>}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.28em] text-slate-400">Tổng doanh thu</h3>
          <p className="mt-2 text-xs text-slate-500">Giá trị đơn hàng đã thanh toán (PAID).</p>

          <div className="mt-8 rounded-3xl bg-slate-900 p-8 text-white shadow-xl shadow-slate-200">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Tổng cộng</p>
            <p className="mt-3 text-4xl font-black tracking-tight text-white">{currency.format(totalRevenue)}</p>
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50/50 p-4 border border-blue-100">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
              <p className="text-xs leading-relaxed text-blue-900/70 font-medium">Transfer chưa thanh toán được đánh dấu UNPAID.</p>
            </div>
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50/50 p-4 border border-amber-100">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
              <p className="text-xs leading-relaxed text-amber-900/70 font-medium">Đơn quá hạn thanh toán sẽ được tự động hủy.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value }) => (
  <div className="group rounded-2xl border border-slate-100 bg-slate-50/50 p-6 transition-all hover:border-slate-200 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50">
    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm transition-transform group-hover:scale-110">
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">{label}</p>
    <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
  </div>
);

export default AdminDashboard;
