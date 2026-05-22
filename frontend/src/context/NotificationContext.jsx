import React, { createContext, useState, useEffect, useContext, useRef, useCallback } from 'react';
import { AuthContext } from './AuthContext';
import { Client } from '@stomp/stompjs';
import SockJSImport from 'sockjs-client/dist/sockjs';
const SockJS = SockJSImport.default || SockJSImport;
import toast from 'react-hot-toast';
import axiosClient from '../api/axiosClient';

export const NotificationContext = createContext();

// --------------- Shopee-style Toast ---------------
const toastStyles = `
  @keyframes slideInRight {
    from { transform: translateX(110%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0);    opacity: 1; }
    to   { transform: translateX(110%); opacity: 0; }
  }
  @keyframes shrink {
    from { width: 100%; }
    to   { width: 0%;   }
  }
`;

const ShopeeToast = ({ t, notif, onDismiss }) => (
  <>
    <style>{toastStyles}</style>
    <div
      onClick={onDismiss}
      style={{
        animation: t.visible
          ? 'slideInRight 0.35s cubic-bezier(0.21,1.02,0.73,1) forwards'
          : 'slideOutRight 0.25s ease-in forwards',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
        padding: '14px 16px 10px',
        width: '320px',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        borderLeft: '4px solid #ee4d2d',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '20px', lineHeight: 1 }}>🛎️</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '13px', color: '#ee4d2d', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {notif.title}
          </div>
          <div style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>
            {notif.message}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '16px', lineHeight: 1, padding: '0 0 0 6px', flexShrink: 0 }}
        >×</button>
      </div>
      {/* Progress bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        height: '3px', background: '#ee4d2d', borderRadius: '0 0 0 2px',
        animation: 'shrink 4s linear forwards',
      }} />
    </div>
  </>
);
// --------------------------------------------------

export const NotificationProvider = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const stompClientRef = useRef(null);
    const subscriptionRef = useRef(null);
    const connectingRef = useRef(false);
    const activeUserIdRef = useRef(null);
    const apiBaseUrl = axiosClient.defaults.baseURL || 'http://localhost:8080/api';
    const wsBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');
    const stompDebugEnabled = import.meta.env.VITE_STOMP_DEBUG === 'true';

    const fetchHistory = useCallback(async () => {
        if (!user) return;
        try {
            const res = await axiosClient.get(`/notifications/${user.id}`);
            if (res.success && res.data) {
                setNotifications(res.data);
                setUnreadCount(res.data.filter(n => !n.isRead).length);
            }
        } catch (e) {
            console.error("Lấy lịch sử thông báo thất bại", e);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await axiosClient.post(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (e) {
            console.error("Đánh dấu thông báo là đã đọc thất bại", e);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const disconnectClient = async () => {
            subscriptionRef.current?.unsubscribe();
            subscriptionRef.current = null;

            if (stompClientRef.current) {
                try {
                    await stompClientRef.current.deactivate();
                } catch (error) {
                    console.error('Lỗi khi ngắt kết nối client STOMP', error);
                }
            }

            stompClientRef.current = null;
            connectingRef.current = false;
            activeUserIdRef.current = null;
        };

        if (!user?.id) {
            disconnectClient();
            setNotifications([]);
            setUnreadCount(0);
            return undefined;
        }

        const initNotifications = async () => {
            try {
                await fetchHistory();
                if (cancelled) return;

                const alreadyConnectedForUser =
                    activeUserIdRef.current === user.id &&
                    stompClientRef.current &&
                    (stompClientRef.current.active || connectingRef.current);

                if (alreadyConnectedForUser) {
                    return;
                }

                await disconnectClient();
                if (cancelled) return;

                connectingRef.current = true;

                const client = new Client({
                    webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
                    reconnectDelay: 5000,
                    debug: (str) => {
                        if (stompDebugEnabled) {
                            console.log(str);
                        }
                    },
                    onConnect: (frame) => {
                        if (cancelled) {
                            client.deactivate();
                            return;
                        }

                        connectingRef.current = false;
                        activeUserIdRef.current = user.id;
                        console.log('Connected to WS', frame.headers);

                        subscriptionRef.current?.unsubscribe();
                        subscriptionRef.current = client.subscribe(`/topic/notifications/${user.id}`, (messageOutput) => {
                            const newNotif = JSON.parse(messageOutput.body);

                            toast.custom((t) => (
                              <ShopeeToast t={t} notif={newNotif} onDismiss={() => { toast.dismiss(t.id); markAsRead(newNotif.id); }} />
                            ), { duration: 4000, position: 'top-right' });

                            setNotifications(prev => [newNotif, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        });
                    },
                    onStompError: (frame) => {
                        connectingRef.current = false;
                        console.error('Broker reported error: ' + frame.headers?.message);
                        console.error('Additional details: ' + frame.body);
                    },
                    onWebSocketClose: () => {
                        connectingRef.current = false;
                    },
                });

                stompClientRef.current = client;
                client.activate();
            } catch (error) {
                connectingRef.current = false;
                console.error('Notification init failed', error);
            }
        };

        initNotifications();

        return () => {
            cancelled = true;
            disconnectClient();
        };
    }, [user, fetchHistory]);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, fetchHistory }}>
            {children}
        </NotificationContext.Provider>
    );
};
