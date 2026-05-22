import React, { useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import orderService from '../services/orderService';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const statusClass = (status) => {
  switch (status) {
    case 'CONFIRMED':
    case 'PAID':
      return 'bg-violet-100 text-violet-800';
    case 'PACKING':
      return 'bg-amber-100 text-amber-800';
    case 'SHIPPING':
      return 'bg-blue-100 text-blue-800';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800';
    case 'COMPLETED':
      return 'bg-emerald-200 text-emerald-900';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800';
    case 'RETURN_REQUESTED':
      return 'bg-orange-100 text-orange-800';
    case 'RETURNED':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const ShipperOrders = () => {
  const { user } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await orderService.getShipperOrders(user.id);
      const data = response?.data || [];
      setOrders(data);
      const nextSelected = selectedId && data.some((item) => item.id === selectedId)
        ? selectedId
        : data[0]?.id || null;
      setSelectedId(nextSelected);
    } catch (error) {
      toast.error(error.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (orderId) => {
    if (!orderId || !user?.id) {
      setDetail(null);
      return;
    }
    try {
      const response = await orderService.getShipperOrderDetail(user.id, orderId);
      setDetail(response?.data || null);
    } catch (error) {
      toast.error(error.message || 'Không thể tải chi tiết đơn hàng');
      setDetail(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  useEffect(() => {
    loadDetail(selectedId);
  }, [selectedId, user?.id]);

  const selectedOrder = useMemo(
    () => orders.find((item) => item.id === selectedId) || null,
    [orders, selectedId]
  );

  const handleAccept = async () => {
    if (!selectedOrder || !user?.id) return;
    setActionLoading(true);
    try {
      await orderService.shipperAcceptOrder(selectedOrder.id, user.id);
      toast.success('Đã nhận đơn và chuyển sang giao hàng');
      await loadOrders();
      await loadDetail(selectedOrder.id);
    } catch (error) {
      toast.error(error.message || 'Không thể nhận đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelivered = async () => {
    if (!selectedOrder || !user?.id) return;
    setActionLoading(true);
    try {
      await orderService.shipperDeliverOrder(selectedOrder.id, user.id);
      toast.success('Đã cập nhật đơn hàng đã giao');
      await loadOrders();
      await loadDetail(selectedOrder.id);
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật giao hàng');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFailedDelivery = async () => {
    if (!selectedOrder || !user?.id) return;
    const reason = window.prompt('Nhập lý do không giao được hàng', 'Khách không nhận hàng');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await orderService.shipperFailOrder(selectedOrder.id, user.id, reason);
      toast.success('Đã cập nhật không giao được hàng');
      await loadOrders();
      await loadDetail(selectedOrder.id);
    } catch (error) {
      toast.error(error.message || 'Không thể cập nhật giao thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnPicked = async () => {
    if (!selectedOrder || !user?.id) return;
    setActionLoading(true);
    try {
      await orderService.shipperReturnPicked(selectedOrder.id, user.id);
      toast.success('Đã xác nhận lấy hàng hoàn');
      await loadOrders();
      await loadDetail(selectedOrder.id);
    } catch (error) {
      toast.error(error.message || 'Không thể xác nhận lấy hàng hoàn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnCompleted = async () => {
    if (!selectedOrder || !user?.id) return;
    setActionLoading(true);
    try {
      await orderService.shipperReturnCompleted(selectedOrder.id, user.id);
      toast.success('Đã xác nhận hoàn hàng về kho');
      await loadOrders();
      await loadDetail(selectedOrder.id);
    } catch (error) {
      toast.error(error.message || 'Không thể xác nhận hoàn hàng');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-bold text-slate-900">Đơn hàng được giao</h2>
        {loading ? (
          <p className="py-8 text-sm text-slate-500">Đang tải...</p>
        ) : orders.length === 0 ? (
          <p className="py-8 text-sm text-slate-500">Chưa có đơn hàng nào được phân công.</p>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => setSelectedId(order.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedId === order.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:bg-slate-50'
                  }`}
              >
                <p className="font-semibold text-slate-900">#{order.orderCode}</p>
                <p className="text-sm text-slate-600">Khách hàng: {order.customerName || 'Khách hàng'}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                    {order.status === 'PENDING' ? 'Chờ xác nhận' :
                      order.status === 'PACKING' ? 'Đang chuẩn bị hàng' :
                        order.status === 'SHIPPING' ? 'Đang giao hàng' :
                          order.status === 'DELIVERED' ? 'Đã giao hàng' :
                            order.status === 'CANCELLED' ? 'Đã hủy' :
                              order.status === 'RETURNED' ? 'Đã hoàn hàng' :
                                order.status}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{currency.format(order.finalPrice || order.totalPrice || 0)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        {!detail ? (
          <p className="py-12 text-center text-slate-500">Chọn đơn hàng để xem chi tiết.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chi tiết đơn #{detail.orderCode}</h3>
                <p className="text-sm text-slate-500">Đặt lúc {new Date(detail.orderDate).toLocaleString('vi-VN')}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(detail.status)}`}>
                {detail.status === 'PENDING' ? 'Chờ xác nhận' :
                  detail.status === 'PACKING' ? 'Đang chuẩn bị hàng' :
                    detail.status === 'SHIPPING' ? 'Đang giao hàng' :
                      detail.status === 'DELIVERED' ? 'Đã giao hàng' :
                        detail.status === 'CANCELLED' ? 'Đã hủy' :
                          detail.status === 'RETURNED' ? 'Đã hoàn hàng' :
                            detail.status}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Người nhận</p>
                <p className="mt-1 font-semibold text-slate-900">{detail.customerName || 'N/A'}</p>
                <p className="text-sm text-slate-700">Số điện thoại: {detail.customerPhone || 'N/A'}</p>
                <p className="text-sm text-slate-700">Địa chỉ: {detail.shippingAddress || 'N/A'}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">Thông tin đơn</p>
                <p className="mt-1 text-sm text-slate-700">Tổng tiền: {currency.format(detail.finalPrice || detail.totalPrice || 0)}</p>
                <p className="text-sm text-slate-700">Shipper: {detail.shipperName || user?.name || 'N/A'}</p>
                {detail.cancellationReason && (
                  <p className="text-sm text-rose-600 font-bold mt-1">Lý do hủy: {detail.cancellationReason}</p>
                )}
                {(detail.paymentMethod || detail.paymentStatus) && (
                  <p className="text-sm text-slate-700">
                    {detail.paymentMethod === 'COD' ? 'Thanh toán khi nhận hàng' : 'Thanh toán online'} · {detail.paymentStatus === 'UNPAID' ? 'Chưa thanh toán' : detail.paymentStatus === 'PAID' ? 'Đã thanh toán' : 'Đã hủy'}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Sản phẩm</p>
              <div className="space-y-2">
                {(detail.items || []).map((item, index) => (
                  <div key={`${item.productid || index}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.productName}</p>
                      <p className="text-sm text-slate-500">Số lượng: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-slate-800">{currency.format(item.price || 0)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {detail.status === 'PACKING' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleAccept}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  Xác nhận đã lấy hàng
                </button>
              )}

              {detail.status === 'SHIPPING' && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleDelivered}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Giao hàng thành công
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={handleFailedDelivery}
                    className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
                  >
                    Giao hàng không thành công
                  </button>
                </>
              )}

              {detail.status === 'RETURN_REQUESTED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReturnPicked}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-60"
                >
                  Xác nhận đã lấy hàng hoàn
                </button>
              )}

              {detail.status === 'RETURN_PICKING' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReturnCompleted}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
                >
                  Xác nhận đã hoàn về kho
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ShipperOrders;
