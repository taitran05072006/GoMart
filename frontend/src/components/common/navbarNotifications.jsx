import React, { useContext, useState } from 'react';
import { Bell } from 'lucide-react';
import { NotificationContext } from '../../context/NotificationContext';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const NavbarNotifications = () => {
  const { notifications, unreadCount, markAsRead } = useContext(NotificationContext);
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = user?.role === 'ADMIN';
  const [activeTab, setActiveTab] = useState('all');

  const filtered = notifications.filter(n => {
    if (activeTab === 'orders') return n.title?.toLowerCase().includes('đơn hàng');
    if (activeTab === 'expiry') return n.title?.toLowerCase().includes('hạn sử dụng');
    return true;
  });

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}></div>
          <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <span className="font-bold text-slate-900">Thông báo</span>
              <button 
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Đóng
              </button>
            </div>

            {isAdmin && (
              <div className="flex border-b border-slate-50 px-2 bg-white">
                <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="Tất cả" />
                <TabButton active={activeTab === 'orders'} onClick={() => setActiveTab('orders')} label="Đơn hàng" />
                <TabButton active={activeTab === 'expiry'} onClick={() => setActiveTab('expiry')} label="Hết hạn" />
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto py-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bell size={20} className="text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-500 px-4">Hiện không có thông báo nào trong mục này.</p>
                </div>
              ) : (
                filtered.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) markAsRead(n.id);
                      setOpen(false);
                      if (n.navigateTo) navigate(n.navigateTo);
                    }}
                    className={`px-4 py-3 cursor-pointer transition-colors ${
                      !n.isRead 
                        ? 'bg-blue-50/40' 
                        : 'hover:bg-slate-50'
                    }`}
                    style={{ boxShadow: !n.isRead ? 'inset 3px 0 0 #3b82f6' : 'inset 3px 0 0 transparent' }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className={`font-semibold text-sm ${!n.isRead ? 'text-slate-900' : 'text-slate-600'}`}>
                        {n.title}
                      </div>
                      {!n.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.message}</div>
                    <div className="text-[10px] text-slate-400 mt-2">
                      {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-xs font-bold transition-all border-b-2 -mb-px ${
      active 
        ? 'text-slate-900 border-slate-950' 
        : 'text-slate-400 border-transparent hover:text-slate-600'
    }`}
  >
    {label}
  </button>
);

export default NavbarNotifications;