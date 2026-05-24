import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Search, Filter, Download, Plus, Eye, MoreVertical,
  Package, Clock, CheckCircle2, Truck, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, User as UserIcon, Phone, Archive
} from 'lucide-react';
import orderService from '../../services/orderService';
import paymentService from '../../services/Payment';
import authService from '../../services/authService';

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
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
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
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const AdminOrders = () => {
  const [searchParams] = useSearchParams();
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
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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

          {selectedStatus === 'ALL' && (
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:ring-4 focus:ring-blue-50 bg-white font-medium"
            >
              {STATUS_FILTER_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          )}

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
                      <span className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">#{order.orderCode || order.id}</span>
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
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
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
          onClose={() => setShowDetailModal(false)}
          onUpdateStatus={updateStatus}
          onConfirmCod={confirmCodToPacking}
          onAssignShipper={assignShipper}
          onCancelPayment={cancelPayment}
          onRecreatePayment={recreateTransferPayment}
        />
      )}
    </div>
  );
};

const OrderDetailModal = ({
  order, payment, shippers, shipperId, onSetShipperId, onClose,
  onUpdateStatus, onConfirmCod, onAssignShipper, onCancelPayment, onRecreatePayment
}) => {
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

            <div className="flex flex-wrap gap-3">
              {payment?.method === 'COD' && order.status === 'PENDING' && (
                <button
                  onClick={() => onConfirmCod(order.id)}
                  className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Duyệt đơn COD & Đóng gói
                </button>
              )}

              {payment?.method === 'BANK_TRANSFER' && payment?.status === 'PAID' && order.status === 'PAID' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'CONFIRMED')}
                  className="rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
                >
                  Xác nhận thanh toán & Chờ đóng gói
                </button>
              )}

              {order.status === 'CONFIRMED' && (
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
                    className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-bold text-white hover:bg-slate-700 transition-all"
                  >
                    Gán Shipper
                  </button>
                </div>
              )}

              {order.status === 'DELIVERED' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'COMPLETED')}
                  className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all"
                >
                  Hoàn thành đơn hàng
                </button>
              )}

              {order.status === 'RETURN_REQUESTED' && (
                <button
                  onClick={() => onUpdateStatus(order.id, 'RETURNED')}
                  className="rounded-xl bg-slate-700 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-100 hover:bg-slate-900 transition-all"
                >
                  Xác nhận đã trả hàng
                </button>
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
