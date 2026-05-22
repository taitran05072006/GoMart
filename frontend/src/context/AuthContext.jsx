import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Initialize from local storage on mount
  useEffect(() => {
    const storedUserString = localStorage.getItem('user');
    console.log('AuthContext: Initializing...', { user: storedUserString });
    try {
      if (storedUserString) {
        const parsedUser = JSON.parse(storedUserString);
        setUser(parsedUser);
        console.log('AuthContext: User loaded', parsedUser.id);
      } else {
        console.log('AuthContext: No user in storage');
      }
    } catch (error) {
      console.error("AuthContext: Parse error", error);
      logout();
    } finally {
      console.log('AuthContext: Initialization finished');
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if(response && response.data && response.success !== false) {
        const userData = response.data;
        localStorage.setItem('token', 'session-token-for-' + userData.id);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        return { success: true, user: userData };
      }
      return { success: false, message: response.message || 'Lỗi hệ thống' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      if(response && response.success !== false) {
          return { success: true };
      }
      return { success: false, message: response.message };
    } catch (error) {
       return { success: false, message: error.message };
    }
  };


  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f8fafc',
      }}>
        <div style={{
          width: 48,
          height: 48,
          border: '4px solid #e2e8f0',
          borderTopColor: '#3b82f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const refreshUser = async () => {
    if (!user?.id) return;
    try {
      const response = await authService.getUserById(user.id);
      if (response && response.data) {
        const userData = response.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (error) {
      console.error("AuthContext: Failed to refresh user", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};
