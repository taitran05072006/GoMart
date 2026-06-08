import React, { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, Filter, Download, Plus, Eye, MoreVertical,
  Package, Clock, CheckCircle2, Truck, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, User as UserIcon, Phone, Archive,
  MessageSquare
} from 'lucide-react';
import orderService from '../../services/orderService';
import paymentService from '../../services/Payment';
import authService from '../../services/authService';
import { AuthContext } from '../../context/AuthContext';
import OrderChat from '../../components/common/OrderChat';
import { Client } from '@stomp/stompjs';
import SockJSImport from 'sockjs-client/dist/sockjs';
const SockJS = SockJSImport.default || SockJSImport;
import axiosClient from '../../api/axiosClient';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const HIDDEN_ADMIN_STATUSES = new Set(['DELIVERED', 'COMPLETED']);

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL', label: 'Tất cả đơn' },
  { value: 'ACTIVE', label: 'Đang xử lý' },
  { value: 'PENDING', label: 'Chờ xác nhận' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'PACKING', label: 'Đang đóng gói' },
  { value: 'SHIPPING', label: 'Đang giao hàng' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'DELIVERY_DISPUTE', label: 'Khiếu nại chưa nhận' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'LOST', label: 'Thất lạc' },
  { value: 'RETURN_REQUESTED', label: 'Yêu cầu hoàn trả' },
  { value: 'RETURN_PICKING', label: 'Đang lấy hàng hoàn' },
  { value: 'RETURN_AWAITING_ADMIN_CONFIRM', label: 'Chờ duyệt hàng về kho' },
  { value: 'RETURNED_TO_WAREHOUSE', label: 'Hàng đã về kho' },
  { value: 'RETURNED', label: 'Đã hoàn tiền' },
];

const badgeClass = (status) => {
  switch (status) {
    case 'CONFIRMED':
    case 'PACKING':
    case 'SHIPPING':
    case 'DELIVERED':
    case 'COMPLETED':
    case 'PAID':
      return 'bg-emerald-100 text-emerald-700';
    case 'UNPAID':
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'FAILED':
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
    case 'RETURN_REQUESTED':
    case 'RETURN_PICKING':
    case 'RETURN_AWAITING_ADMIN_CONFIRM':
    case 'RETURNED_TO_WAREHOUSE':
      return 'bg-orange-100 text-orange-700';
    case 'DELIVERY_DISPUTE':
      return 'bg-rose-100 text-rose-700 border-rose-300 animate-pulse';
    case 'RETURNED':
      return 'bg-indigo-100 text-indigo-700';
    case 'LOST':
      return 'bg-gray-800 text-gray-200';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const AdminOrders = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlStatus = searchParams.get('status') || 'ALL';

  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState({});
  const [shippers, setShippers] = useState([]);
  const [shipperByOrder, setShipperByOrder] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(urlStatus);

  useEffect(() => {
    setSelectedStatus(urlStatus);
  }, [urlStatus]);
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [unreadCountsByOrder, setUnreadCountsByOrder] = useState({});
  const [autoOpenChat, setAutoOpenChat] = useState(false);

  useEffect(() => {
    const orderIdParam = searchParams.get('orderId');
    if (orderIdParam && orders.length > 0) {
      const found = orders.find(o => String(o.id) === String(orderIdParam) || String(o.orderCode) === String(orderIdParam));
      if (found) {
        setSelectedOrder(found);
        setShowDetailModal(true);
      }
    }
  }, [orders, searchParams]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getAllOrders();
      const data = response?.data?.data || response?.data || response || [];
      const orderList = Array.isArray(data) ? data : [];

      const paymentPairs = await Promise.all(
        orderList.map(async (order) => {
          try {
            const payment = await paymentService.getPayment(order.id);
            return [order.id, payment];
          } catch {
            return [order.id, null];
          }
        })
      );

      const shipperResponse = await authService.getAdminShippers();
      const shipperData = shipperResponse?.data || [];

      // Sort orders newest-first by orderDate or createdAt so new orders appear at the top
      orderList.sort((a, b) => {
        const ta = new Date(a.orderDate || a.createdAt || 0).getTime();
        const tb = new Date(b.orderDate || b.createdAt || 0).getTime();
        return tb - ta;
      });
      setOrders(orderList);
      setPayments(Object.fromEntries(paymentPairs));
      setShippers(Array.isArray(shipperData) ? shipperData : []);

      const selectedMap = {};
      orderList.forEach((order) => {
        if (order.shipperId) {
          selectedMap[order.id] = String(order.shipperId);
        }
      });
      setShipperByOrder(selectedMap);

      // Fetch historical unread counts for all orders in the list
      try {
        const counts = {};
        await Promise.all(
          orderList.map(async (order) => {
            if (user?.id) {
              const unreadRes = await axiosClient.get(`/orders/${order.id}/chat/unread`, {
                params: { userId: user.id }
              });
              if (unreadRes.success) {
                counts[order.id] = unreadRes.data;
              }
            }
          })
        );
        setUnreadCountsByOrder(counts);
      } catch (err) {
        console.error("Không thể tải số tin nhắn chưa đọc cho Admin", err);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [impersonatedStoreId, user?.role]);

  // List-wide real-time chat notifications tracker for Admin
  useEffect(() => {
    if (!orders || orders.length === 0 || !user?.id) return undefined;

    const apiBaseUrl = axiosClient.defaults.baseURL || 'http://localhost:8080/api';
    const wsBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

    // Track all orders in the list to receive real-time updates (including cancelled/completed/returned ones)
    const activeOrders = orders;
    if (activeOrders.length === 0) return undefined;

    let client;
    const subscriptions = [];

    try {
      client = new Client({
        webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          activeOrders.forEach(order => {
            const subAdmin = client.subscribe(
              `/topic/orders/${order.id}/chat/CUSTOMER_ADMIN`,
              (messageOutput) => {
                const newMsg = JSON.parse(messageOutput.body);
                if (newMsg.senderId !== user.id) {
                  if (!selectedOrder || selectedOrder.id !== order.id || !showDetailModal) {
                    setUnreadCountsByOrder(prev => ({
                      ...prev,
                      [order.id]: (prev[order.id] || 0) + 1
                    }));
                  }
                }
              }
            );
            subscriptions.push(subAdmin);
          });
        },
        onStompError: (frame) => {
          console.error('Admin list unread tracker STOMP error:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Lỗi thiết lập admin list unread tracker:', e);
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      if (client) client.deactivate();
    };
  }, [orders, user?.id, selectedOrder?.id, showDetailModal]);

  const stats = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      processing: orders.filter(o => ['PAID', 'CONFIRMED', 'PACKING'].includes(o.status)).length,
      shipping: orders.filter(o => o.status === 'SHIPPING').length,
      delivered: orders.filter(o => o.status === 'DELIVERED' || o.status === 'COMPLETED').length,
      cancelled: orders.filter(o => o.status === 'CANCELLED').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const startBoundary = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
    const endBoundary = toDate ? new Date(`${toDate}T23:59:59`) : null;

    return orders.filter((order) => {
      const payment = payments[order.id];

      // Filter by Status
      let statusMatched = false;
      if (selectedStatus === 'ALL') {
        statusMatched = true;
      } else if (selectedStatus === 'ACTIVE') {
        // Đang xử lý: Những đơn đã qua bước Pending nhưng chưa giao xong
        const processingStatuses = ['PAID', 'CONFIRMED', 'PACKING'];
        statusMatched = processingStatuses.includes(order.status);
      } else {
        statusMatched = order.status === selectedStatus;
      }

      if (!statusMatched) return false;

      // Filter by Payment Status
      if (selectedPaymentStatus !== 'ALL') {
        if (payment?.status !== selectedPaymentStatus) return false;
      }

      // Filter by Date
      const orderTime = new Date(order.orderDate || order.createdAt || 0);
      const dateMatched = (!startBoundary || orderTime >= startBoundary)
        && (!endBoundary || orderTime <= endBoundary);

      if (!dateMatched) return false;

      // Filter by Keyword
      if (!keyword) return true;

      return [
        order.orderCode,
        order.customerName,
        order.customerPhone,
        order.status,
        payment?.status
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [orders, payments, search, selectedStatus, selectedPaymentStatus, fromDate, toDate]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const updateStatus = async (orderId, status) => {
    try {
      const response = await orderService.updateStatus(orderId, status);
      const updatedOrder = response?.data?.data || response?.data || response;
      toast.success(`Đơn hàng chuyển sang ${status}`);
      setSelectedOrder(updatedOrder); // Cập nhật ngay cho Modal
      loadOrders();
    } catch (error) {
      console.error(error);
      toast.error('Không thể cập nhật trạng thái');
    }
  };

  const confirmCodToPacking = async (orderId) => {
    try {
      const response = await orderService.confirmCodOrder(orderId);
      const updatedOrder = response?.data?.data || response?.data || response;
      toast.success('Đơn COD đã duyệt và chuyển sang PACKING');
      setSelectedOrder(updatedOrder); // Cập nhật ngay cho Modal
      loadOrders();
    } catch (error) {
      console.error(error);
      toast.error('Không thể duyệt đơn COD');
    }
  };

  const assignShipper = async (orderId) => {
    const sId = Number(shipperByOrder[orderId]);
    if (!sId) {
      toast.error('Vui lòng chọn shipper');
      return;
    }
    try {
      const response = await orderService.assignShipper(orderId, sId);
      const updatedOrder = response?.data?.data || response?.data || response;
      toast.success('Đã gán shipper cho đơn hàng');
      setSelectedOrder(updatedOrder); // Cập nhật ngay cho Modal
      loadOrders();
    } catch (error) {
      console.error(error);
      toast.error('Không thể gán shipper');
    }
  };

  const cancelPayment = async (orderId) => {
    const reason = window.prompt('Lý do hủy thanh toán', 'Thanh toán không thành công');
    if (reason === null) return;
    try {
      await paymentService.updateCancelPayment(orderId, reason);
      toast.success('Đã hủy thanh toán');
      // Tải lại để cập nhật cả order và payment map
      await loadOrders();
      // Sau khi loadOrders, ta cần tìm lại order trong danh sách mới để cập nhật selectedOrder
      // Nhưng đơn giản hơn là fetch chi tiết đơn này
      const resp = await orderService.getOrderById(orderId);
      setSelectedOrder(resp?.data?.data || resp?.data || resp);
    } catch (error) {
      console.error(error);
      toast.error('Không thể hủy thanh toán');
    }
  };

  const recreateTransferPayment = async (orderId) => {
    try {
      await paymentService.createPayment(orderId, { method: 'BANK_TRANSFER' });
      toast.success('Đã tạo lại phiên thanh toán chuyển khoản');
      await loadOrders();
      const resp = await orderService.getOrderById(orderId);
      setSelectedOrder(resp?.data?.data || resp?.data || resp);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tạo lại phiên thanh toán');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 space-y-6 pb-12">
      {/* Header Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedStatus === 'ALL' ? 'Quản lý đơn hàng' : `Đơn hàng: ${STATUS_FILTER_OPTIONS.find(o => o.value === selectedStatus)?.label}`}
          </h1>
          {selectedStatus !== 'ALL' && (
            <p className="text-sm text-slate-500 font-medium">Danh sách các đơn hàng đang ở trạng thái này</p>
          )}
        </div>
        <div className="flex items-center gap-3">


        </div>
      </div>

      {/* Filter Section - Always show search but conditionally hide status dropdown */}
      <div className={`rounded-3xl p-6 border transition-all duration-500 ${selectedStatus !== 'ALL'
          ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100 shadow-inner'
          : 'bg-white border-slate-100 shadow-sm'
        }`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, khách hàng..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all bg-white"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-50 bg-white font-medium"
          >
            {STATUS_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-50 bg-white font-medium"
          >
            <option value="ALL">Tất cả thanh toán</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="FAILED">Thanh toán lỗi</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-50 bg-white font-medium"
          />
        </div>
      </div>

      {/* Stats Cards - Only show when "All" is selected */}
      {selectedStatus === 'ALL' && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6 animate-in fade-in duration-500">
          <StatCard icon={<Package className="text-blue-600" />} label="Tất cả đơn hàng" value={stats.all} color="blue" />
          <StatCard icon={<Clock className="text-amber-600" />} label="Chờ xác nhận" value={stats.pending} color="amber" />
          <StatCard icon={<AlertCircle className="text-indigo-600" />} label="Đang xử lý" value={stats.processing} color="indigo" />
          <StatCard icon={<Truck className="text-emerald-600" />} label="Đang giao" value={stats.shipping} color="emerald" />
          <StatCard icon={<CheckCircle2 className="text-purple-600" />} label="Đã giao" value={stats.delivered} color="purple" />
          <StatCard icon={<XCircle className="text-rose-600" />} label="Đã hủy" value={stats.cancelled} color="rose" />
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 bg-slate-50/30">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Mã đơn hàng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Khách hàng</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Ngày tạo</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Giá trị đơn</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Thanh toán</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-slate-400 text-sm">Đang tải dữ liệu đơn hàng...</td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-20 text-center text-slate-400 text-sm">Không tìm thấy đơn hàng nào khớp với bộ lọc.</td>
                </tr>
              ) : paginatedOrders.map((order) => {
                const payment = payments[order.id];
                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span 
                        onClick={() => {
                          setSelectedOrder(order);
                          setAutoOpenChat(false);
                          setShowDetailModal(true);
                          const params = new URLSearchParams(window.location.search);
                          params.set('orderId', order.orderCode || order.id);
                          navigate({ search: params.toString() }, { replace: true });
                        }}
                        className="text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                      >
                        #{order.orderCode || order.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <UserIcon size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.customerName || 'Khách hàng'}</p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Phone size={10} />
                            {order.customerPhone || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-700 font-medium">{new Date(order.orderDate || order.createdAt).toLocaleDateString('vi-VN')}</p>
                      <p className="text-[11px] text-slate-400">{new Date(order.orderDate || order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-900">{currency.format(order.finalPrice || order.totalPrice)}</p>
                      <p className="text-[11px] text-slate-500">{order.items?.length || 0} sản phẩm</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass(payment?.status)}`}>
                        {payment?.status === 'PAID' ? 'Đã thanh toán' : payment?.status === 'FAILED' ? 'Thanh toán lỗi' : 'Chưa thanh toán'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Chat button with unread count */}
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setAutoOpenChat(true);
                            setShowDetailModal(true);
                            setUnreadCountsByOrder(prev => ({
                              ...prev,
                              [order.id]: 0
                            }));
                            const params = new URLSearchParams(window.location.search);
                            params.set('orderId', order.orderCode || order.id);
                            navigate({ search: params.toString() }, { replace: true });
                          }}
                          className={`relative p-2 rounded-lg transition-all ${
                            unreadCountsByOrder[order.id] > 0
                              ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 scale-105'
                              : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                          title="Trò chuyện hỗ trợ"
                        >
                          <MessageSquare size={18} />
                          {unreadCountsByOrder[order.id] > 0 && (
                            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow animate-bounce">
                              {unreadCountsByOrder[order.id]}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setAutoOpenChat(false);
                            setShowDetailModal(true);
                            const params = new URLSearchParams(window.location.search);
                            params.set('orderId', order.orderCode || order.id);
                            navigate({ search: params.toString() }, { replace: true });
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-6 border-t border-slate-50 flex items-center justify-between bg-slate-50/20">
          <p className="text-xs font-medium text-slate-500">
            Hiển thị <span className="text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="text-slate-900">{Math.min(currentPage * itemsPerPage, filteredOrders.length)}</span> trong <span className="text-slate-900">{filteredOrders.length}</span> đơn hàng
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200'
                  }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-400 hover:bg-white hover:text-slate-900 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {showDetailModal && selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          payment={payments[selectedOrder.id]}
          shippers={shippers}
          shipperId={shipperByOrder[selectedOrder.id]}
          onSetShipperId={(id) => setShipperByOrder(prev => ({ ...prev, [selectedOrder.id]: id }))}
          onClose={() => {
            setShowDetailModal(false);
            const params = new URLSearchParams(window.location.search);
            params.delete('orderId');
            navigate({ search: params.toString() }, { replace: true });
          }}
          onUpdateStatus={updateStatus}
          onConfirmCod={confirmCodToPacking}
          onAssignShipper={assignShipper}
          onCancelPayment={cancelPayment}
          onRecreatePayment={recreateTransferPayment}
          currentUser={user}
          autoOpenChat={autoOpenChat}
          onClearAutoOpenChat={() => setAutoOpenChat(false)}
        />
      )}
    </div>
  );
};

const OrderDetailModal = ({
  order, payment, shippers, shipperId, onSetShipperId, onClose,
  onUpdateStatus, onConfirmCod, onAssignShipper, onCancelPayment, onRecreatePayment,
  currentUser, autoOpenChat, onClearAutoOpenChat
}) => {
  const [showChatModal, setShowChatModal] = useState(autoOpenChat || false);
  const [unreadCount, setUnreadCount] = useState(0);

  const resolveDispute = async (accept) => {
    if (!window.confirm(accept ? "Bạn có chắc chắn muốn CHẤP NHẬN khiếu nại và HỦY ĐƠN (Hoàn tiền) không?" : "Bạn có chắc chắn muốn TỪ CHỐI khiếu nại (Đơn đã giao)?")) return;
    try {
      await orderService.resolveDispute(order.id, accept);
      toast.success(accept ? "Đã chấp nhận khiếu nại và hoàn tiền." : "Đã từ chối khiếu nại.");
      onClose();
    } catch (err) {
      toast.error("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    if (autoOpenChat) {
      setShowChatModal(true);
      if (onClearAutoOpenChat) onClearAutoOpenChat();
    }
  }, [autoOpenChat]);

  // Reset unread count when order changes
  useEffect(() => {
    setUnreadCount(0);
  }, [order?.id]);

  // Real-time unread messages listener via STOMP WS
  useEffect(() => {
    const orderId = order?.id;
    if (!orderId || !currentUser?.id) return undefined;
    if (showChatModal) {
      setUnreadCount(0);
      return undefined;
    }

    const apiBaseUrl = axiosClient.defaults.baseURL || 'http://localhost:8080/api';
    const wsBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

    let client;
    let subscription;

    try {
      client = new Client({
        webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          subscription = client.subscribe(
            `/topic/orders/${orderId}/chat/CUSTOMER_ADMIN`,
            (messageOutput) => {
              const newMsg = JSON.parse(messageOutput.body);
              if (newMsg.senderId !== currentUser.id) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          );
        },
        onStompError: (frame) => {
          console.error('STOMP error in admin unread count tracking:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Error setup WS unread tracker in Admin:', e);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
      if (client) client.deactivate();
    };
  }, [order?.id, currentUser?.id, showChatModal]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[32px] bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900">Chi tiết đơn hàng #{order.orderCode || order.id}</h2>
              <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${badgeClass(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Đặt lúc {new Date(order.orderDate || order.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white transition-colors text-slate-400 hover:text-slate-900">
            &times;
          </button>
        </div>

        {/* Stepper Flow */}
        <div className="px-6 py-4 border-b border-slate-50 bg-white">
          <OrderStepper currentStatus={order.status} />
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Thông tin khách hàng</h3>
              <div className="rounded-2xl border border-slate-100 p-4 space-y-3 bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {order.customerName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{order.customerName}</p>
                    <p className="text-sm text-slate-500">{order.customerPhone}</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-sm text-slate-600 flex items-start gap-2">
                    <span className="font-bold text-slate-900">Địa chỉ:</span>
                    {order.shippingAddress || 'N/A'}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-bold text-slate-900">Ghi chú:</span> {order.notes || 'Không có ghi chú'}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Thanh toán</h3>
              <div className="rounded-2xl border border-slate-100 p-4 space-y-3 bg-slate-50/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Phương thức:</span>
                  <span className="text-sm font-bold text-slate-900">{payment?.method || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">Trạng thái:</span>
                  <span className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase ${badgeClass(payment?.status)}`}>
                    {payment?.status === 'PAID' ? 'Thành công' : payment?.status === 'FAILED' ? 'Thất bại' : 'Chưa thanh toán'}
                  </span>
                </div>
                {payment?.failureReason && (
                  <p className="text-[11px] text-rose-500 bg-rose-50 p-2 rounded-lg">{payment.failureReason}</p>
                )}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-lg">
                  <span className="font-bold text-slate-900">Tổng tiền:</span>
                  <span className="font-black text-blue-600">{currency.format(order.finalPrice || order.totalPrice)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Product Items */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Danh sách sản phẩm</h3>
            <div className="rounded-2xl border border-slate-100 overflow-hidden bg-slate-50/30">
              <table className="w-full text-left">
                <thead className="bg-slate-100/50">
                  <tr>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500">Sản phẩm</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-center">SL</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-right">Đơn giá</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase text-slate-500 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900">{item.productName}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 text-right">{currency.format(item.price)}</td>
                      <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">{currency.format(item.price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Flow - Luồng xử lý đơn hàng */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
              Luồng xử lý & Thao tác
            </h3>

            {order.status === 'DELIVERY_DISPUTE' && (
              <div className="flex gap-2 w-full justify-end bg-rose-50 p-4 rounded-xl border border-rose-100 mb-4">
                <button
                  onClick={() => resolveDispute(true)}
                  className="px-6 py-2 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-sm"
                >
                  Chấp nhận (Hoàn tiền)
                </button>
                <button
                  onClick={() => resolveDispute(false)}
                  className="px-6 py-2 bg-white text-slate-700 border border-slate-300 rounded-xl font-bold hover:bg-slate-50 shadow-sm"
                >
                  Từ chối (Đã giao)
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {payment?.method === 'COD' && order.status === 'PENDING' && (
                <button
                  onClick={() => onConfirmCod(order.id)}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Duyệt đơn COD & Đóng gói
                </button>
              )}

              {(order.status === 'CONFIRMED' || (payment?.method === 'BANK_TRANSFER' && payment?.status === 'PAID' && order.status === 'PAID')) && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'PACKING')}
                  className="rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-100 hover:bg-violet-700 transition-all"
                >
                  Bắt đầu đóng gói
                </button>
              )}

              {(order.status === 'PACKING' || order.status === 'SHIPPING') && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-1 bg-white">
                  <select
                    value={shipperId || ''}
                    onChange={(e) => onSetShipperId(e.target.value)}
                    className="rounded-lg border-none bg-transparent px-3 py-1.5 text-sm outline-none font-medium"
                  >
                    <option value="">Chọn người giao hàng</option>
                    {shippers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onAssignShipper(order.id)}
                    disabled={Number(shipperId) === Number(order.shipperId) && order.shipperId != null}
                    className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-all ${
                      Number(shipperId) === Number(order.shipperId) && order.shipperId != null
                        ? 'bg-emerald-100 text-emerald-700 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-700'
                    }`}
                  >
                    {Number(shipperId) === Number(order.shipperId) && order.shipperId != null ? '✓ Đã gán' : (order.shipperId ? 'Đổi Shipper' : 'Gán Shipper')}
                  </button>
                </div>
              )}



              {order.status === 'RETURN_REQUESTED' && (
                <span className="text-xs text-orange-600 font-bold uppercase tracking-wider bg-orange-50 border border-orange-200/50 rounded-xl px-4 py-2 shadow-sm">
                  ⏳ Đang chờ Shipper lấy hàng hoàn...
                </span>
              )}

              {order.status === 'RETURN_PICKING' && (
                <span className="text-xs text-amber-600 font-bold uppercase tracking-wider bg-amber-50 border border-amber-200/50 rounded-xl px-4 py-2 shadow-sm">
                  🚚 Shipper đang vận chuyển hàng hoàn về kho...
                </span>
              )}

              {order.status === 'RETURN_AWAITING_ADMIN_CONFIRM' && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onUpdateStatus(order.id, 'RETURNED_TO_WAREHOUSE')}
                    className="rounded-xl bg-orange-600 text-white px-6 py-2.5 text-sm font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all duration-300"
                  >
                    ✓ Duyệt xác nhận hàng đã về kho
                  </button>
                </div>
              )}

              {order.status === 'RETURNED_TO_WAREHOUSE' && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => onUpdateStatus(order.id, 'RETURNED')}
                    className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-2.5 text-sm font-bold shadow-lg shadow-emerald-100 hover:from-emerald-600 hover:to-teal-700 transition-all duration-300"
                  >
                    ✓ Xác nhận đã nhận hàng từ Shipper & Nhập kho
                  </button>
                  <button
                    onClick={() => {
                      const reason = window.prompt("Nhập lý do từ chối nhận hàng hoàn (ví dụ: hàng trả không đúng):");
                      if (reason) {
                        onUpdateStatus(order.id, 'COMPLETED');
                        toast.success("Đã từ chối nhận hàng hoàn. Đơn hàng khôi phục về trạng thái Hoàn thành.");
                      }
                    }}
                    className="rounded-xl border border-rose-500 bg-white text-rose-500 px-6 py-2.5 text-sm font-bold hover:bg-rose-50 transition-all duration-300 shadow-sm"
                  >
                    &times; Từ chối (Hàng không đúng)
                  </button>
                </div>
              )}

              {/* Reset/Cancel Actions */}
              {payment?.method === 'BANK_TRANSFER' && payment?.status === 'FAILED' && (
                <button
                  onClick={() => onRecreatePayment(order.id)}
                  className="rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all"
                >
                  Tạo lại phiên thanh toán
                </button>
              )}

              {(order.status === 'PENDING' || order.status === 'PAID') && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'CANCELLED')}
                  className="rounded-xl border border-rose-200 bg-rose-50 px-6 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-100 transition-all"
                >
                  Hủy đơn hàng
                </button>
              )}
            </div>

            {/* Chat Box for Admin & Customer */}
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                <span>💬</span> Hộp thoại hỗ trợ khách hàng
              </h4>
              <div className="flex justify-center bg-slate-50/50 rounded-3xl border border-slate-100/80 py-6 px-12">
                <button
                  onClick={() => {
                    setShowChatModal(true);
                    setUnreadCount(0);
                  }}
                  className="flex flex-col items-center gap-3 group focus:outline-none relative"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-200/80 group-hover:shadow-blue-300/80 transition-all duration-300 group-hover:scale-110 active:scale-95 relative">
                    <UserIcon size={26} className="group-hover:rotate-12 transition-transform duration-300" />

                    {unreadCount > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                        {unreadCount}
                      </span>
                    ) : (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                      </span>
                    )}
                  </div>
                  <div className="text-center">
                    <span className="block text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-blue-600 transition-colors">Nhắn với Khách</span>
                    <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Trò chuyện hỗ trợ</span>
                  </div>
                </button>
              </div>

              {/* Real-time Chat Modal for Admin */}
              {showChatModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowChatModal(false)}></div>
                  <div className="relative w-full max-w-xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">

                    {/* Elegant Header Above the Chat Box */}
                    <div className="flex items-center justify-between text-slate-800 bg-white/95 backdrop-blur px-6 py-4 rounded-2xl shadow-sm border border-slate-100/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">💬</span>
                        <span className="font-bold text-slate-800 text-sm md:text-base">Trò chuyện với Khách hàng</span>
                      </div>
                      <button
                        onClick={() => setShowChatModal(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-850 flex items-center justify-center text-lg font-bold transition-all focus:outline-none"
                      >
                        &times;
                      </button>
                    </div>

                    {/* Chat Box Container */}
                    <div className="h-[500px]">
                      <OrderChat
                        order={order}
                        currentUser={currentUser}
                        role="ADMIN"
                        forcedChannel="CUSTOMER_ADMIN"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-4 ${colors[color] || 'bg-slate-50'}`}>
        {icon}
      </div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <h4 className="text-2xl font-black text-slate-900">{value}</h4>
        <span className="text-[10px] font-bold text-emerald-500">↑ 12%</span>
      </div>
    </div>
  );
};

const OrderStepper = ({ currentStatus }) => {
  const steps = [
    { key: 'PENDING', label: 'Chờ xác nhận', icon: <Clock size={14} /> },
    { key: 'CONFIRMED', label: 'Đã xác nhận', icon: <CheckCircle2 size={14} /> },
    { key: 'PACKING', label: 'Đang đóng gói', icon: <Archive size={14} /> },
    { key: 'SHIPPING', label: 'Đang giao', icon: <Truck size={14} /> },
    { key: 'DELIVERED', label: 'Thành công', icon: <CheckCircle2 size={14} /> },
  ];

  // Helper to find index of current status
  const currentIdx = steps.findIndex(s => s.key === currentStatus);
  // Special handling for PAID (treat as between Pending and Confirmed)
  const effectiveIdx = currentStatus === 'PAID' ? 1.5 : currentIdx;

  return (
    <div className="relative flex items-center justify-between w-full max-w-3xl mx-auto px-4">
      <div className="absolute top-1/2 left-10 right-10 h-0.5 bg-slate-100 -translate-y-1/2 -z-10"></div>
      <div
        className="absolute top-1/2 left-10 h-0.5 bg-blue-500 -translate-y-1/2 -z-10 transition-all duration-500"
        style={{ width: `${Math.max(0, (effectiveIdx / (steps.length - 1)) * 82)}%` }}
      ></div>

      {steps.map((step, idx) => {
        const isCompleted = idx < currentIdx || currentStatus === 'COMPLETED' || currentStatus === 'DELIVERED' && idx === 4;
        const isActive = idx === currentIdx || (currentStatus === 'PAID' && idx === 1);

        return (
          <div key={step.key} className="flex flex-col items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${isCompleted || isActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                : 'bg-white border-slate-200 text-slate-300'
              }`}>
              {step.icon}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-tighter text-center ${isActive ? 'text-blue-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
              }`}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AdminOrders;
