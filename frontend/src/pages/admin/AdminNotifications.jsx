import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, Send, Inbox, Package, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import notificationService from '../../services/notificationService';
import { AuthContext } from '../../context/AuthContext';

const AdminNotifications = () => {
  const { user, impersonatedStoreId } = useContext(AuthContext);
  const navigate = useNavigate();
  const isStoreMode = user?.role === 'SUPER_ADMIN' && Boolean(impersonatedStoreId);
  const [activeTab, setActiveTab] = useState('inbox'); // 'broadcast' | 'inbox'
  const [form, setForm] = useState({ title: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);

  useEffect(() => {
    if (isStoreMode) {
      setActiveTab('inbox');
    }
  }, [isStoreMode]);

  useEffect(() => {
    if (user?.id) {
      loadInbox();
    }
  }, [user?.id]);

  const loadInbox = async () => {
    try {
      setLoadingInbox(true);
      const res = await notificationService.getUserNotifications(user.id);
      const data = res?.data?.data || res?.data || res;
      setInbox(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInbox(false);
    }
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item.id);
        setInbox(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true } : n));
      } catch (error) {
        console.error("Lỗi khi đánh dấu thông báo đã đọc", error);
      }
    }
    if (item.navigateTo) {
      navigate(item.navigateTo);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (isStoreMode) {
      toast.error('Chế độ cửa hàng không hỗ trợ gửi thông báo chung');
      return;
    }
    if (!form.title.trim() || !form.message.trim()) {
      toast.error('Vui lòng điền vào cả tiêu đề và nội dung thông báo');
      return;
    }

    try {
      setSubmitting(true);
      await notificationService.broadcastToAllCustomers({
        title: form.title.trim(),
        message: form.message.trim(),
        senderId: user?.id,
      });
      setForm({ title: '', message: '' });
      toast.success(user?.role === 'STORE_ADMIN' ? 'Đã gửi thông báo đến khách hàng của cửa hàng' : 'Đã gửi thông báo đến tất cả khách hàng');
      loadInbox(); // Refresh inbox if broadcast also sends to admin
    } catch (error) {
      const message = error?.response?.data?.message || 'Không thể gửi thông báo lúc này';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (title) => {
    if (title.toLowerCase().includes('đơn hàng')) return <ShoppingCart className="text-blue-400" size={18} />;
    if (title.toLowerCase().includes('tồn kho') || title.toLowerCase().includes('sản phẩm')) return <Package className="text-orange-400" size={18} />;
    return <BellRing className="text-red-400" size={18} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-zinc-800 pb-px">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all ${activeTab === 'inbox' ? 'border-b-2 border-blue-600 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Inbox size={18} /> Hộp thư Admin
        </button>
        {!isStoreMode && (
          <button
            onClick={() => setActiveTab('broadcast')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold transition-all ${activeTab === 'broadcast' ? 'border-b-2 border-blue-600 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Send size={18} /> Gửi thông báo chung
          </button>
        )}
      </div>

      {!isStoreMode && activeTab === 'broadcast' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-2xl bg-blue-500/10 p-3">
                <BellRing className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Broadcast</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{user?.role === 'STORE_ADMIN' ? 'Gửi tới khách hàng của cửa hàng' : 'Gửi tới tất cả khách hàng'}</p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Tiêu đề</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={onChange}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Tiêu đề thông báo..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Nội dung</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={onChange}
                  rows={5}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  placeholder="Nhập nội dung thông báo..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 font-black text-white shadow-lg shadow-slate-200 transition hover:bg-slate-800 active:scale-[0.98] disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
                {submitting ? 'ĐANG GỬI...' : 'GỬI THÔNG BÁO NGAY'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'inbox' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-blue-500/10 p-3">
                  <Inbox className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">Hộp thư hệ thống</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đơn hàng & Sản phẩm</p>
                </div>
              </div>
              <button
                onClick={loadInbox}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
              >
                LÀM MỚI
              </button>
            </div>

            {loadingInbox ? (
              <div className="py-20 text-center text-zinc-500 animate-pulse font-medium">Đang tải thông báo...</div>
            ) : inbox.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-zinc-800 rounded-3xl">
                <Inbox className="mx-auto mb-4 h-12 w-12 text-zinc-800" />
                <p className="text-zinc-500 font-medium">Hộp thư hiện đang trống.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inbox.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`group relative flex gap-4 rounded-2xl border p-4 transition-all hover:bg-slate-50 cursor-pointer ${item.isRead ? 'border-slate-100 bg-white' : 'border-blue-100 bg-blue-50/30 shadow-sm'}`}
                  >
                    {!item.isRead && <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-blue-500" />}

                    <div className="flex-shrink-0">
                      <div className="rounded-xl bg-slate-100 p-2.5">
                        {getIcon(item.title)}
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-bold ${item.isRead ? 'text-slate-500' : 'text-slate-900'}`}>{item.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!isStoreMode && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Chế độ toàn hệ thống có thể gửi broadcast; chế độ cửa hàng chỉ xem hộp thư của cửa hàng đang chọn.
        </div>
      )}

      {isStoreMode && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700 shadow-sm">
          Chế độ cửa hàng chỉ hiển thị hộp thư cá nhân và thông báo liên quan đến cửa hàng đang chọn.
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
