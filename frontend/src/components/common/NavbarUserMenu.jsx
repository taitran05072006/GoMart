import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const NavbarUserMenu = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="flex gap-4">
        <Link to="/login">Đăng nhập</Link>
        <Link to="/register" className="bg-yellow-400 px-3 py-1 rounded-full text-black">
          Đăng ký
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group flex items-center gap-2 cursor-pointer">
  <User size={24} />
  <div className="flex flex-col items-start leading-none">
    <span className="hidden md:inline font-bold text-sm">{user?.name || 'Hồ sơ'}</span>

  </div>

  <div
    className="absolute right-0 top-full mt-2 w-52 bg-white text-black rounded-xl shadow-lg z-50
               opacity-0 invisible translate-y-2
               group-hover:opacity-100 group-hover:visible group-hover:translate-y-0
               transition-all duration-200"
  >
    <Link className="block px-4 py-2 hover:bg-gray-100" to="/profile">
      Hồ sơ
    </Link>

    <Link className="block px-4 py-2 hover:bg-gray-100" to="/profile?tab=orders">
      Đơn hàng
    </Link>

    {['SUPER_ADMIN', 'STORE_ADMIN'].includes(user?.role) && (
      <Link className="block px-4 py-2 hover:bg-gray-100 font-semibold text-green-600" to="/admin">
        Trang quản trị
      </Link>
    )}

    {user?.role === 'SHIPPER' && (
      <Link className="block px-4 py-2 hover:bg-gray-100 font-semibold text-blue-600" to="/shipper/orders">
        Trang giao hàng
      </Link>
    )}

    <div className="border-t my-1"></div>

    <button
      onClick={handleLogout}
      className="w-full text-left px-4 py-2 hover:bg-red-100 text-red-600"
    >
      Đăng xuất
    </button>
  </div>
</div>
  );
};

export default NavbarUserMenu;