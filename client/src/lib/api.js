import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // 15 second timeout for all requests
});

api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('foodrescue-auth');
  if (stored) {
    try {
      const { state } = JSON.parse(stored);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    } catch {
      // Corrupt localStorage — ignore
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid infinite redirect loop if already on login page
      if (!window.location.pathname.startsWith('/login')) {
        localStorage.removeItem('foodrescue-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
