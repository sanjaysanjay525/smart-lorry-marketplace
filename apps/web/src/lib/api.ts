import axios from 'axios';

const API_URL = 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header to request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration and refreshing
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Check if 401 and not retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorCode = error.response?.data?.error?.code;
      
      // If access token expired, try to refresh
      if (errorCode === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');
        
        if (refreshToken) {
          try {
            const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
            const { accessToken, refreshToken: newRefreshToken } = res.data.data;
            
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', newRefreshToken);
            
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh token expired or invalid -> log out
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);
