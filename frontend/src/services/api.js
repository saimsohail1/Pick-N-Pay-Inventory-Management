import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Items API
export const itemsAPI = {
  getAll: () => api.get('/items'),
  getById: (id) => api.get(`/items/${id}`),
  getByBarcode: (barcode) => api.get(`/items/barcode/${barcode}`),
  getItemsByCategory: (categoryId) => api.get(`/items/category/${categoryId}`),
  search: (name) => api.get(`/items/search?name=${name}`),
  getAvailable: () => api.get('/items/available'),
  getLowStock: (threshold = 10) => api.get(`/items/low-stock?threshold=${threshold}`),
  create: (item) => api.post('/items', item),
  update: (id, item) => api.put(`/items/${id}`, item),
  delete: (id) => api.delete(`/items/${id}`),
  updateStock: (id, quantityChange) => api.patch(`/items/${id}/stock?quantityChange=${quantityChange}`),
};

// Sales API
export const salesAPI = {
  getAll: () => api.get('/sales'),
  getById: (id) => api.get(`/sales/${id}`),
  getByDateRange: (startDate, endDate) => 
    api.get(`/sales/date-range?startDate=${startDate}&endDate=${endDate}`),
  getSalesByDateRange: (startDate, endDate) => 
    api.get(`/sales/date-range?startDate=${startDate}&endDate=${endDate}`),
  create: (sale) => api.post('/sales', sale),
  delete: (id) => api.delete(`/sales/${id}`),
  getTotalByDateRange: (startDate, endDate) => 
    api.get(`/sales/total?startDate=${startDate}&endDate=${endDate}`),
  getDailyReport: (date) => api.get(`/sales/daily-report?date=${date}`),
  getDailyReportByUser: (date, userId) => api.get(`/sales/daily-report/user?date=${date}&userId=${userId}`),
  getDailyReportByUserAndDateRange: (startDate, endDate, userId) => 
    api.get(`/sales/daily-report/user/date-range?startDate=${startDate}&endDate=${endDate}&userId=${userId}`),
  getDailyReportByDateRangeForAdmin: (startDate, endDate) => 
    api.get(`/sales/daily-report/admin/date-range?startDate=${startDate}&endDate=${endDate}`),
  
  // New role-based endpoints
  getTodaySales: (userId, isAdmin) => 
    api.get(`/sales/today?userId=${userId}&isAdmin=${isAdmin}`),
  getSalesByUserId: (userId) => api.get(`/sales/user/${userId}`),
  getSalesByUserIdAndDateRange: (userId, startDate, endDate) => 
    api.get(`/sales/user/${userId}/date-range?startDate=${startDate}&endDate=${endDate}`),
  getSalesByDateRangeForAdmin: (startDate, endDate) =>
    api.get(`/sales/admin/date-range?startDate=${startDate}&endDate=${endDate}`),
  update: (id, sale) => api.put(`/sales/${id}`, sale),
  delete: (id) => api.delete(`/sales/${id}`),
};

// Company Settings API
export const companySettingsAPI = {
  get: () => api.get('/company-settings'),
  update: (settings) => api.put('/company-settings', settings),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getAllIncludingInactive: () => api.get('/categories/all'),
  getAllWithItems: () => api.get('/categories/with-items'),
  getById: (id) => api.get(`/categories/${id}`),
  getCategoryItems: (id) => api.get(`/categories/${id}/items`),
  getItemByBarcode: (barcode) => api.get(`/categories/items/barcode/${barcode}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  initialize: () => api.post('/categories/initialize'),
};

// Authentication API - Removed for custom implementation

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  getByUsername: (username) => api.get(`/users/username/${username}`),
  getByRole: (role) => api.get(`/users/role/${role}`),
  getActive: () => api.get('/users/active'),
  create: (user) => api.post('/users', user),
  update: (id, user) => api.put(`/users/${id}`, user),
  delete: (id) => api.delete(`/users/${id}`),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  initialize: () => api.post('/users/initialize'),
  getRoles: () => api.get('/users/roles'),
};

export default api;
