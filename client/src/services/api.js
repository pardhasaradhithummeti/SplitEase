import axios from 'axios';

// Normalize API base URL to ensure it always includes /api exactly once
const getBaseURL = () => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl || !rawUrl.trim()) {
    return '/api';
  }
  const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
  if (cleanUrl.endsWith('/api')) {
    return cleanUrl;
  }
  return `${cleanUrl}/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercept requests to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('splitease_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized, clear token only if on a protected route or token is invalid
      if (localStorage.getItem('splitease_token') && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('splitease_token');
        localStorage.removeItem('splitease_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

