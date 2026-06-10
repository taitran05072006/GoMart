import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import orderService from '../services/orderService';
import authService from '../services/authService';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { Package, User, CreditCard, XCircle, Shield, Truck, Lock, MessageSquare } from 'lucide-react';
import paymentService from '../services/Payment';
import QRPaymentModal from '../components/checkout/QRPaymentModal';
import OrderChat from '../components/common/OrderChat';
import { Client } from '@stomp/stompjs';
import SockJSImport from 'sockjs-client/dist/sockjs';
const SockJS = SockJSImport.default || SockJSImport;
import axiosClient from '../api/axiosClient';

const useQuery = () => new URLSearchParams(useLocation().search);

const PROVINCES = [
  "An Giang", "Bà Rịa - Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh",
  "Bến Tre", "Bình Định", "Bình Dương", "Bình Phước", "Bình Thuận", "Cà Mau",
  "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên", "Đồng Nai",
  "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh", "Hải Dương",
  "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa", "Kiên Giang",
  "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An", "Nam Định",
  "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên", "Quảng Bình",
  "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng", "Sơn La",
  "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế", "Tiền Giang",
  "TP Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
];

const Profile = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery();
  const initialTab = query.get('tab') || 'info';

  const { user, logout, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatChannel, setActiveChatChannel] = useState('CUSTOMER_ADMIN');
  const [unreadAdminCount, setUnreadAdminCount] = useState(0);
  const [unreadShipperCount, setUnreadShipperCount] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingOrder, setRatingOrder] = useState(null);
  const [unreadCountsByOrder, setUnreadCountsByOrder] = useState({});

  // Sync tab and selectedOrder from URL search params
  useEffect(() => {
    const tab = query.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [location.search, activeTab]);

  useEffect(() => {
    const orderId = query.get('orderId');
    if (orderId && orders.length > 0) {
      const order = orders.find(o => String(o.id) === String(orderId) || String(o.orderCode) === String(orderId));
      if (order) {
        setSelectedOrder(order);
      }
    }
  }, [orders, location.search]);

  // List-wide real-time chat notifications tracker
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
                  if (!showChatModal || selectedOrder?.id !== order.id || activeChatChannel !== 'CUSTOMER_ADMIN') {
                    setUnreadCountsByOrder(prev => ({
                      ...prev,
                      [order.id]: (prev[order.id] || 0) + 1
                    }));
                  }
                }
              }
            );
            subscriptions.push(subAdmin);

            // Keep order-list badge focused on CUSTOMER_ADMIN channel to avoid
            // showing unread from locked shipper channel.
          });
        },
        onStompError: (frame) => {
          console.error('List unread tracker STOMP error:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Lỗi thiết lập list unread tracker:', e);
    }

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe());
      if (client) client.deactivate();
    };
  }, [orders, user?.id, showChatModal, selectedOrder?.id, activeChatChannel]);

  // Reset counts when selectedOrder changes
  useEffect(() => {
    setUnreadAdminCount(0);
    setUnreadShipperCount(0);
  }, [selectedOrder?.id]);

  // Real-time unread chat notifications tracker
  useEffect(() => {
    const orderId = selectedOrder?.id;
    if (!orderId || !user?.id) return undefined;

    const apiBaseUrl = axiosClient.defaults.baseURL || 'http://localhost:8080/api';
    const wsBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

    let client;
    let subAdmin;
    let subShipper;

    try {
      client = new Client({
        webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          subAdmin = client.subscribe(
            `/topic/orders/${orderId}/chat/CUSTOMER_ADMIN`,
            (messageOutput) => {
              const newMsg = JSON.parse(messageOutput.body);
              if (newMsg.senderId !== user.id) {
                if (!showChatModal || activeChatChannel !== 'CUSTOMER_ADMIN') {
                  setUnreadAdminCount((prev) => prev + 1);
                }
              }
            }
          );

          subShipper = client.subscribe(
            `/topic/orders/${orderId}/chat/CUSTOMER_SHIPPER`,
            (messageOutput) => {
              const newMsg = JSON.parse(messageOutput.body);
              if (newMsg.senderId !== user.id) {
                if (!showChatModal || activeChatChannel !== 'CUSTOMER_SHIPPER') {
                  setUnreadShipperCount((prev) => prev + 1);
                }
              }
            }
          );
        },
        onStompError: (frame) => {
          console.error('Broker error:', frame.headers?.message);
        }
      });

      client.activate();
    } catch (e) {
      console.error('Lỗi unread tracking customer', e);
    }

    return () => {
      if (subAdmin) subAdmin.unsubscribe();
      if (subShipper) subShipper.unsubscribe();
      if (client) client.deactivate();
    };
  }, [selectedOrder?.id, user?.id, showChatModal, activeChatChannel]);


  const [stores, setStores] = useState([]);
  const [profileData, setProfileData] = useState({
     name: user?.name || '',
     phone: user?.phone || '',
     province: user?.province || '',
     district: user?.district || '',
     ward: user?.ward || '',
     houseNumber: user?.houseNumber || ''
  });

  useEffect(() => {
    axiosClient.get('/stores').then(res => {
      const data = res?.data?.data || res?.data || res || [];
      setStores(Array.isArray(data) ? data.filter(s => s.deleted !== true) : []);
    }).catch(err => {
      console.error('Không thể tải danh sách cửa hàng', err);
    });
  }, []);

  useEffect(() => {
    const fetchLatestUser = async () => {
      if (!user?.id) return;

      try {
        const res = await authService.getUserById(user.id);
        const latestUser = res?.data;
        if (!latestUser) return;

        const hasChanged =
          latestUser.name !== user.name ||
          latestUser.phone !== user.phone ||
          latestUser.address !== user.address ||
          latestUser.email !== user.email ||
          latestUser.role !== user.role ||
          latestUser.rewardStars !== user.rewardStars;

        if (hasChanged) {
          setUser(latestUser);
          localStorage.setItem('user', JSON.stringify(latestUser));
        }

        setProfileData({
          name: latestUser.name || '',
          phone: latestUser.phone || '',
          province: latestUser.province || '',
          district: latestUser.district || '',
          ward: latestUser.ward || '',
          houseNumber: latestUser.houseNumber || ''
        });
      } catch (err) {
        console.error('Không thể tải thông tin người dùng mới nhất', err);
      }
    };

    fetchLatestUser();
  }, [user?.id]);

  useEffect(() => {
    if (user && activeTab === 'info') {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        province: user.province || '',
        district: user.district || '',
        ward: user.ward || '',
        houseNumber: user.houseNumber || ''
      });
    }
  }, [user, activeTab]);
  useEffect(() => {
     if(activeTab === 'orders') {
        fetchOrders();
     }
  }, [activeTab, location.search]);

  const fetchOrders = async () => {
     if(!user) return;
     setLoadingOrders(true);
     try {
        try {
          const userRes = await authService.getUserById(user.id);
          const latestUser = userRes?.data;
          if (latestUser) {
            setUser(latestUser);
            localStorage.setItem('user', JSON.stringify(latestUser));
          }
        } catch (e) {
          console.error('Không thể đồng bộ sao tích lũy mới nhất', e);
        }

        // Use user-specific endpoint to fetch only the customer's orders
        const res = await orderService.getOrdersByUserId(user.id);
        const myOrders = res.data || res || [];
        setOrders(myOrders);

        // Fetch historical unread counts for each order
        try {
          const counts = {};
          await Promise.all(
            myOrders.map(async (order) => {
              const unreadRes = await axiosClient.get(`/orders/${order.id}/chat/unread`, {
                params: { userId: user.id, channel: 'CUSTOMER_ADMIN' }
              });
              if (unreadRes.success) {
                counts[order.id] = unreadRes.data;
              }
            })
          );
          setUnreadCountsByOrder(counts);
        } catch (err) {
          console.error("Không thể tải số tin nhắn chưa đọc", err);
        }
     } finally {
        setLoadingOrders(false);
     }
  };

  const handleRePay = async (order) => {
    try {
      const res = await paymentService.getPayment(order.id);
      const session = res.data || res;
      if (session) {
        setPaymentSession(session);
        setShowQRModal(true);
      } else {
        toast.error("Không thể lấy thông tin thanh toán.");
      }
    } catch (err) {
      toast.error("Lỗi khi chuẩn bị thanh toán lại.");
    }
  };

  const handlePaid = (orderId) => {
    setShowQRModal(false);
    fetchOrders();
    if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderId === orderId)) {
      setSelectedOrder({ ...selectedOrder, status: 'PAID', paymentStatus: 'PAID' });
    }
  };

  const handleRequestReturn = async (order) => {
    const reason = window.prompt("Nhập lý do hoàn trả:");
    if (!reason) return;

    try {
      await orderService.requestReturn(order.id, reason);
      fetchOrders();
      setSelectedOrder(null);
    } catch (err) {
      toast.error("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) return;
    try {
      await orderService.cancelOrder(orderId, "Người dùng hủy");
      toast.success("Đã hủy đơn hàng thành công!");
      fetchOrders();
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderId === orderId)) {
        setSelectedOrder(prev => ({ ...prev, status: 'CANCELLED' }));
      }
    } catch (err) {
      toast.error("Lỗi khi hủy đơn hàng: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSwitchToCod = async (order) => {
    if (!window.confirm("Bạn có chắc muốn đổi sang thanh toán khi nhận hàng (COD)? Phiên thanh toán QR hiện tại sẽ bị hủy.")) return;
    try {
      await paymentService.switchToCod(order.id);
      toast.success("Đã chuyển sang thanh toán khi nhận hàng thành công!");
      // Reload orders to get fresh status
      await fetchOrders();
      // Update selectedOrder with new payment info
      setSelectedOrder(prev => ({
        ...prev,
        paymentMethod: 'COD',
        paymentStatus: 'UNPAID',
        status: prev.status === 'PAID' ? 'PENDING' : prev.status,
      }));
    } catch (err) {
      toast.error("Lỗi khi đổi phương thức: " + (err.response?.data?.message || err.message));
    }
  };

  const handleNotReceived = async (order) => {
    if (!window.confirm("Bạn xác nhận chưa nhận được hàng? Chúng tôi sẽ gửi yêu cầu khiếu nại tới Admin để giải quyết lập tức.")) return;
    try {
      await orderService.reportNotReceived(order.id);
      toast.success("Đã gửi khiếu nại chưa nhận được hàng thành công!");
      fetchOrders();
      // Auto open Admin chat
      setActiveChatChannel('CUSTOMER_ADMIN');
      setShowChatModal(true);
      if (selectedOrder && (selectedOrder.id === order.id || selectedOrder.orderId === order.id)) {
        setSelectedOrder(prev => ({ ...prev, status: 'DELIVERY_DISPUTE' }));
      }
    } catch (err) {
      toast.error("Lỗi gửi khiếu nại: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCompleteOrderWithRating = async () => {
    if (!ratingOrder) return;
    try {
      await orderService.updateStatus(ratingOrder.id, 'COMPLETED', ratingStars);
      toast.success("Đơn hàng đã được hoàn thành. Cảm ơn bạn đã đánh giá!");
      setShowRatingModal(false);
      fetchOrders();
      if (selectedOrder && (selectedOrder.id === ratingOrder.id || selectedOrder.orderId === ratingOrder.id)) {
        setSelectedOrder(prev => ({ ...prev, status: 'COMPLETED', rating: ratingStars }));
      }
    } catch (err) {
      toast.error("Lỗi khi hoàn thành đơn hàng: " + (err.response?.data?.message || err.message));
    }
  };

  const canReturn = (order) => {
    if (!order.actualDeliveryTime) return false;
    const deliveryDate = new Date(order.actualDeliveryTime);
    const now = new Date();
    const diffTime = now - deliveryDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  };

  const paymentMethodLabel = (method) => {
    if (method === 'COD') return 'Nhận hàng';
    if (method === 'BANK_TRANSFER') return 'Chuyển khoản';
    return 'Không rõ';
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'PENDING': return 'Chờ xác nhận';
      case 'PAID': return 'Đã thanh toán';
      case 'CONFIRMED': return 'Đã xác nhận';
      case 'PACKING': return 'Đang đóng gói';
      case 'SHIPPING': return 'Đang giao hàng';
      case 'DELIVERED': return 'Đã giao';
      case 'DELIVERY_DISPUTE': return 'Khiếu nại chưa nhận';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      case 'LOST': return 'Thất lạc';
      case 'RETURN_REQUESTED': return 'Yêu cầu hoàn trả';
      case 'RETURN_PICKING': return 'Đang lấy hàng hoàn';
      case 'RETURN_AWAITING_ADMIN_CONFIRM': return 'Chờ duyệt hàng về kho';
      case 'RETURNED_TO_WAREHOUSE': return 'Hàng đã về kho';
      case 'RETURNED': return 'Đã hoàn tiền';
      default: return status;
    }
  };

  const paymentMethodClass = (method) => {
    if (method === 'COD') return 'bg-sky-50 text-sky-700 border border-sky-200';
    if (method === 'BANK_TRANSFER') return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  const canShowCancelButton = (order) => {
    if (!order) return false;

    const blockedStatuses = ['CANCELLED', 'DELIVERED', 'COMPLETED', 'RETURN_REQUESTED', 'RETURN_PICKING', 'RETURNED', 'RETURNED_TO_WAREHOUSE'];
    if (blockedStatuses.includes(order.status)) return false;

    // Customer can cancel until the order enters SHIPPING (shipper has started delivery flow).
    return ['PENDING', 'PAID', 'CONFIRMED', 'PACKING'].includes(order.status);
  };

  const handleUpdateProfile = async (e) => {
     e.preventDefault();
     if(!user) return;
     try {
       // Attempt to geocode the provided address to get lat/lng for nearest-store detection
       const fullAddress = [profileData.houseNumber, profileData.ward, profileData.district, profileData.province].filter(Boolean).join(', ');
       let lat = null; let lon = null;
       try {
         const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&countrycodes=vn`, { headers: { 'Accept-Language': 'vi' } });
         const data = await res.json();
         if (data && data.length > 0) {
           lat = parseFloat(data[0].lat);
           lon = parseFloat(data[0].lon);
         }
       } catch (err) {
         // Geocode failure — continue without coords
         console.warn('Geocode failed', err);
       }

       const payload = { ...profileData };
       if (lat != null && lon != null) { payload.latitude = lat; payload.longitude = lon; }

       const res = await authService.updateProfile(user.id, payload);
       if(res && res.data) {
           toast.success("Hồ sơ đã được cập nhật thành công!");
           setUser(res.data);
           localStorage.setItem('user', JSON.stringify(res.data));

           // If user came from checkout, return them to checkout to continue
           const from = query.get('from');
           if (from === 'checkout') {
             navigate('/checkout', { replace: true });
           }
       }
     } catch(err) {
       toast.error("Cập nhật hồ sơ thất bại: " + (err.message || "Lỗi không xác định"));
     }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 flex flex-col md:flex-row gap-8">
      {/* Sidebar Profile Menu */}
      <div className="w-full md:w-64 flex-shrink-0">
         <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center mb-4">
            <div className="w-24 h-24 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-4xl font-bold mb-4">
               {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
            </div>
            <h2 className="text-xl font-bold text-gray-800">{user?.name || user?.username}</h2>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                {user?.rewardStars || 0} sao tích lũy
              </div>

            </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setActiveTab('info')}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors ${activeTab === 'info' ? 'bg-brand-50 text-brand-600 border-l-4 border-brand-500 font-medium' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <User size={20} /> Cá nhân
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`w-full text-left px-6 py-4 flex items-center gap-3 transition-colors ${activeTab === 'orders' ? 'bg-brand-50 text-brand-600 border-l-4 border-brand-500 font-medium' : 'text-gray-600 hover:bg-gray-50 border-l-4 border-transparent'}`}
            >
              <Package size={20} /> Lịch sử đơn hàng
            </button>
            <button
              onClick={logout}
              className="w-full text-left px-6 py-4 text-red-500 hover:bg-red-50 transition-colors border-t border-gray-100 font-medium"
            >
              Đăng xuất
            </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow">
         {activeTab === 'info' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
               <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold text-gray-800">Thông tin cá nhân</h2>

               </div>
               <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-xl">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
                   <input type="text" className="input-field" value={profileData.name} onChange={(e) => setProfileData({...profileData, name: e.target.value})} />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                   <input type="email" className="input-field bg-gray-100" value={user?.email || ''} readOnly />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                   <input type="tel" className="input-field" value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Tỉnh / Thành phố</label>
                     <select className="input-field" value={profileData.province} onChange={(e) => setProfileData({...profileData, province: e.target.value})} required>
                        <option value="">-- Chọn Tỉnh / Thành phố --</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                     </select>
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Quận / Huyện</label>
                     <input type="text" className="input-field" value={profileData.district} onChange={(e) => setProfileData({...profileData, district: e.target.value})} placeholder="Ví dụ: Liên Chiểu" required />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phường / Xã</label>
                      <input type="text" className="input-field" value={profileData.ward} onChange={(e) => setProfileData({...profileData, ward: e.target.value})} placeholder="Ví dụ: Hòa Khánh Bắc" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số nhà, tên đường</label>
                      <input type="text" className="input-field" value={profileData.houseNumber} onChange={(e) => setProfileData({...profileData, houseNumber: e.target.value})} placeholder="Ví dụ: 123 Ngô Sĩ Liên" required />
                    </div>
                  </div>

                 <button type="submit" className="btn-primary px-8">Cập nhật</button>
               </form>
            </div>
         )}

        {activeTab === 'orders' && (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

    {/* ================= LIST ================= */}
    {!selectedOrder && (
      <>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          Lịch sử đơn hàng
        </h2>

        {loadingOrders ? (
          <div className="py-12"><Spinner /></div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => {
                  setSelectedOrder(order);
                  const params = new URLSearchParams(window.location.search);
                  params.set('orderId', order.orderCode || order.id);
                  navigate({ search: params.toString() }, { replace: true });
                }}
                className="border rounded-xl p-4 cursor-pointer hover:shadow flex justify-between items-center transition-all duration-200 hover:border-blue-200 hover:bg-slate-50/20"
              >
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-slate-800">#{order.orderCode}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'PENDING' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200/55' :
                      order.status === 'PAID' ? 'bg-blue-50 text-blue-800 border border-blue-100' :
                      order.status === 'CONFIRMED' ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' :
                      order.status === 'SHIPPED' ? 'bg-teal-50 text-teal-800 border border-teal-100' :
                      order.status === 'DELIVERED' ? 'bg-purple-50 text-purple-800 border border-purple-100' :
                      order.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
                      order.status === 'DELIVERY_DISPUTE' ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm animate-pulse' :
                      order.status === 'LOST' ? 'bg-gray-800 text-gray-200 border border-gray-600' :
                      order.status === 'RETURN_REQUESTED' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                      order.status === 'RETURN_PICKING' ? 'bg-orange-50 text-orange-650 border border-orange-100/50' :
                      order.status === 'RETURNED' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {statusLabel(order.status)}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentMethodClass(order.paymentMethod)}`}>
                      {paymentMethodLabel(order.paymentMethod)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 mt-2">
                    <span className="text-sm font-semibold text-slate-500">
                      {new Date(order.createdAt || order.orderDate || Date.now()).toLocaleDateString('vi-VN')}
                    </span>
                    <span className="text-red-500 font-bold text-sm">
                      {new Intl.NumberFormat('vi-VN', {
                        style: 'currency',
                        currency: 'VND'
                      }).format(order.finalPrice || order.totalPrice || 0)}
                    </span>
                  </div>
                </div>

                {/* Right side: Chat Quick Action Button */}
                <div className="flex items-center gap-2 pl-4" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setSelectedOrder(order);
                      const hasShipper = order.assignedShipper != null || order.shipperId != null || order.shipperName != null;
                      const status = order.status;
                      const isShipperUnlocked = hasShipper && (
                        status === 'SHIPPING' ||
                        status === 'DELIVERED' ||
                        status === 'COMPLETED' ||
                        status === 'RETURN_REQUESTED' ||
                        status === 'RETURN_PICKING' ||
                        status === 'RETURNED'
                      );

                      setActiveChatChannel(isShipperUnlocked ? 'CUSTOMER_SHIPPER' : 'CUSTOMER_ADMIN');
                      setShowChatModal(true);

                      setUnreadCountsByOrder(prev => ({
                        ...prev,
                        [order.id]: 0
                      }));
                    }}
                    className={`relative p-3 rounded-full transition-all duration-300 flex items-center justify-center border shadow-sm ${
                      unreadCountsByOrder[order.id] > 0
                        ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100 scale-105 shadow-rose-100'
                        : 'bg-white border-slate-100 text-slate-500 hover:text-blue-500 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <MessageSquare size={18} />

                    {unreadCountsByOrder[order.id] > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white shadow animate-bounce">
                        {unreadCountsByOrder[order.id]}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>Không có đơn hàng</p>
        )}
      </>
    )}

    {/* ================= DETAIL ================= */}
    {selectedOrder && (
      <>
        <button
          onClick={() => {
            setSelectedOrder(null);
            const params = new URLSearchParams(window.location.search);
            params.delete('orderId');
            navigate({ search: params.toString() }, { replace: true });
          }}
          className="mb-6 text-blue-500 hover:underline"
        >
          ← Quay lại danh sách
        </button>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white shadow-sm mb-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Chi tiết đơn #{selectedOrder.orderCode}</h2>
              <p className="text-sm text-slate-300 mt-1">
                Đặt lúc {new Date(selectedOrder.createdAt || selectedOrder.orderDate || Date.now()).toLocaleString('vi-VN')}
              </p>
            </div>
            <span className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm font-semibold uppercase tracking-wide">
              {statusLabel(selectedOrder.status)}
            </span>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Giao hàng</p>
            <p className="mt-2 text-sm text-slate-700">{selectedOrder.shippingAddress || 'Chưa có địa chỉ giao hàng'}</p>
            <p className="text-sm text-slate-700">Người nhận: {selectedOrder.customerName || user?.name || 'N/A'}</p>
            <p className="text-sm text-slate-700">SĐT: {selectedOrder.customerPhone || user?.phone || 'N/A'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
              <span>Phương thức:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${paymentMethodClass(selectedOrder.paymentMethod)}`}>
                {paymentMethodLabel(selectedOrder.paymentMethod)}
              </span>
            </div>
            <p className="text-sm text-slate-700">Trạng thái: {selectedOrder.paymentStatus || 'N/A'}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedOrder.paymentMethod === 'BANK_TRANSFER' && selectedOrder.paymentStatus === 'UNPAID' && selectedOrder.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleRePay(selectedOrder)}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition-colors shadow-sm"
                >
                  <CreditCard size={14} /> THANH TOÁN NGAY
                </button>
              )}
              {/* Nút đổi sang COD - hiển thị khi đang dùng chuyển khoản nhưng chưa thanh toán */}
              {selectedOrder.paymentMethod === 'BANK_TRANSFER' && selectedOrder.paymentStatus === 'UNPAID' && selectedOrder.status !== 'CANCELLED' && (
                <button
                  onClick={() => handleSwitchToCod(selectedOrder)}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm"
                >
                  🔄 ĐỔI SANG NHẬN HÀNG
                </button>
              )}
              {canShowCancelButton(selectedOrder) && (
                <button
                  onClick={() => handleCancelOrder(selectedOrder.id)}
                  className="flex items-center gap-2 rounded-lg border border-red-500 bg-white px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors shadow-sm"
                >
                  <XCircle size={14} /> HỦY ĐƠN HÀNG
                </button>
              )}
            </div>
            {selectedOrder.starsUsed > 0 && (
              <p className="text-sm text-amber-600 font-bold">Dùng: {selectedOrder.starsUsed} sao (-{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(selectedOrder.starsUsed * 1000)})</p>
            )}
            {selectedOrder.starsAwarded > 0 && (
              <p className="text-sm text-emerald-600 font-bold">Nhận: +{selectedOrder.starsAwarded} sao</p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {(selectedOrder.items || selectedOrder.orderItems || []).map((item, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-semibold text-slate-900">{item.productName || item.product?.name}</div>
                  <div className="text-sm text-slate-500 mt-1">Số lượng: {item.quantity}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500">Thành tiền</div>
                  <div className="font-semibold text-slate-800">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(item.price || item.product?.price || 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 font-bold text-rose-700 text-lg flex items-center justify-between">
          <span>Tổng đơn hàng</span>
          <span>{new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
          }).format(selectedOrder.finalPrice || selectedOrder.totalPrice || 0)}</span>
        </div>

        {/* Chat Cards Section */}
        <div className="mt-8 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 mb-6 flex items-center gap-2">
            <span>💬</span> Trò chuyện Hỗ trợ & Vận chuyển
          </h3>
          <div className="flex items-center gap-8 justify-center py-6 px-4 bg-slate-50/50 rounded-3xl border border-slate-100/80">
            {/* Chat với Admin Icon Button */}
            <button
              onClick={() => {
                setActiveChatChannel('CUSTOMER_ADMIN');
                setShowChatModal(true);
                setUnreadAdminCount(0);
              }}
              className="flex flex-col items-center gap-3 group focus:outline-none"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-200/80 group-hover:shadow-blue-300/80 transition-all duration-300 group-hover:scale-110 active:scale-95 relative">
                <Shield size={26} className="group-hover:rotate-12 transition-transform duration-300" />

                {unreadAdminCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                    {unreadAdminCount}
                  </span>
                ) : (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                  </span>
                )}
              </div>
              <div className="text-center">
                <span className="block text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-blue-600 transition-colors">Admin Hỗ Trợ</span>
                <span className="block text-[10px] text-slate-400 font-medium mt-0.5">Trực tuyến</span>
              </div>
            </button>

            {/* Chat với Shipper Icon Button */}
            {(() => {
              const hasShipper = selectedOrder.assignedShipper != null || selectedOrder.shipperId != null || selectedOrder.shipperName != null;
              const status = selectedOrder.status;
              const isUnlocked = hasShipper && (
                status === 'SHIPPING' ||
                status === 'DELIVERED' ||
                status === 'COMPLETED' ||
                status === 'RETURN_REQUESTED' ||
                status === 'RETURN_PICKING' ||
                status === 'RETURNED'
              );

              if (isUnlocked) {
                return (
                  <button
                    onClick={() => {
                      setActiveChatChannel('CUSTOMER_SHIPPER');
                      setShowChatModal(true);
                      setUnreadShipperCount(0);
                    }}
                    className="flex flex-col items-center gap-3 group focus:outline-none"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-amber-200/80 group-hover:shadow-amber-300/80 transition-all duration-300 group-hover:scale-110 active:scale-95 relative">
                      <Truck size={26} className="group-hover:translate-x-0.5 transition-transform duration-300" />

                      {unreadShipperCount > 0 ? (
                        <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                          {unreadShipperCount}
                        </span>
                      ) : (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                        </span>
                      )}
                    </div>
                    <div className="text-center">
                      <span className="block text-xs font-black uppercase tracking-wider text-slate-700 group-hover:text-amber-600 transition-colors">Shipper</span>
                      <span className="block text-[10px] text-emerald-600 font-bold mt-0.5">Đã kết nối</span>
                    </div>
                  </button>
                );
              }

              return null;
            })()}
          </div>
        </div>

        {selectedOrder.status === 'DELIVERED' && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-4 border-t border-slate-100 pt-6">
            <button
              onClick={() => handleNotReceived(selectedOrder)}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl border border-rose-500 text-rose-500 font-bold hover:bg-rose-50 transition-colors shadow-sm text-sm"
            >
              Tôi chưa nhận được hàng
            </button>
            <button
              onClick={() => {
                setRatingOrder(selectedOrder);
                setRatingStars(5);
                setShowRatingModal(true);
              }}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-100 text-sm"
            >
              Đã nhận được hàng
            </button>
          </div>
        )}

        {selectedOrder.status === 'COMPLETED' && canReturn(selectedOrder) && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => handleRequestReturn(selectedOrder)}
              className="px-6 py-2 rounded-xl bg-white border border-red-500 text-red-500 font-bold hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2"
            >
              <Package size={18} /> Hoàn trả / Trả tiền
            </button>
          </div>
        )}
        {selectedOrder.cancellationReason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            <strong>Lý do hủy:</strong> {selectedOrder.cancellationReason}
          </div>
        )}
      </>
    )}

  </div>
)}
      </div>
      {showQRModal && paymentSession && (
        <QRPaymentModal
          paymentSession={paymentSession}
          onPaid={handlePaid}
          onCancel={() => setShowQRModal(false)}
        />
      )}

      {/* Real-time Chat Modal */}
      {showChatModal && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowChatModal(false)}></div>
          <div className="relative w-full max-w-xl animate-in zoom-in-95 duration-200 flex flex-col gap-4">

            {/* Elegant Header Above the Chat Box */}
            <div className="flex items-center justify-between text-slate-800 bg-white/95 backdrop-blur px-6 py-4 rounded-2xl shadow-sm border border-slate-100/50">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <span className="font-bold text-slate-800 text-sm md:text-base">Trò chuyện Hỗ trợ & Vận chuyển</span>
              </div>
              <button
                onClick={() => setShowChatModal(false)}
                className="w-8 h-8 rounded-full bg-slate-150 text-slate-500 hover:bg-slate-200 hover:text-slate-850 flex items-center justify-center text-lg font-bold transition-all focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Chat Box Container */}
            <div className="h-[500px]">
              <OrderChat
                order={selectedOrder}
                currentUser={user}
                role="CUSTORMER"
                initialChannel={activeChatChannel}
              />
            </div>
          </div>
        </div>
      )}

      {/* Star Rating Modal for Completion */}
      {showRatingModal && ratingOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" onClick={() => setShowRatingModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100/50">
            <h3 className="text-lg font-black text-slate-800 text-center mb-2">Đánh giá đơn hàng</h3>
            <p className="text-xs text-slate-400 text-center mb-6 uppercase tracking-wider font-bold">
              Đơn hàng #{ratingOrder.orderCode}
            </p>

            {/* Star selector */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingStars(star)}
                  className="p-1 focus:outline-none transition-transform active:scale-90 hover:scale-115"
                >
                  <svg
                    className={`w-10 h-10 transition-colors ${
                      star <= ratingStars ? 'text-amber-400 fill-amber-400' : 'text-slate-200'
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Helper text based on star rating */}
            <p className="text-center text-xs font-bold text-slate-500 mb-8 min-h-[16px]">
              {ratingStars === 5 && "⭐⭐⭐⭐⭐ Tuyệt vời! Rất hài lòng."}
              {ratingStars === 4 && "⭐⭐⭐⭐ Rất tốt! Hài lòng."}
              {ratingStars === 3 && "⭐⭐⭐ Bình thường! Tạm được."}
              {ratingStars === 2 && "⭐⭐ Không hài lòng!"}
              {ratingStars === 1 && "⭐ Rất không hài lòng!"}
            </p>

            <div className="flex gap-4">
              <button
                onClick={() => setShowRatingModal(false)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-50 transition-colors text-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCompleteOrderWithRating}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md shadow-emerald-100 text-sm"
              >
                Hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
