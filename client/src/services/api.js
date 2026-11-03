import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
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

