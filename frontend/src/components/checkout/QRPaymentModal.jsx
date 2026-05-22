import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import paymentService from '../../services/Payment';

const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const QRPaymentModal = ({ paymentSession, onPaid, onCancel }) => {
  const [qrFailed, setQrFailed] = useState(false);
  const [copied, setCopied] = useState('');
  const [pollingStatus, setPollingStatus] = useState(paymentSession?.status || 'PENDING');

  const amount = paymentSession?.amount ?? 0;
  const transferNote = paymentSession?.transferContent || paymentSession?.transactionCode || `GM${paymentSession?.orderId || 'ORDER'}`;
  const qrUrl = paymentSession?.qrCodeUrl || paymentSession?.checkoutUrl || '';
  const orderId = paymentSession?.orderId;
  const bankName = paymentSession?.bankName;
  const accountNumber = paymentSession?.accountNumber;
  const accountName = paymentSession?.accountName;

  const copy = async (val) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(val);
      setTimeout(() => setCopied(''), 1800);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await paymentService.getPayment(orderId);
        const data = res?.data || res;
        if (cancelled || !data) return;
        setPollingStatus(data.status);
        if (data.status === 'PAID') {
          toast.success('🎉 Thanh toán thành công!');
          onPaid(orderId);
        }
        if (data.status === 'FAILED') {
          toast.error(data.failureReason || 'Thanh toán thất bại.');
        }
      } catch { /* ignore */ }
    };

    poll();
    const id = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [orderId, onPaid]);

  const isPaid = pollingStatus === 'PAID';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden animate-fade-in text-left text-slate-800">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80">Thanh toán chuyển khoản</p>
              <h2 className="mt-1 text-2xl font-black">Quét QR để thanh toán</h2>
            </div>
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isPaid ? 'bg-emerald-500' : 'bg-white/20 animate-pulse'}`}>
              <span className={`h-2 w-2 rounded-full ${isPaid ? 'bg-white' : 'bg-amber-200'}`} />
              {isPaid ? 'ĐÃ THANH TOÁN' : 'ĐANG CHỜ...'}
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-0">
          {/* QR Code */}
          <div className="flex flex-col items-center justify-center bg-amber-50 p-6 md:w-1/2 border-r border-amber-100">
            {isPaid ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg">✓</div>
                <p className="text-lg font-bold text-emerald-700">Thanh toán thành công!</p>
                <p className="text-sm text-slate-500 text-center">Đang chuyển đến trang đơn hàng...</p>
              </div>
            ) : qrUrl && !qrFailed ? (
              <img
                src={qrUrl}
                alt="QR thanh toán"
                onError={() => setQrFailed(true)}
                className="h-56 w-56 rounded-2xl border-4 border-white shadow-lg object-contain bg-white p-1"
              />
            ) : (
              <div className="flex h-56 w-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-100 p-4 text-center">
                <span className="text-3xl mb-2">📷</span>
                <p className="text-sm font-medium text-amber-800">Không tải được QR</p>
                <p className="text-xs text-amber-700 mt-1">Dùng thông tin bên cạnh để chuyển khoản thủ công</p>
              </div>
            )}
            <p className="mt-3 text-xs text-amber-700 text-center">Quét bằng app ngân hàng bất kỳ</p>
          </div>

          {/* Transfer Info */}
          <div className="flex flex-col gap-4 p-6 md:w-1/2">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-left">Số tiền cần chuyển</p>
              <p className="mt-1 text-3xl font-black text-amber-600">{fmt.format(amount)}</p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 text-left">Nội dung chuyển khoản</p>
              <div className="flex items-center justify-between gap-2">
                <p className="font-mono text-sm font-bold text-slate-900 break-all">{transferNote}</p>
                <button
                  type="button"
                  onClick={() => copy(transferNote)}
                  className="shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200 transition-colors"
                >
                  {copied === transferNote ? '✓' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 space-y-2 text-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-1 text-left">Thông tin ngân hàng</p>
              <div className="flex justify-between"><span className="text-slate-500">Ngân hàng</span><span className="font-semibold text-slate-800">{bankName}</span></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số tài khoản</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-semibold text-slate-800">{accountNumber}</span>
                  <button type="button" onClick={() => copy(accountNumber)} className="rounded bg-slate-200 px-1 text-xs text-slate-600 hover:bg-slate-300">
                    {copied === accountNumber ? '✓' : 'Copy'}
                  </button>
                </div>
              </div>
              <div className="flex justify-between"><span className="text-slate-500">Chủ tài khoản</span><span className="font-semibold text-slate-800">{accountName}</span></div>
            </div>

            <div className="mt-auto rounded-xl bg-blue-50 border border-blue-100 p-3 text-left">
              <div className="flex gap-2 items-start">
                <span className="text-blue-500 text-lg leading-none">ℹ️</span>
                <p className="text-xs text-blue-700">Hệ thống tự động cập nhật sau khi bạn chuyển khoản.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer pulse */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex items-center justify-between">
          {!isPaid ? (
            <>
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <p className="text-xs text-slate-500">Đang theo dõi trạng thái thanh toán...</p>
              </div>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-wider"
                >
                  Đóng
                </button>
              )}
            </>
          ) : (
            <p className="text-xs text-emerald-600 font-bold">Giao dịch đã hoàn tất.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRPaymentModal;
