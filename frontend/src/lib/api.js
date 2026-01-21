import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_BASE = `${BACKEND_URL}/api`;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors - but don't auto-redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only clear local storage on 401, but don't force redirect
    // Let the AuthContext handle redirects gracefully
    if (error.response?.status === 401) {
      // Check if this is NOT a login/register request
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        // Don't redirect automatically - let components handle it
        console.warn('Auth error 401 - token may be invalid');
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Company API
export const companyApi = {
  create: (data) => api.post('/companies', data),
  getCurrent: () => api.get('/companies/current'),
};

// Projects API
export const projectsApi = {
  getAll: () => api.get('/projects'),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Activities API
export const activitiesApi = {
  getAll: (projectId) => api.get('/activities', { params: { projectId } }),
  create: (data) => api.post('/activities', data),
};

// Time Entries API
export const timeEntriesApi = {
  getAll: (params) => api.get('/time-entries', { params }),
  create: (data) => api.post('/time-entries', data),
};

// Stats API
export const statsApi = {
  getToday: () => api.get('/stats/today'),
  getWeek: () => api.get('/stats/week'),
  getByProject: () => api.get('/stats/by-project'),
};

export default api;
