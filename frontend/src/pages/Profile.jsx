import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import orderService from '../services/orderService';
import authService from '../services/authService';
import Spinner from '../components/common/Spinner';
import toast from 'react-hot-toast';
import { Package, User, CreditCard, XCircle } from 'lucide-react';
import paymentService from '../services/Payment';
import QRPaymentModal from '../components/checkout/QRPaymentModal';

const useQuery = () => new URLSearchParams(useLocation().search);

const Profile = () => {
  const query = useQuery();
  const initialTab = query.get('tab') || 'info';

  const { user, logout, setUser } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [paymentSession, setPaymentSession] = useState(null);


  const [profileData, setProfileData] = useState({
     name: user?.name || '',
     phone: user?.phone || '',
     province: user?.province || '',
     district: user?.district || '',
     ward: user?.ward || '',
     houseNumber: user?.houseNumber || ''
  });

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
  }, [activeTab]);

  const fetchOrders = async () => {
     if(!user) return;
     setLoadingOrders(true);
     try {
        const res = await orderService.getAllOrders();
        const allOrders = res.data || res || [];
        const myOrders = allOrders.filter(o => o.userId === user.id || o.user?.id === user.id);
        setOrders(myOrders);
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
      toast.success("Yêu cầu hoàn trả đã được gửi!");
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

  const canReturn = (order) => {
    if (!order.actualDeliveryTime) return false;
    const deliveryDate = new Date(order.actualDeliveryTime);
    const now = new Date();
    const diffTime = now - deliveryDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 3;
  };

  const handleUpdateProfile = async (e) => {
     e.preventDefault();
     if(!user) return;
     try {
       const res = await authService.updateProfile(user.id, profileData);
       if(res && res.data) {
           toast.success("Hồ sơ đã được cập nhật thành công!");
           setUser(res.data);
           localStorage.setItem('user', JSON.stringify(res.data));
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
              <div className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest shadow-sm ${
                user?.tier === 'DIAMOND' ? 'bg-indigo-600 text-white' :
                user?.tier === 'GOLD' ? 'bg-yellow-400 text-black' :
                user?.tier === 'SILVER' ? 'bg-gray-300 text-gray-800' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {user?.tier || 'MEMBER'}
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
                 <span className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-tighter shadow-sm border ${
                    user?.tier === 'DIAMOND' ? 'bg-indigo-600 text-white border-indigo-400' :
                    user?.tier === 'GOLD' ? 'bg-yellow-400 text-black border-yellow-300' :
                    user?.tier === 'SILVER' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                 }`}>
                   Hạng {user?.tier || 'MEMBER'}
                 </span>
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
                     <input type="text" className="input-field" value={profileData.province} onChange={(e) => setProfileData({...profileData, province: e.target.value})} placeholder="Ví dụ: Đà Nẵng" required />
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
                onClick={() => setSelectedOrder(order)}
                className="border rounded-xl p-4 cursor-pointer hover:shadow"
              >
                <div className="flex justify-between">
                  <span className="font-bold">#{order.orderCode}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'SHIPPED' ? 'bg-green-100 text-green-800' :
                    order.status === 'DELIVERED' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                    order.status === 'RETURN_REQUESTED' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'RETURN_PICKING' ? 'bg-orange-50 text-orange-700' :
                    order.status === 'RETURNED' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status}
                  </span>
                  <span className="text-red-500">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(order.finalPrice)}
                  </span>
                </div>

                <div className="text-sm text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()}
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
          onClick={() => setSelectedOrder(null)}
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
              {selectedOrder.status}
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
            <p className="mt-2 text-sm text-slate-700">Phương thức: {selectedOrder.paymentMethod || 'N/A'}</p>
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
              {selectedOrder.status !== 'CANCELLED' && (selectedOrder.status === 'PENDING' || selectedOrder.paymentStatus === 'UNPAID') && (
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

        {(selectedOrder.status === 'DELIVERED' || selectedOrder.status === 'COMPLETED') && canReturn(selectedOrder) && (
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
    </div>
  );
};

export default Profile;
