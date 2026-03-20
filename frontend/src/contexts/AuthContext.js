import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { cancelAllRequests } from '../services/api';

const isElectron = !!(window && window.electron);

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    cancelAllRequests();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isElectron) {
      const handleAppClosing = () => {
        console.log('App is closing, logging out user...');
        logout();
      };

      window.electron.ipcRenderer.on('app-closing', handleAppClosing);

      return () => {
        try {
          window.electron.ipcRenderer.removeListener('app-closing', handleAppClosing);
        } catch (error) {
          console.error('Error removing IPC listener:', error);
        }
      };
    }
  }, [logout]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password
      }, { timeout: 15000 });
      
      if (response.data && response.data.success) {
        const userData = response.data.user;
        
        localStorage.setItem('token', response.data.token || 'authenticated');
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'ECONNABORTED') {
        return { success: false, message: 'Server is not responding. Please try again.' };
      }
      return { 
        success: false, 
        message: error.response?.data?.message || 'Invalid username or password' 
      };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const isAdmin = useCallback(() => {
    return user && user.role === 'ADMIN';
  }, [user]);

  const value = {
    user,
    login,
    logout,
    isAuthenticated,
    isAdmin,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
