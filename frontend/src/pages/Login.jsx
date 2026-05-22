import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Nhập đầy đủ email và mật khẩu");

    setIsSubmitting(true);
    const res = await login(email, password);
    setIsSubmitting(false);

    if (res.success) {
      toast.success("Đăng nhập thành công!");
      navigate(res.user?.role === 'ADMIN' ? '/admin' : '/');
    } else {
      toast.error(res.message || "Email hoặc mật khẩu không đúng");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Đăng nhập</h1>
          <p className="text-gray-500 mt-2">Đăng nhập vào tài khoản MiniMart của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="text"
              className="input-field"
              placeholder="Nhập email của bạn"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="Nhập mật khẩu của bạn"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Link to="/forgot-password">
              Quên mật khẩu?
            </Link>
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex justify-center items-center py-3"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
          <p>Chưa có tài khoản? <Link to="/register" className="font-bold text-brand-600 hover:underline">Đăng ký tại đây</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
