import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJSImport from 'sockjs-client/dist/sockjs';
const SockJS = SockJSImport.default || SockJSImport;
import { Send, Lock, MessageSquare, Shield, Truck, User } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import toast from 'react-hot-toast';

const OrderChat = ({ order, currentUser, role, initialChannel, forcedChannel }) => {
  const orderId = order?.id;
  const isCustomer = role === 'CUSTORMER';
  const isAdmin = role === 'ADMIN';
  const isShipper = role === 'SHIPPER';

  // Determine initial channel
  const [activeChannel, setActiveChannel] = useState(
    forcedChannel || initialChannel || (isShipper ? 'CUSTOMER_SHIPPER' : 'CUSTOMER_ADMIN')
  );

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const stompClientRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Sync forcedChannel or initialChannel if it changes from parent
  useEffect(() => {
    if (forcedChannel) {
      setActiveChannel(forcedChannel);
    }
  }, [forcedChannel]);

  useEffect(() => {
    if (initialChannel) {
      setActiveChannel(initialChannel);
    }
  }, [initialChannel]);

  // Compute WebSocket URLs safely
  const apiBaseUrl = axiosClient.defaults.baseURL || 'http://localhost:8080/api';
  const wsBaseUrl = apiBaseUrl.replace(/\/api\/?$/, '');

  // Check if shipper chat is open (Shipper must be assigned AND order must be in SHIPPING or later)
  const isShipperChatUnlocked = () => {
    if (!order) return false;
    const hasShipper = order.assignedShipper != null || order.shipperId != null || order.shipperName != null;
    if (!hasShipper) return false;

    const status = order.status;
    return status === 'SHIPPING' || 
           status === 'DELIVERED' || 
           status === 'COMPLETED' ||
           status === 'RETURN_REQUESTED' ||
           status === 'RETURN_PICKING' ||
           status === 'RETURN_AWAITING_ADMIN_CONFIRM' ||
           status === 'RETURNED';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat history
  const loadChatHistory = async (channel) => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await axiosClient.get(`/orders/${orderId}/chat`, {
        params: { channel, readerId: currentUser?.id }
      });
      if (res.success && res.data) {
        setMessages(res.data);
      }
    } catch (e) {
      console.error('Không thể tải lịch sử chat', e);
    } finally {
      setLoading(false);
    }
  };

  // Setup WebSocket Subscription
  useEffect(() => {
    if (!orderId || !currentUser?.id) return undefined;

    // Check if channel is locked
    if (activeChannel === 'CUSTOMER_SHIPPER' && !isShipperChatUnlocked()) {
      setMessages([]);
      return undefined;
    }

    let isCancelled = false;
    loadChatHistory(activeChannel);

    const disconnect = () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      if (stompClientRef.current) {
        try {
          stompClientRef.current.deactivate();
        } catch (e) {
          console.error('Lỗi ngắt kết nối STOMP', e);
        }
        stompClientRef.current = null;
      }
    };

    const connectWebSocket = () => {
      const client = new Client({
        webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
        reconnectDelay: 5000,
        debug: () => {},
        onConnect: () => {
          if (isCancelled) {
            client.deactivate();
            return;
          }
          console.log(`STOMP Chat connected to ${activeChannel}`);
          
          subscriptionRef.current = client.subscribe(
            `/topic/orders/${orderId}/chat/${activeChannel}`,
            (messageOutput) => {
              const newMsg = JSON.parse(messageOutput.body);
              setMessages((prev) => {
                // Prevent duplicate messages in case rest + ws collide
                if (prev.some((m) => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
              });
            }
          );
        },
        onStompError: (frame) => {
          console.error('Broker error:', frame.headers?.message);
        }
      });

      stompClientRef.current = client;
      client.activate();
    };

    connectWebSocket();

    return () => {
      isCancelled = true;
      disconnect();
    };
  }, [orderId, activeChannel, order?.status]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChannel]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || sending || !orderId || !currentUser?.id) return;

    setSending(true);
    try {
      const payload = {
        senderId: currentUser.id,
        senderName: currentUser.name || currentUser.username || 'Người dùng',
        senderRole: role,
        channel: activeChannel,
        content: inputText
      };

      const res = await axiosClient.post(`/orders/${orderId}/chat`, payload);
      if (res.success && res.data) {
        setInputText('');
        // Add instantly to UI (if WS lags slightly)
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const getRoleLabel = (roleStr) => {
    if (roleStr === 'ADMIN') return 'Admin';
    if (roleStr === 'SHIPPER') return 'Shipper';
    return 'Khách';
  };

  const getRoleBadgeColor = (roleStr) => {
    if (roleStr === 'ADMIN') return 'bg-indigo-100 text-indigo-700';
    if (roleStr === 'SHIPPER') return 'bg-emerald-100 text-emerald-700';
    return 'bg-blue-100 text-blue-700';
  };

  const isChannelLocked = activeChannel === 'CUSTOMER_SHIPPER' && !isShipperChatUnlocked();

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-lg overflow-hidden flex flex-col h-[500px]">
      {/* Header Tabs */}
      {!forcedChannel && (
        isCustomer ? (
          isShipperChatUnlocked() ? (
            <div className="bg-slate-950 flex border-b border-slate-900">
              <button
                onClick={() => setActiveChannel('CUSTOMER_ADMIN')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-4 transition-all ${
                  activeChannel === 'CUSTOMER_ADMIN'
                    ? 'border-blue-500 text-blue-500 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield size={14} /> Chat với Admin
              </button>
              <button
                onClick={() => setActiveChannel('CUSTOMER_SHIPPER')}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b-4 transition-all ${
                  activeChannel === 'CUSTOMER_SHIPPER'
                    ? 'border-amber-500 text-amber-500 bg-slate-900/50'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Truck size={14} /> Chat với Shipper
              </button>
            </div>
          ) : (
            <div className="bg-slate-950 px-6 py-4 flex items-center gap-3 border-b border-slate-900 text-white">
              <div className="p-2 rounded-xl bg-white/10 text-white">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider">
                  Trực tuyến: Admin Hỗ Trợ
                </h4>
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">
                  Đơn hàng: #{order?.orderCode}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="bg-slate-950 px-6 py-4 flex items-center gap-3 border-b border-slate-900 text-white">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              {activeChannel === 'CUSTOMER_ADMIN' ? <Shield size={18} /> : <Truck size={18} />}
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">
                {activeChannel === 'CUSTOMER_ADMIN' ? 'Hộp thoại Hỗ trợ Admin' : 'Hộp thoại Giao nhận Shipper'}
              </h4>
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">
                Đơn hàng: #{order?.orderCode}
              </p>
            </div>
          </div>
        )
      )}

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-4">
        {isChannelLocked ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-amber-50/30 rounded-2xl border border-dashed border-amber-200/50 m-2">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 mb-4 animate-bounce">
              <Lock size={28} />
            </div>
            <h4 className="text-amber-900 font-black uppercase tracking-wider text-sm mb-2">Hộp thoại đang khóa</h4>
            <p className="text-xs text-amber-700 font-medium max-w-xs leading-relaxed">
              Kênh chat với Shipper sẽ tự động được mở ngay khi Shipper xác nhận đã lấy hàng đi giao.
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">
            Đang tải cuộc trò chuyện...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
            <div className="p-4 bg-slate-100 rounded-full text-slate-400 mb-3"><MessageSquare size={24} /></div>
            <p className="text-xs font-bold uppercase tracking-wider">Chưa có tin nhắn nào</p>
            <p className="text-[10px] text-slate-400 mt-1">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUser?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-full`}
              >
                {/* Sender Name & Role */}
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1.5">
                    <span className="text-[10px] font-bold text-slate-700">{msg.senderName}</span>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${getRoleBadgeColor(msg.senderRole)}`}>
                      {getRoleLabel(msg.senderRole)}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[85%] shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.content}
                </div>

                {/* Timestamp */}
                <span className="text-[9px] text-slate-400 mt-1 font-semibold px-2">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      {!isChannelLocked && (
        <form onSubmit={handleSend} className="p-4 border-t bg-white flex gap-3 shadow-[0_-8px_24px_rgba(0,0,0,0.02)]">
          <input
            type="text"
            placeholder="Nhập tin nhắn..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={sending}
            className="flex-1 bg-slate-50 border border-slate-200/80 rounded-2xl px-5 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white text-slate-850"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center transition hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-200 cursor-pointer shrink-0"
          >
            <Send size={18} />
          </button>
        </form>
      )}
    </div>
  );
};

export default OrderChat;
