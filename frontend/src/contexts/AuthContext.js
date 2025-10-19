import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Check if we're running in Electron
const isElectron = window && window.require;

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
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  useEffect(() => {
    // Check if user is logged in on app start
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

    // ✅ Listen for app closing event in Electron
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        
        const handleAppClosing = () => {
          console.log('App is closing, logging out user...');
          logout();
        };
        
        ipcRenderer.on('app-closing', handleAppClosing);
        
        // Cleanup listener on unmount
        return () => {
          try {
            ipcRenderer.removeListener('app-closing', handleAppClosing);
          } catch (error) {
            console.error('Error removing IPC listener:', error);
          }
        };
      } catch (error) {
        console.error('Error setting up IPC listener:', error);
      }
    }
  }, [logout]);

  const login = async (username, password) => {
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', {
        username,
        password
      });
      
      if (response.data && response.data.success) {
        const userData = response.data.user;
        
        // Store user data and token
        localStorage.setItem('token', response.data.token || 'authenticated');
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        return { success: true };
      } else {
        return { success: false, message: response.data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Invalid username or password' 
      };
    }
  };

  const isAuthenticated = () => {
    return !!user;
  };

  const isAdmin = () => {
    return user && user.role === 'ADMIN';
  };

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
