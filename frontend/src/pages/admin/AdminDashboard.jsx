import React, { useEffect, useState, useMemo, useContext } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign, ShoppingBag, Users, Package,
  TrendingUp, TrendingDown, ChevronDown, Building2
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import productService from '../../services/productService';
import orderService from '../../services/orderService';
import { AuthContext } from '../../context/AuthContext';

/* ─── helpers ─── */
const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const fmtShort = (v) => {
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B';
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(0) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(0) + 'K';
  return v;
};

const STATUS_MAP = {
  PENDING:              { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  CONFIRMED:            { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fef3c7', text: '#92400e' },
  PACKING:              { label: 'Đang xử lý',   color: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  PAID:                 { label: 'Đang xử lý',   color: '#3b82f6', bg: '#dbeafe', text: '#1e40af' },
  SHIPPING:             { label: 'Đang giao',    color: '#8b5cf6', bg: '#ede9fe', text: '#5b21b6' },
  DELIVERED:            { label: 'Đã giao',      color: '#10b981', bg: '#d1fae5', text: '#065f46' },
  COMPLETED:            { label: 'Đã giao',      color: '#10b981', bg: '#d1fae5', text: '#065f46' },
  CANCELLED:            { label: 'Đã hủy',       color: '#ef4444', bg: '#fee2e2', text: '#991b1b' },
  LOST:                 { label: 'Thất lạc',     color: '#1e293b', bg: '#f1f5f9', text: '#334155' },
  DELIVERY_DISPUTE:     { label: 'Khiếu nại',    color: '#e11d48', bg: '#ffe4e6', text: '#9f1239' },
  RETURN_REQUESTED:     { label: 'Hoàn hàng',    color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  RETURN_PICKING:       { label: 'Hoàn hàng',    color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  RETURN_AWAITING_ADMIN_CONFIRM:{ label: 'Chờ duyệt hoàn', color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  RETURNED_TO_WAREHOUSE:{ label: 'Hoàn hàng',    color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
  RETURNED:             { label: 'Hoàn hàng',    color: '#f97316', bg: '#ffedd5', text: '#9a3412' },
};

const TIME_OPTIONS = [
  { label: 'Hôm nay', days: 1, type: 'today' },
  { label: 'Hôm qua', days: 1, type: 'yesterday' },
  { label: '7 ngày qua', days: 7, type: 'range' },
  { label: '30 ngày qua', days: 30, type: 'range' },
];

const toInputDate = (d) => {
  const dt = new Date(d);
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 10);
};

/* ─── Tiny inline SVG line chart ─── */
const LineChart = ({ data, width = 500, height = 200 }) => {
  if (!data || data.length < 2) return null;
  const values = data.map(d => d.revenue);
  const maxV = Math.max(...values, 1);
  const minV = 0;
  const padL = 48, padR = 16, padT = 16, padB = 36;
  const W = width - padL - padR;
  const H = height - padT - padB;

  const px = (i) => padL + (i / (data.length - 1)) * W;
  const py = (v) => padT + H - ((v - minV) / (maxV - minV)) * H;

  const polyline = data.map((d, i) => `${px(i)},${py(d.revenue)}`).join(' ');
  const area = [
    `${px(0)},${padT + H}`,
    ...data.map((d, i) => `${px(i)},${py(d.revenue)}`),
    `${px(data.length - 1)},${padT + H}`,
  ].join(' ');

  /* Y-axis ticks */
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => minV + t * (maxV - minV));

  /* X labels — show only a few */
  const step = Math.max(1, Math.floor(data.length / 6));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line x1={padL} y1={py(v)} x2={padL + W} y2={py(v)} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padL - 6} y={py(v) + 4} textAnchor="end" fontSize="9" fill="#94a3b8">
            {fmtShort(v)}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <polygon points={area} fill="url(#areaGrad)" />

      {/* Line */}
      <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {/* Data points */}
      {data.map((d, i) => (
        <circle key={i} cx={px(i)} cy={py(d.revenue)} r="3.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
      ))}

      {/* X axis labels */}
      {xLabels.map((d, idx) => {
        const origIdx = data.indexOf(d);
        return (
          <text key={idx} x={px(origIdx)} y={padT + H + 22} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
};

/* ─── Donut chart ─── */
const DonutChart = ({ segments, total }) => {
  const r = 60, cx = 80, cy = 80, stroke = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg viewBox="0 0 160 160" className="w-full max-w-[160px]">
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle
            key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="20" fontWeight="bold" fill="#0f172a">{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="#64748b">Tổng đơn</text>
    </svg>
  );
};

/* ─── Main ─── */
const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [timeRange, setTimeRange] = useState(TIME_OPTIONS[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);
  const { user, impersonatedStoreId } = useContext(AuthContext);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      const targetStoreId = user?.role === 'STORE_ADMIN' && user?.storeId ? user.storeId : impersonatedStoreId;
      const reqs = [
        orderService.getAllOrders(),
        targetStoreId ? productService.getByStoreId(targetStoreId) : productService.getAll(),
        user?.role === 'SUPER_ADMIN' ? axiosClient.get('/users/admin/customers') : Promise.resolve({ data: { data: [] } }),
      ];

      const [ordersRes, productsRes, usersRes] = await Promise.all(reqs);

      const orderList = ordersRes?.data?.data || ordersRes?.data || ordersRes || [];
      const productList = productsRes?.data?.data || productsRes?.data || productsRes || [];
      const userList = usersRes?.data?.data || usersRes?.data || usersRes || [];

      setOrders(Array.isArray(orderList) ? orderList : []);
      setProducts(Array.isArray(productList) ? productList : []);
      setUsers(Array.isArray(userList) ? userList : []);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchDashboardStats();
  }, [timeRange, customFrom, customTo, impersonatedStoreId, user]);

  /* ── derived data ── */
  const selectedStoreId = user?.role === 'STORE_ADMIN' && user?.storeId ? user.storeId : impersonatedStoreId;
  const filteredOrders = useMemo(() => {
    if (!selectedStoreId) return orders;
    return orders.filter(o => String(o.storeId) === String(selectedStoreId));
  }, [orders, selectedStoreId]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const yesterday = useMemo(() => new Date(today.getTime() - 86400000), [today]);

  const effectiveRange = useMemo(() => {
    if (isCustomRange && customFrom && customTo) {
      const start = new Date(customFrom);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customTo);
      end.setHours(23, 59, 59, 999);
      if (start <= end) {
        return { start, end, label: `${customFrom} -> ${customTo}` };
      }
    }
    if (timeRange.type === 'yesterday') {
      const start = new Date(today.getTime() - 86400000);
      start.setHours(0, 0, 0, 0);
      const end = new Date(today.getTime() - 1);
      return { start, end, label: timeRange.label };
    }

    const start = new Date(today.getTime() - (timeRange.days - 1) * 86400000);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    return { start, end, label: timeRange.label };
  }, [isCustomRange, customFrom, customTo, today, timeRange]);

  const previousRange = useMemo(() => {
    const { start, end } = effectiveRange;
    if (timeRange.type === 'today') {
      const prevStart = new Date(today.getTime() - 86400000);
      prevStart.setHours(0, 0, 0, 0);
      const prevEnd = new Date(today.getTime() - 1);
      return { start: prevStart, end: prevEnd };
    }
    if (timeRange.type === 'yesterday') {
      const prevStart = new Date(today.getTime() - 2 * 86400000);
      prevStart.setHours(0, 0, 0, 0);
      const prevEnd = new Date(today.getTime() - 86400000 - 1);
      return { start: prevStart, end: prevEnd };
    }

    const durationMs = end.getTime() - start.getTime() + 1;
    const prevStart = new Date(start.getTime() - durationMs);
    const prevEnd = new Date(start.getTime() - 1);
    return { start: prevStart, end: prevEnd };
  }, [effectiveRange, timeRange, today]);

  // Revenue counts orders in these statuses (adjustable)
  const REVENUE_STATUSES = ['COMPLETED', 'DELIVERED', 'PAID'];
  const revenueOrders = useMemo(() =>
    filteredOrders.filter(o => REVENUE_STATUSES.includes((o.status || '').toUpperCase())),
    [filteredOrders]);

  const selectedPeriodRevenue = useMemo(() => {
    return revenueOrders.filter(o => {
      const d = new Date(o.orderDate || o.createdAt);
      return d >= effectiveRange.start && d <= effectiveRange.end;
    }).reduce((s, o) => s + Number(o.finalPrice || o.totalPrice || 0), 0);
  }, [revenueOrders, effectiveRange]);

  const previousPeriodRevenue = useMemo(() => {
    return revenueOrders.filter(o => {
      const d = new Date(o.orderDate || o.createdAt);
      return d >= previousRange.start && d <= previousRange.end;
    }).reduce((s, o) => s + Number(o.finalPrice || o.totalPrice || 0), 0);
  }, [revenueOrders, previousRange]);

  const threeDaysAgo = useMemo(() => new Date(today.getTime() - 3 * 86400000), [today]);
  const sixDaysAgo = useMemo(() => new Date(today.getTime() - 6 * 86400000), [today]);

  // "New customers" card uses rolling 3-day window.
  const recent3DayUsersCount = useMemo(() =>
    users.filter(u => u.createdAt && new Date(u.createdAt) >= threeDaysAgo).length,
    [users, threeDaysAgo]);

  const previous3DayUsersCount = useMemo(() =>
    users.filter(u => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d >= sixDaysAgo && d < threeDaysAgo;
    }).length,
    [users, sixDaysAgo, threeDaysAgo]);

  const todayOrders = useMemo(() =>
    filteredOrders.filter(o => new Date(o.orderDate || o.createdAt) >= today), [filteredOrders, today]);
  const yesterdayOrders = useMemo(() =>
    filteredOrders.filter(o => {
      const d = new Date(o.orderDate || o.createdAt);
      return d >= yesterday && d < today;
    }), [filteredOrders, today, yesterday]);

  /* Revenue chart data */
  const revenueChartData = useMemo(() => {
    const days = Math.max(1, Math.ceil((effectiveRange.end.getTime() - effectiveRange.start.getTime() + 1) / 86400000));

    // Nếu khoảng thời gian là 1 ngày (Hôm nay, Hôm qua, hoặc tự chọn 1 ngày), vẽ biểu đồ theo giờ
    if (days <= 1) {
      const baseDay = new Date(effectiveRange.start);
      baseDay.setHours(0, 0, 0, 0);

      const result = [];
      for (let h = 0; h < 24; h++) {
        const hourStart = new Date(baseDay.getTime() + h * 3600000);
        const hourEnd = new Date(hourStart.getTime() + 3600000);
        const revenue = revenueOrders
          .filter(o => {
            const d = new Date(o.orderDate || o.createdAt);
            return d >= hourStart && d < hourEnd;
          })
          .reduce((s, o) => s + Number(o.finalPrice || o.totalPrice || 0), 0);

        result.push({
          label: `${h}h`,
          revenue,
        });
      }
      return result;
    }

    // Nếu khoảng thời gian là nhiều ngày, vẽ biểu đồ theo từng ngày
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = new Date(effectiveRange.end.getTime() - i * 86400000);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const revenue = revenueOrders
        .filter(o => {
          const d = new Date(o.orderDate || o.createdAt);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((s, o) => s + Number(o.finalPrice || o.totalPrice || 0), 0);
      result.push({
        label: `${dayStart.getDate()}/${dayStart.getMonth() + 1}`,
        revenue,
      });
    }
    return result;
  }, [revenueOrders, effectiveRange]);

  /* Order status donut */
  const orderStatusGroups = useMemo(() => {
    const map = {};
    filteredOrders.forEach(o => {
      const key = STATUS_MAP[o.status]?.label || o.status;
      const color = STATUS_MAP[o.status]?.color || '#94a3b8';
      if (!map[key]) map[key] = { label: key, value: 0, color };
      map[key].value++;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [filteredOrders]);

  /* Top selling products */
  const topProducts = useMemo(() =>
    [...products]
      .filter(p => p.sold > 0)
      .sort((a, b) => (b.sold || 0) - (a.sold || 0))
      .slice(0, 5),
    [products]);

  /* Recent orders */
  const recentOrders = useMemo(() =>
    [...filteredOrders]
      .sort((a, b) => new Date(b.orderDate || b.createdAt) - new Date(a.orderDate || a.createdAt))
      .slice(0, 5),
    [filteredOrders]);

  /* New customers — registered in last 3 days */
  const newCustomers = useMemo(() => {
    return [...users]
      .filter(u => u.createdAt && new Date(u.createdAt) >= threeDaysAgo)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [users, threeDaysAgo]);

  const pct = (now, prev) => {
    if (!prev) return now > 0 ? 100 : 0;
    return Math.round(((now - prev) / prev) * 100);
  };

  const StatCard = ({ icon, iconBg, label, value, compare, subLabel }) => {
    const diff = pct(value, compare);
    const up = diff >= 0;
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
        <div>
          <p className="text-xs text-slate-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{typeof value === 'number' && label.toLowerCase().includes('doanh') ? fmt.format(value) : value?.toLocaleString('vi-VN')}</p>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">{subLabel || `So với hôm qua: ${typeof compare === 'number' && label.toLowerCase().includes('doanh') ? fmt.format(compare) : compare?.toLocaleString('vi-VN')}`}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
            {icon}
          </div>
          <span className={`flex items-center gap-0.5 text-xs font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(diff)}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">Tổng quan</h1>
          <p className="text-xs text-slate-400 mt-0.5">Trang chủ / Tổng quan</p>
        </div>
        {user?.role === 'STORE_ADMIN' && user?.storeName && (
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 font-bold text-sm shadow-sm">
            <Building2 size={16} className="text-blue-500" />
            Cửa hàng: {user.storeName}
          </div>
        )}
      </div>

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<DollarSign size={22} className="text-blue-600" />}
            iconBg="bg-blue-50"
            label={
              timeRange.type === 'today'
                ? "Doanh thu hôm nay"
                : timeRange.type === 'yesterday'
                ? "Doanh thu hôm qua"
                : `Doanh thu (${effectiveRange.label})`
            }
            value={selectedPeriodRevenue}
            compare={previousPeriodRevenue}
            subLabel={
              timeRange.type === 'today'
                ? `So với hôm qua: ${fmt.format(previousPeriodRevenue)}`
                : timeRange.type === 'yesterday'
                ? `So với hôm trước: ${fmt.format(previousPeriodRevenue)}`
                : `So với chu kỳ trước: ${fmt.format(previousPeriodRevenue)}`
            }
          />
          <StatCard
            icon={<ShoppingBag size={22} className="text-emerald-600" />}
            iconBg="bg-emerald-50"
            label="Đơn hàng hôm nay"
            value={todayOrders.length}
            compare={yesterdayOrders.length}
            subLabel={`So với hôm qua: ${yesterdayOrders.length}`}
          />
          <StatCard
            icon={<Users size={22} className="text-violet-600" />}
            iconBg="bg-violet-50"
            label="Khách hàng mới"
            value={recent3DayUsersCount}
            compare={previous3DayUsersCount}
            subLabel={`Trong 3 ngày qua (3 ngày trước: ${previous3DayUsersCount})`}
          />
          <StatCard
            icon={<Package size={22} className="text-orange-500" />}
            iconBg="bg-orange-50"
            label="Sản phẩm"
            value={products.length}
            compare={products.length}
            subLabel="Tổng số sản phẩm"
          />
        </div>
      )}

      {/* ── Revenue Chart + Recent Orders ── */}
      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-4">
        {/* Revenue chart */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Doanh thu</h2>
              {!loading && (
                <p className="text-xl font-black text-blue-600 mt-1 animate-in fade-in duration-300">
                  {fmt.format(selectedPeriodRevenue)}
                </p>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => setShowDropdown(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {effectiveRange.label} <ChevronDown size={13} />
              </button>
              {showDropdown && (
                <div className="absolute right-0 top-8 z-20 bg-white rounded-xl border border-slate-200 shadow-lg p-2 min-w-[260px]">
                  {TIME_OPTIONS.map(opt => (
                    <button
                      key={`${opt.type}-${opt.label}`}
                      onClick={() => { setTimeRange(opt); setIsCustomRange(false); setShowDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${
                        !isCustomRange && opt.type === timeRange.type && opt.days === timeRange.days ? 'text-blue-600 bg-blue-50' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="mt-2 border-t border-slate-100 pt-2 px-2">
                    <p className="text-[11px] font-bold text-slate-500 mb-2">Tùy chọn</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        max={customTo || toInputDate(new Date())}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                      />
                      <input
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        min={customFrom || undefined}
                        max={toInputDate(new Date())}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (customFrom && customTo) {
                          setIsCustomRange(true);
                          setShowDropdown(false);
                        }
                      }}
                      className="mt-2 w-full text-xs font-bold rounded-lg bg-blue-600 text-white py-1.5 hover:bg-blue-700 disabled:opacity-50"
                      disabled={!customFrom || !customTo}
                    >
                      Áp dụng khoảng ngày
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="h-52">
            {loading
              ? <div className="h-full bg-slate-50 rounded-xl animate-pulse" />
              : <LineChart data={revenueChartData} width={500} height={200} />
            }
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Đơn hàng gần đây</h2>
            <Link to="/admin/orders" className="text-xs font-bold text-blue-500 hover:text-blue-700">Xem tất cả</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOrders.map(order => {
                const s = STATUS_MAP[order.status] || { label: order.status, bg: '#f1f5f9', text: '#64748b' };
                return (
                  <div key={order.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-black"
                        style={{ background: s.color }}>
                        #
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">#{order.orderCode?.slice(-5) || order.id}</p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[80px]">{order.customerName || 'Khách hàng'}</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap"
                      style={{ background: s.bg, color: s.text }}>
                      {s.label}
                    </span>
                    <span className="text-xs font-bold text-slate-800 flex-shrink-0 whitespace-nowrap">
                      {fmt.format(Number(order.finalPrice || order.totalPrice || 0))}
                    </span>
                  </div>
                );
              })}
              {recentOrders.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Chưa có đơn hàng</p>}
            </div>
          )}
        </div>
      </div>

      {/* ── Order Stats + Top Products + New Customers ── */}
      <div className="grid xl:grid-cols-[1fr_1.2fr_1fr] gap-4">
        {/* Donut chart - Order status */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Thống kê đơn hàng</h2>
          {loading ? (
            <div className="h-40 bg-slate-50 rounded-xl animate-pulse" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-40">
                <DonutChart segments={orderStatusGroups} total={filteredOrders.length} />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                {orderStatusGroups.map((seg, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                      <span className="text-[11px] text-slate-600 truncate">{seg.label}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-800">{seg.value}</span>
                      <span className="text-[10px] text-slate-400">({filteredOrders.length > 0 ? Math.round((seg.value / filteredOrders.length) * 100) : 0}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top selling products */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-800">Sản phẩm bán chạy</h2>
            <Link to="/admin/products" className="text-xs font-bold text-blue-500 hover:text-blue-700">Xem tất cả</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : topProducts.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Chưa có dữ liệu bán hàng</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center flex-shrink-0"
                    style={{
                      background: i === 0 ? '#fde68a' : i === 1 ? '#e2e8f0' : i === 2 ? '#fed7aa' : '#f1f5f9',
                      color: i === 0 ? '#78350f' : '#475569'
                    }}>
                    {i + 1}
                  </span>
                  {p.imageUrl
                    ? <img src={p.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-100" />
                    : <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center"><Package size={16} className="text-slate-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400">{p.sold?.toLocaleString('vi-VN')} đã bán</p>
                  </div>
                  <span className="text-xs font-bold text-slate-700 flex-shrink-0">{fmt.format(p.price || 0)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New customers */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-800">Khách hàng mới</h2>
              <span className="text-[9px] font-black bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full uppercase">3 ngày</span>
            </div>
            <Link to="/admin/customers" className="text-xs font-bold text-blue-500 hover:text-blue-700">Xem tất cả</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-slate-50 rounded-lg animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {newCustomers.map(u => (
                <div key={u.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {(u.name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{u.name || 'Khách hàng'}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 whitespace-nowrap">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
              ))}
              {newCustomers.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">Không có khách hàng mới</p>
                  <p className="text-[10px] text-slate-300 mt-1">trong 3 ngày qua</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
