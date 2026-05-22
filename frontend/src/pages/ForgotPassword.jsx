import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import authService from '../services/authService';

const parseQuery = (search) => new URLSearchParams(search);

const ForgotPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => parseQuery(location.search), [location.search]);

  const emailFromQuery = query.get('email') || '';
  const tokenFromQuery = query.get('token') || '';

  const [email, setEmail] = useState(emailFromQuery);
  const [token, setToken] = useState(tokenFromQuery);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [sentEmail, setSentEmail] = useState(emailFromQuery);
  const [resetLink, setResetLink] = useState('');

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setSentEmail(emailFromQuery);
    }
    if (tokenFromQuery) {
      setToken(tokenFromQuery);
    }
  }, [emailFromQuery, tokenFromQuery]);

  const hasResetLink = Boolean(email && token);

  useEffect(() => {
    const verifyToken = async () => {
      if (!hasResetLink) {
        setIsTokenValid(false);
        return;
      }

      setIsVerifyingToken(true);
      try {
        await authService.verifyResetToken(email.trim(), token.trim());
        setIsTokenValid(true);
      } catch (error) {
        setIsTokenValid(false);
        toast.error(error?.message || 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
      } finally {
        setIsVerifyingToken(false);
      }
    };

    verifyToken();
  }, [hasResetLink, email, token]);

  const handleSendResetLink = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }

    setIsSending(true);
    try {
      const response = await authService.sendPasswordResetLink(email.trim());
      const payload = response?.data || response;
      if (payload?.resetLink) {
        setResetLink(payload.resetLink);
      }
      setSentEmail(email.trim());
      toast.success('Đã gửi yêu cầu khôi phục tới Gmail của bạn. Vui lòng kiểm tra hộp thư.');
    } catch (error) {
      toast.error(error?.message || 'Không thể gửi link đặt lại mật khẩu');
    } finally {
      setIsSending(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();

    if (!email.trim() || !token.trim()) {
      toast.error('Thiếu email hoặc token đặt lại mật khẩu');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsResetting(true);
    try {
      await authService.resetPasswordByEmail(email.trim(), token.trim(), newPassword);
      toast.success('Đổi mật khẩu thành công.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error?.message || 'Token không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,_#fff,_#f8fafc)] px-4 py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-semibold text-amber-700 shadow-sm backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Đặt lại mật khẩu qua Gmail
          </div>
          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">1. Gửi link</p>
              <p className="mt-1 text-sm text-slate-600">Hệ thống gửi email reset tới Gmail đã đăng ký.</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">2. Mở link</p>
              <p className="mt-1 text-sm text-slate-600">Bấm vào link có token an toàn trong email.</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">3. Đổi mật khẩu</p>
              <p className="mt-1 text-sm text-slate-600">Tạo mật khẩu mới và đăng nhập lại.</p>
            </div>
          </div>
          <Link to="/login" className="inline-flex items-center text-sm font-semibold text-sky-700 hover:text-sky-800">
            ← Quay lại đăng nhập
          </Link>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-white/70 blur-2xl" />
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.12)] sm:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Khôi phục tài khoản</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {hasResetLink ? 'Đã nhận link reset từ Gmail.' : 'Nhập email để nhận link đặt lại mật khẩu.'}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-amber-700">
                Secure link
              </div>
            </div>

            {!hasResetLink ? (
              <form onSubmit={handleSendResetLink} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSending}
                  className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSending ? 'Đang gửi link...' : 'Gửi link đặt lại mật khẩu'}
                </button>

                {sentEmail && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    Đã gửi link khôi phục tới <strong>{sentEmail}</strong>. Vui lòng kiểm tra Hộp thư đến (và cả mục Thư rác/Spam) để tiếp tục.
                  </div>
                )}
              </form>
            ) : isVerifyingToken ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Đang xác thực link đặt lại mật khẩu...
              </div>
            ) : isTokenValid ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                  Link reset đã được xác thực cho <strong>{email}</strong>. Token sẽ hết hạn sau một khoảng thời gian ngắn.
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu mới</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isResetting}
                  className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-sky-600 to-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-200/50 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResetting ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                  Link reset không hợp lệ hoặc đã hết hạn. Vui lòng gửi lại yêu cầu quên mật khẩu.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToken('');
                    setIsTokenValid(false);
                  }}
                  className="flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Yêu cầu link mới
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
