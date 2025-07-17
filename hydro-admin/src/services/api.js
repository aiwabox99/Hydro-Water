import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  getProfile: () => api.get('/admin/profile'),
  changePassword: (data) => api.post('/admin/change-password', data),
  getDashboard: () => api.get('/admin/dashboard'),
};

// Customers API
export const customersAPI = {
  getAll: (params = {}) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  update: (id, data) => api.put(`/customers/${id}`, data),
};

// Orders API
export const ordersAPI = {
  getAll: (params = {}) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  assignDriver: (id, driverId) => api.patch(`/orders/${id}`, { driver_id: driverId }),
  updateStatus: (id, status) => api.patch(`/orders/${id}`, { status }),
};

// Subscriptions API
export const subscriptionsAPI = {
  getAll: (params = {}) => api.get('/subscriptions', { params }),
  getById: (id) => api.get(`/subscriptions/${id}`),
  update: (id, data) => api.patch(`/subscriptions/${id}`, data),
  cancel: (id) => api.delete(`/subscriptions/${id}`),
  getOrders: (id, params = {}) => api.get(`/subscriptions/${id}/orders`, { params }),
};

// Drivers API
export const driversAPI = {
  getAll: (params = {}) => api.get('/drivers', { params }),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  getOrders: (id, params = {}) => api.get(`/drivers/${id}/orders`, { params }),
  getRoutes: (id, params = {}) => api.get(`/drivers/${id}/routes`, { params }),
};

// Routes API
export const routesAPI = {
  getAll: (params = {}) => api.get('/routes', { params }),
  getById: (id) => api.get(`/routes/${id}`),
  optimize: (data) => api.post('/routes/optimize', data),
  updateStatus: (id, status) => api.patch(`/routes/${id}`, { status }),
};

// Inventory API
export const inventoryAPI = {
  getCurrent: () => api.get('/inventory'),
  update: (data) => api.post('/inventory', data),
  add: (data) => api.post('/inventory/add', data),
  getHistory: (params = {}) => api.get('/inventory/history', { params }),
  getAlerts: () => api.get('/inventory/alerts'),
  getStats: (params = {}) => api.get('/inventory/stats', { params }),
};

// Invoices API
export const invoicesAPI = {
  getAll: (params = {}) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  send: (data) => api.post('/invoices', data),
  resend: (id) => api.post(`/invoices/${id}/resend`),
  getStats: (params = {}) => api.get('/invoices/stats/summary', { params }),
};

// Analytics API
export const analyticsAPI = {
  getOrders: (params = {}) => api.get('/analytics/orders', { params }),
  getSubscriptions: (params = {}) => api.get('/analytics/subscriptions', { params }),
  getDrivers: (params = {}) => api.get('/analytics/drivers', { params }),
  getInventory: (params = {}) => api.get('/analytics/inventory', { params }),
  getRevenue: (params = {}) => api.get('/analytics/revenue', { params }),
  getDashboard: () => api.get('/analytics/dashboard'),
};

// Admin Users API
export const adminUsersAPI = {
  getAll: () => api.get('/admin/users'),
  create: (data) => api.post('/admin/create', data),
  update: (id, data) => api.put(`/admin/users/${id}`, data),
  getSystemInfo: () => api.get('/admin/system-info'),
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

// Export configured axios instance
export default api;