import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Generate and attach a unique request nonce for replay protection
  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  config.headers['X-Request-Nonce'] = nonce;

  return config;
});

export default api;
