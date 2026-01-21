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

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
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
// Collection: projects (projectId, companyId, name, createdAt)
export const projectsApi = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// Activities API
// Collection: activities (activityId, projectId, companyId, name)
export const activitiesApi = {
  getAll: (projectId) => api.get('/activities', { params: { projectId } }),
  create: (data) => api.post('/activities', data),
  delete: (id) => api.delete(`/activities/${id}`),
};

// Time Records API
// Collection: timeRecords (recordId, companyId, userId, projectId, activityId, durationMinutes, pomodoros, createdAt, updatedAt)
export const timeRecordsApi = {
  getAll: (params) => api.get('/time-records', { params }),
  getById: (id) => api.get(`/time-records/${id}`),
  create: (data) => api.post('/time-records', data),
  update: (id, data) => api.put(`/time-records/${id}`, data),
  delete: (id) => api.delete(`/time-records/${id}`),
};

// Stats API
export const statsApi = {
  getToday: () => api.get('/stats/today'),
  getWeek: () => api.get('/stats/week'),
  getByProject: () => api.get('/stats/by-project'),
};

export default api;
