import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api';

function getCookie(name) {
  try {
    return document.cookie.split('; ').reduce((r, v) => {
      const parts = v.split('=');
      return parts[0] === name ? decodeURIComponent(parts[1]) : r;
    }, '');
  } catch (e) {
    return '';
  }
}

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('paycraft_token') || getCookie('paycraft_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        localStorage.removeItem('paycraft_token');
        localStorage.removeItem('paycraft_merchant');
        document.cookie = 'paycraft_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'paycraft_merchant=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
