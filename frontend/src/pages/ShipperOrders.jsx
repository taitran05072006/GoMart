import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AuthContext } from '../context/AuthContext';
import orderService from '../services/orderService';
import OrderChat from '../components/common/OrderChat';
import { Client } from '@stomp/stompjs';
import SockJSImport from 'sockjs-client/dist/sockjs';
const SockJS = SockJSImport.default || SockJSImport;
import axiosClient from '../api/axiosClient';
import { User, Lock, MessageSquare } from 'lucide-react';

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
    case 'RETURN_PICKING':
      return 'bg-amber-100 text-amber-800';
    case 'RETURN_AWAITING_ADMIN_CONFIRM':
      return 'bg-orange-100 text-orange-800';
    case 'RETURNED_TO_WAREHOUSE':
      return 'bg-sky-100 text-sky-800';
    case 'RETURNED':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const ShipperOrders = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const [orders, setOrders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadCountsByOrder, setUnreadCountsByOrder] = useState({});
  const [autoOpenChat, setAutoOpenChat] = useState(false);

  // Reset count when selected order changes
  useEffect(() => {
    setUnreadCount(0);
  }, [detail?.id]);

  // Sync autoOpenChat with showChatModal when detail has loaded for the selected order
  useEffect(() => {
    if (autoOpenChat && detail?.id === selectedId) {
      setShowChatModal(true);
      setAutoOpenChat(false);
    }
  }, [autoOpenChat, detail?.id, selectedId]);

  // List-wide real-time chat notifications tracker for Shipper
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
            const subShipper = client.subscribe(
              `/topic/orders/${order.id}/chat/CUSTOMER_SHIPPER`,
              (messageOutput) => {
                const newMsg = JSON.parse(messageOutput.body);
                if (newMsg.senderId !== user.id) {
                  if (selectedId !== order.id || !showChatModal) {
                    setUnreadCountsByOrder(prev => ({
                      ...prev,
                      [order.id]: (prev[order.id] || 0) + 1
                    }));
                  }
                }
              }
            );
            subscriptions.push(subShipper);
          });
        },
        onStompError: (frame) => {
          console.error('Shipper list unread tracker STOMP error:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Lỗi thiết lập shipper list unread tracker:', e);
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      if (client) client.deactivate();
    };
  }, [orders, user?.id, selectedId, showChatModal]);

  // Real-time unread messages tracking via STOMP WS
  useEffect(() => {
    const orderId = detail?.id;
    if (!orderId || !user?.id) return undefined;
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
            `/topic/orders/${orderId}/chat/CUSTOMER_SHIPPER`,
            (messageOutput) => {
              const newMsg = JSON.parse(messageOutput.body);
              if (newMsg.senderId !== user.id) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          );
        },
        onStompError: (frame) => {
          console.error('STOMP error in shipper unread count tracking:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Error setup WS unread tracker in Shipper:', e);
    }

    return () => {
      if (subscription) subscription.unsubscribe();
      if (client) client.deactivate();
    };
  }, [detail?.id, user?.id, showChatModal]);

  const loadOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const response = await orderService.getShipperOrders(user.id);
      const data = response?.data || [];
      setOrders(data);
      
      const orderIdParam = query.get('orderId');
      let nextSelected = selectedId;
      if (orderIdParam) {
        const found = data.find(item => String(item.id) === String(orderIdParam) || String(item.orderCode) === String(orderIdParam));
        if (found) {
          nextSelected = found.id;
        }
      }
      if (!nextSelected) {
        nextSelected = selectedId && data.some((item) => item.id === selectedId)
          ? selectedId
          : data[0]?.id || null;
      }
      setSelectedId(nextSelected);

      // Fetch historical unread counts for all shipper's orders
      try {
        const counts = {};
        await Promise.all(
          data.map(async (order) => {
            const unreadRes = await axiosClient.get(`/orders/${order.id}/chat/unread`, {
              params: { userId: user.id }
            });
            if (unreadRes.success) {
              counts[order.id] = unreadRes.data;
            }
          })
        );
        setUnreadCountsByOrder(counts);
      } catch (err) {
        console.error("Không thể tải số tin nhắn chưa đọc cho Shipper", err);
      }
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

  useEffect(() => {
    const orderIdParam = query.get('orderId');
    if (orderIdParam && orders.length > 0) {
      const found = orders.find(item => String(item.id) === String(orderIdParam) || String(item.orderCode) === String(orderIdParam));
      if (found && found.id !== selectedId) {
        setSelectedId(found.id);
      }
    }
  }, [orders, query, selectedId]);

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
              <div
                key={order.id}
                onClick={() => {
                  setSelectedId(order.id);
                  const params = new URLSearchParams(window.location.search);
                  params.set('orderId', order.orderCode || order.id);
                  navigate({ search: params.toString() }, { replace: true });
                }}
                className={`w-full rounded-xl border p-3 flex justify-between items-center transition cursor-pointer ${selectedId === order.id
                  ? 'border-blue-500 bg-blue-50/40 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900">#{order.orderCode}</p>
                  <p className="text-xs text-slate-600 mt-0.5 truncate">Khách: {order.customerName || 'Khách hàng'}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(order.status)}`}>
                      {order.status === 'PENDING' ? 'Chờ thanh toán' :
                        order.status === 'PACKING' ? 'Đang chuẩn bị hàng' :
                        order.status === 'SHIPPING' ? 'Đang giao hàng' :
                        order.status === 'DELIVERED' ? 'Đã giao hàng' :
                        order.status === 'CANCELLED' ? 'Đã hủy' :
                        order.status === 'RETURN_REQUESTED' ? 'Yêu cầu hoàn trả' :
                        order.status === 'RETURN_PICKING' ? 'Đang lấy hàng hoàn' :
                        order.status === 'RETURN_AWAITING_ADMIN_CONFIRM' ? 'Chờ admin duyệt về kho' :
                        order.status === 'RETURNED_TO_WAREHOUSE' ? 'Hàng đã về kho' :
                        order.status === 'RETURNED' ? 'Đã hoàn trả' :
                        order.status === 'COMPLETED' ? 'Hoàn thành' :
                        order.status}
                    </span>
                    <span className="text-xs font-bold text-slate-800 mr-2">{currency.format(order.finalPrice || order.totalPrice || 0)}</span>
                  </div>
                </div>

                {/* Right side: Quick Chat Button for Shipper */}
                <div className="flex items-center pl-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedId(order.id);
                      setAutoOpenChat(true);
                      setUnreadCountsByOrder(prev => ({
                        ...prev,
                        [order.id]: 0
                      }));
                      const params = new URLSearchParams(window.location.search);
                      params.set('orderId', order.orderCode || order.id);
                      navigate({ search: params.toString() }, { replace: true });
                    }}
                    className={`relative p-2.5 rounded-full transition-all border shadow-sm ${
                      unreadCountsByOrder[order.id] > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 scale-105 shadow-rose-100 animate-pulse'
                        : 'bg-white border-slate-150 text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                    title="Nhắn tin với khách"
                  >
                    <MessageSquare size={16} />
                    {unreadCountsByOrder[order.id] > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white shadow animate-bounce">
                        {unreadCountsByOrder[order.id]}
                      </span>
                    )}
                  </button>
                </div>
              </div>
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
                {detail.status === 'PENDING' ? 'Chờ thanh toán' :
                  detail.status === 'PACKING' ? 'Đang chuẩn bị hàng' :
                    detail.status === 'SHIPPING' ? 'Đang giao hàng' :
                      detail.status === 'DELIVERED' ? 'Đã giao hàng' :
                        detail.status === 'CANCELLED' ? 'Đã hủy' :
                          detail.status === 'RETURN_REQUESTED' ? 'Yêu cầu hoàn trả' :
                          detail.status === 'RETURN_PICKING' ? 'Đang lấy hàng hoàn' :
                          detail.status === 'RETURN_AWAITING_ADMIN_CONFIRM' ? 'Chờ admin duyệt về kho' :
                          detail.status === 'RETURNED_TO_WAREHOUSE' ? 'Hàng đã về kho' :
                          detail.status === 'RETURNED' ? 'Đã hoàn trả' :
                          detail.status === 'COMPLETED' ? 'Hoàn thành' :
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
                  Shipper xác nhận đã trả hàng
                </button>
              )}
            </div>

            {/* Chat Box for Shipper & Customer */}
            {(detail.status === 'SHIPPING' || detail.status === 'DELIVERED' || detail.status === 'COMPLETED' || detail.status === 'RETURN_REQUESTED' || detail.status === 'RETURN_PICKING' || detail.status === 'RETURN_AWAITING_ADMIN_CONFIRM' || detail.status === 'RETURNED') && (
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-2">
                  <span>💬</span> Trò chuyện với Khách hàng
                </h4>
                <div className="flex justify-center bg-slate-50/50 rounded-3xl border border-slate-100/80 py-6 px-12">
                  <button 
                    onClick={() => {
                      setShowChatModal(true);
                      setUnreadCount(0);
                    }}
                    className="flex flex-col items-center gap-3 group focus:outline-none relative"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-200/80 group-hover:shadow-amber-300/80 transition-all duration-300 group-hover:scale-110 active:scale-95 relative">
                      <User size={26} className="group-hover:rotate-12 transition-transform duration-300" />
                      
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
                      <span className="block text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-amber-600 transition-colors">Nhắn với Khách</span>
                      <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Trò chuyện giao hàng</span>
                    </div>
                  </button>
                </div>

                {/* Real-time Chat Modal for Shipper */}
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
                          order={detail} 
                          currentUser={user} 
                          role="SHIPPER" 
                          forcedChannel="CUSTOMER_SHIPPER" 
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default ShipperOrders;
