import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Chỉ cho phép 2 vai trò quản trị hợp lệ
  if (!(user.role === 'SUPER_ADMIN' || user.role === 'STORE_ADMIN')) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;