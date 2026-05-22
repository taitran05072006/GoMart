import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import paymentService from '../services/Payment';

const currency = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const OrderSuccess = () => {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const orderId = search.get('orderId') || '';
  const mode = search.get('mode') || 'cod';

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [copyState, setCopyState] = useState('');

  const isBankTransfer = mode === 'bank-transfer';
  const isPaid = payment?.status === 'PAID';
  const amount = payment?.amount ?? 0;
  const transferNote = payment?.transferContent || payment?.transactionCode || `GM${orderId || 'ORDER'}`;
  const qrUrl = payment?.qrCodeUrl || payment?.checkoutUrl || '';
  const bankName = payment?.bankName || 'Payo / VietcomBank';
  const accountNumber = payment?.accountNumber || '6868686868';
  const accountName = payment?.accountName || 'TUBAMart';

  const statusText = useMemo(() => {
    if (isPaid) return 'Thanh toán đã hoàn tất';
    if (payment?.status === 'FAILED') return 'Thanh toán thất bại';
    if (isBankTransfer) return 'Đang chờ xác nhận webhook';
    return 'Đơn hàng đã được tạo';
  }, [isBankTransfer, isPaid, payment?.status]);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const refreshPayment = async () => {
      try {
        const response = await paymentService.getPayment(orderId);
        const latestPayment = response?.data || response;
        if (cancelled || !latestPayment) return;

        setPayment(latestPayment);
        if (latestPayment.status === 'PAID') {
          toast.success('Thanh toán đã được webhook xác nhận thành công.');
          window.localStorage.setItem('lastOrderId', `#GM-${orderId}`);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải trạng thái thanh toán', error);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    refreshPayment();
    const intervalId = setInterval(refreshPayment, 5000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [orderId]);

  useEffect(() => {
    if (isPaid) {
      const timer = setTimeout(() => {
        navigate(`/order-success?orderId=${orderId}&mode=paid`, { replace: true });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isPaid, navigate, orderId]);

  const handleCopy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState('Đã sao chép');
      setTimeout(() => setCopyState(''), 1600);
    } catch {
      setCopyState('Không thể sao chép');
      setTimeout(() => setCopyState(''), 1600);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 p-8 text-white shadow-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-blue-200/80">Order tracking</p>
            <h1 className="mt-2 text-4xl font-black">
              {isPaid ? 'Thanh toán thành công' : 'Đơn hàng đang chờ thanh toán'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              {isBankTransfer
                ? 'Quét mã QR hoặc chuyển khoản đúng số tiền để hệ thống tự động xác nhận. Trạng thái sẽ cập nhật ngay khi webhook trả kết quả.'
                : 'Đơn hàng đã được tạo và đang chờ xử lý.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.25em] text-blue-200/70">Trạng thái</div>
            <div className="mt-1 text-2xl font-bold">{statusText}</div>
            {orderId && <div className="mt-2 text-sm text-slate-300">Mã đơn: #GM-{orderId}</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Thông tin đơn hàng</h2>
                <p className="text-sm text-slate-500">Tình trạng đơn và thanh toán được đồng bộ theo backend.</p>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {isPaid ? 'PAID' : 'PENDING'}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Phương thức</div>
                <div className="mt-1 font-semibold text-slate-900">{isBankTransfer ? 'Bank Transfer' : 'COD'}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Số tiền</div>
                <div className="mt-1 font-semibold text-slate-900">{currency.format(amount || 0)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Nội dung CK</div>
                <div className="mt-1 font-mono text-sm font-semibold text-slate-900 break-all">{transferNote}</div>
              </div>
            </div>
          </div>

          {isBankTransfer && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-amber-950">Chuyển khoản để xác nhận đơn</h3>
                  <p className="mt-1 text-sm text-amber-900/80">
                    Thanh toán đúng số tiền bên dưới. Khi backend nhận webhook từ Payo, trạng thái sẽ tự đổi sang <b>PAID</b>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(transferNote)}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  Sao chép nội dung CK
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Ngân hàng</div>
                  <div className="mt-1 font-semibold text-slate-900">{bankName}</div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-amber-700">Số tài khoản</div>
                  <div className="mt-1 font-semibold text-slate-900">{accountNumber}</div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-amber-700">Chủ tài khoản</div>
                  <div className="mt-1 font-semibold text-slate-900">{accountName}</div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-amber-700">Số tiền cần chuyển</div>
                  <div className="mt-1 text-2xl font-black text-amber-700">{currency.format(amount || 0)}</div>
                  <div className="mt-4 text-xs uppercase tracking-wide text-amber-700">Nội dung</div>
                  <div className="mt-1 break-all rounded-xl bg-amber-50 px-3 py-2 font-mono text-sm font-semibold text-slate-900">
                    {transferNote}
                  </div>
                  {copyState && <div className="mt-3 text-sm font-medium text-emerald-700">{copyState}</div>}
                </div>

                <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-900">Mã QR thanh toán</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {loading ? 'Đang tải...' : payment?.status || 'PENDING'}
                    </span>
                  </div>

                  {qrUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                      <img
                        src={qrUrl}
                        alt="Mã QR thanh toán"
                        className="mx-auto h-72 w-72 rounded-xl object-contain"
                      />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
                      Chưa có mã QR từ backend. Hệ thống sẽ hiển thị QR ngay sau khi payment được tạo.
                    </div>
                  )}

                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                    <div className="font-semibold text-slate-900">Hướng dẫn nhanh</div>
                    <ol className="mt-2 space-y-2 list-decimal pl-5">
                      <li>Quét mã QR hoặc chuyển khoản đúng số tiền.</li>
                      <li>Điền đúng nội dung chuyển khoản.</li>
                      <li>Chờ hệ thống tự động cập nhật trạng thái từ webhook.</li>
                    </ol>
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
                    <div className={`h-3 w-3 rounded-full ${isPaid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                    <div>
                      <div className="text-sm font-semibold">{isPaid ? 'Đã thanh toán' : 'Đang chờ thanh toán'}</div>
                      <div className="text-xs text-slate-300">Trang sẽ tự cập nhật khi webhook trả kết quả.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900">Tiến trình đơn hàng</h3>
            <div className="mt-5 space-y-4">
              <StepItem active completed text="Tạo đơn hàng" subText="Đơn hàng đã được tạo từ backend" />
              <StepItem active completed={isPaid} text="Thanh toán" subText={isPaid ? 'Payment đã chuyển sang PAID' : 'Đang chờ xác nhận QR/webhook'} />
              <StepItem active={isPaid} completed={isPaid} text="Chuẩn bị hàng" subText="Sẽ xử lý sau khi payment xác nhận" />
              <StepItem active={isPaid} completed={false} text="Giao hàng" subText="Sẽ được shipper xử lý tiếp" />
            </div>
          </div>

          <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl">
            <h3 className="text-lg font-bold">Trạng thái hiện tại</h3>
            <p className="mt-2 text-sm text-slate-300">{statusText}</p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Order ID</div>
              <div className="mt-1 font-mono text-lg font-semibold">{orderId ? `#GM-${orderId}` : 'N/A'}</div>
            </div>
            <div className="mt-4">
              <Link to="/profile?tab=orders" className="btn-primary inline-flex w-full justify-center px-6 py-3">
                Xem đơn hàng của tôi
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StepItem = ({ text, subText, active, completed }) => (
  <div className={`flex items-start gap-3 rounded-2xl border p-4 ${active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
    <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${completed ? 'bg-emerald-500 text-white' : active ? 'bg-blue-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
      {completed ? '✓' : '•'}
    </div>
    <div>
      <div className="font-semibold text-slate-900">{text}</div>
      <div className="text-sm text-slate-600">{subText}</div>
    </div>
  </div>
);

export default OrderSuccess;
