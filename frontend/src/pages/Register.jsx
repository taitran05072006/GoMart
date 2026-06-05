import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const [formData, setFormData] = useState({
     name: '',
     email: '',
     phone: '',
     password: '',
     confirmPassword: '',
     province: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if(formData.password !== formData.confirmPassword) {
      return toast.error("Mật khẩu xác nhận không khớp");
    }

    setIsSubmitting(true);

    // Pass the payload exactly as the backend RegisterRequestDtoDto expects
    const payloadInfo = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password
    };

    if (!payloadInfo.name || !payloadInfo.email || !payloadInfo.phone || !payloadInfo.password) {
      setIsSubmitting(false);
      return toast.error("Vui lòng điền vào tất cả các trường bắt buộc");
    }

    const res = await register(payloadInfo);
    setIsSubmitting(false);

    if(res.success) {
      toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
      navigate('/login');
    } else {
      toast.error(res.message || "Đăng ký thất bại");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center my-8">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full max-w-xl">
        <div className="text-center mb-8">
           <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Tạo Tài khoản</h1>
           <p className="text-gray-500 mt-2">Tham gia GoMart để bắt đầu mua sắm nhanh hơn</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input type="text" name="name" placeholder='Nguyễn Văn A' className="input-field" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" name="email" placeholder='example@gmail.com' className="input-field" onChange={handleChange} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input type="tel" name="phone" placeholder='0xxxxxxxxx' className="input-field" onChange={handleChange} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
               <input type="password" name="password" placeholder='••••••••' className="input-field" onChange={handleChange} required />
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận Mật khẩu</label>
               <input type="password" name="confirmPassword" placeholder='••••••••' className="input-field" onChange={handleChange} required />
             </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full flex justify-center items-center py-3 mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang đăng ký...' : 'Tạo Tài khoản'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600">
            <p>Đã có tài khoản? <Link to="/login" className="font-bold text-brand-600 hover:underline">Đăng nhập tại đây</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
