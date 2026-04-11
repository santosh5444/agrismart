import axios from 'axios';

const envApiUrl = ((import.meta as any).env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');
const isDev = (import.meta as any).env.DEV;

// Prioritize the environment variable, fallback to default Render URL for production
const API_BASE_URL = isDev
  ? '/api'
  : `${envApiUrl || 'https://agrismart-3-ixo1.onrender.com'}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // Increased timeout for ML processing
});

// Add a request interceptor to inject the JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatic Retry Logic for transient errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || !config.retryCount) {
      config.retryCount = 0;
    }
    
    config.retryCount += 1;
    
    // Only retry network errors, timeouts, or 500 errors, up to 3 times
    const shouldRetry = config.retryCount <= 3 && (!error.response || error.response.status >= 500);
    
    if (shouldRetry) {
      const delay = Math.min(1000 * Math.pow(2, config.retryCount - 1), 10000); 
      console.warn(`[API Retry] Attempt ${config.retryCount} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }
    
    return Promise.reject(error);
  }
);

export default api;
