import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

// Cookie Helpers
export function setCookie(name, value, days = 30) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('Could not set cookie:', e);
  }
}

export function getCookie(name) {
  try {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  } catch (e) {
    return '';
  }
}

export function removeCookie(name) {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {
    console.warn('Could not remove cookie:', e);
  }
}

export function AuthProvider({ children }) {
  const [merchant, setMerchant] = useState(() => {
    const saved = localStorage.getItem('paycraft_merchant') || getCookie('paycraft_merchant');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('paycraft_token') || getCookie('paycraft_token') || null;
  });

  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    const activeToken = token || localStorage.getItem('paycraft_token') || getCookie('paycraft_token');
    if (!activeToken) return;
    try {
      const res = await api.get('/auth/me');
      setMerchant(res.data.merchant);
      localStorage.setItem('paycraft_merchant', JSON.stringify(res.data.merchant));
      setCookie('paycraft_merchant', JSON.stringify(res.data.merchant));
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      const activeToken = token || localStorage.getItem('paycraft_token') || getCookie('paycraft_token');
      if (activeToken) {
        try {
          const res = await api.get('/auth/me');
          setMerchant(res.data.merchant);
          localStorage.setItem('paycraft_merchant', JSON.stringify(res.data.merchant));
          setCookie('paycraft_merchant', JSON.stringify(res.data.merchant));
        } catch (err) {
          logout();
        }
      }
      setLoading(false);
    }
    checkAuth();
  }, [token]);

  const login = (newToken, newMerchant) => {
    setToken(newToken);
    setMerchant(newMerchant);
    
    // Save to LocalStorage
    localStorage.setItem('paycraft_token', newToken);
    localStorage.setItem('paycraft_merchant', JSON.stringify(newMerchant));

    // Save to Browser Cookies
    setCookie('paycraft_token', newToken, 30);
    setCookie('paycraft_merchant', JSON.stringify(newMerchant), 30);
  };

  const loginWithGoogle = async (payload) => {
    const res = await api.post('/auth/google', payload);
    login(res.data.token, res.data.merchant);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setMerchant(null);
    localStorage.removeItem('paycraft_token');
    localStorage.removeItem('paycraft_merchant');
    removeCookie('paycraft_token');
    removeCookie('paycraft_merchant');
  };

  return (
    <AuthContext.Provider value={{ merchant, token, login, loginWithGoogle, logout, refreshProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

