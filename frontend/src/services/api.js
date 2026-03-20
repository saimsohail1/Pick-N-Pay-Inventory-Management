import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const activeControllers = new Set();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (!config.signal) {
      const controller = new AbortController();
      config.signal = controller.signal;
      config._abortController = controller;
      activeControllers.add(controller);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    if (response.config._abortController) {
      activeControllers.delete(response.config._abortController);
    }
    return response;
  },
  (error) => {
    if (error.config?._abortController) {
      activeControllers.delete(error.config._abortController);
    }
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
    }
    return Promise.reject(error);
  }
);

export const cancelAllRequests = () => {
  activeControllers.forEach(controller => {
    try { controller.abort(); } catch (e) { /* already aborted */ }
  });
  activeControllers.clear();
};

// Items API
export const itemsAPI = {
  getAll: () => api.get('/items'),
  getAllPaginated: (page = 0, size = 100, sortBy = 'id', sortDir = 'desc') => 
    api.get(`/items?page=${page}&size=${size}&sortBy=${sortBy}&sortDir=${sortDir}`),
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

// Attendance API
export const attendanceAPI = {
  markTimeIn: (userId, date, timeIn) => api.post('/attendances/time-in', { userId, date, timeIn }),
  markTimeOut: (userId, date, timeOut) => api.post('/attendances/time-out', { userId, date, timeOut }),
  updateAttendance: (id, timeIn, timeOut) => api.put(`/attendances/${id}`, { timeIn, timeOut }),
  getByUserAndDate: (userId, date) => api.get(`/attendances/user/${userId}/date/${date}`),
  getByUserAndDateRange: (userId, startDate, endDate) => 
    api.get(`/attendances/user/${userId}/date-range?startDate=${startDate}&endDate=${endDate}`),
  getByDate: (date) => api.get(`/attendances/date/${date}`),
  getByDateRange: (startDate, endDate) => 
    api.get(`/attendances/date-range?startDate=${startDate}&endDate=${endDate}`),
  getWeeklyReportForUser: (userId, weekStart) => 
    api.get(`/attendances/weekly-report/user/${userId}?weekStart=${weekStart}`),
  getAllUsersWeeklyReport: (weekStart) => 
    api.get(`/attendances/weekly-report?weekStart=${weekStart}`),
  getEmployeeReportByDateRange: (startDate, endDate) => 
    api.get(`/attendances/employee-report?startDate=${startDate}&endDate=${endDate}`),
  getWeekStart: (date) => api.get(`/attendances/week-start?date=${date}`),
};

export default api;
