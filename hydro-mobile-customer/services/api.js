import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Configuration
const API_BASE_URL = 'http://localhost:3000/api'; // Change this to your backend URL

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('customer_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear stored auth data
      await AsyncStorage.multiRemove(['customer_token', 'customer_data']);
      // Redirect to login would be handled by the auth context
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/customers/register', userData),
  verifyOTP: (data) => api.post('/customers/verify-otp', data),
  resendOTP: (phone) => api.post('/customers/resend-otp', { phone }),
  login: (credentials) => api.post('/customers/login', credentials),
  getProfile: () => api.get('/customers/profile'),
  updateProfile: (data) => api.put('/customers/profile', data),
};

// Addresses API
export const addressesAPI = {
  getAll: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  delete: (id) => api.delete(`/addresses/${id}`),
  setDefault: (id) => api.patch(`/addresses/${id}/default`),
};

// Orders API
export const ordersAPI = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  track: (id) => api.get(`/orders/${id}/track`),
  rate: (id, rating) => api.post(`/orders/${id}/rate`, { rating }),
};

// Subscriptions API
export const subscriptionsAPI = {
  getAll: () => api.get('/subscriptions'),
  getById: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.patch(`/subscriptions/${id}`, data),
  cancel: (id) => api.delete(`/subscriptions/${id}`),
  pause: (id) => api.patch(`/subscriptions/${id}/pause`),
  resume: (id) => api.patch(`/subscriptions/${id}/resume`),
};

// Payments API
export const paymentsAPI = {
  createPayment: (data) => api.post('/payments', data),
  getPaymentMethods: () => api.get('/payments/methods'),
  addPaymentMethod: (data) => api.post('/payments/methods', data),
  removePaymentMethod: (id) => api.delete(`/payments/methods/${id}`),
  getPaymentHistory: (params = {}) => api.get('/payments/history', { params }),
};

// Notifications API
export const notificationsAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  updatePushToken: (token) => api.post('/notifications/push-token', { token }),
};

// Utility functions
export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;
    
    if (status === 400 && data.errors) {
      // Validation errors
      return data.errors.map(err => err.msg).join(', ');
    }
    
    if (data.error) {
      return data.error;
    }
    
    return `Server error: ${status}`;
  }
  
  if (error.request) {
    // Network error
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred';
};

// Helper functions for local storage
export const storageHelper = {
  setCustomerToken: async (token) => {
    await AsyncStorage.setItem('customer_token', token);
  },
  
  getCustomerToken: async () => {
    return await AsyncStorage.getItem('customer_token');
  },
  
  setCustomerData: async (data) => {
    await AsyncStorage.setItem('customer_data', JSON.stringify(data));
  },
  
  getCustomerData: async () => {
    const data = await AsyncStorage.getItem('customer_data');
    return data ? JSON.parse(data) : null;
  },
  
  clearAuth: async () => {
    await AsyncStorage.multiRemove(['customer_token', 'customer_data']);
  },
  
  setOnboardingComplete: async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true');
  },
  
  isOnboardingComplete: async () => {
    const complete = await AsyncStorage.getItem('onboarding_complete');
    return complete === 'true';
  },
};

export default api;