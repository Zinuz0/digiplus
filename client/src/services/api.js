// client/src/services/api.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000  // 60s timeout for AI calls
});

// Response interceptor for unified error handling
api.interceptors.response.use(
  res => res,
  err => {
    const message = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ─── Incidents ────────────────────────────────────────────────────────────────
export const incidentAPI = {
  create: (data) => api.post('/incidents', data).then(r => r.data),
  getAll: (params) => api.get('/incidents', { params }).then(r => r.data),
  getById: (id) => api.get(`/incidents/${id}`).then(r => r.data),
  update: (id, data) => api.patch(`/incidents/${id}`, data).then(r => r.data),
  analyze: (id) => api.post(`/incidents/${id}/analyze`).then(r => r.data),
  resolve: (id, data) => api.post(`/incidents/${id}/resolve`, data).then(r => r.data),
  getStats: () => api.get('/incidents/stats').then(r => r.data),
};

// ─── Knowledge ────────────────────────────────────────────────────────────────
export const knowledgeAPI = {
  getAll: (params) => api.get('/knowledge', { params }).then(r => r.data),
  getById: (id) => api.get(`/knowledge/${id}`).then(r => r.data),
  getStats: () => api.get('/knowledge/stats').then(r => r.data),
};

export default api;
