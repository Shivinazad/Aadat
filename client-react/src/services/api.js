import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
});

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 && (error.response.data?.msg?.includes('suspended') || error.response.data?.message?.includes('suspended'))) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: error.response.data.msg || error.response.data.message, type: 'error' } }));
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      const publicPaths = ['/', '/login', '/register', '/auth/callback'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => api.post('/users/register', userData),
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  getProfile: () => api.get('/users/me'),
  updateProfile: (data) => api.put('/users/profile', data, {
    headers: {
      'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
    }
  }),
  getAchievements: () => api.get('/users/me/achievements'),
  getStats: () => api.get('/stats/landing'),
  getUserStats: (id) => id ? api.get(`/users/${id}/stats`) : api.get('/users/stats'),
  getUserById: (id) => api.get(`/users/${id}`),
  getUserAchievements: (id) => api.get(`/users/${id}/achievements`),
};

export const achievementsAPI = {
  getAll: () => api.get('/achievements'),
};

export const habitsAPI = {
  getAll: () => api.get('/habits'),
  create: (habitData) => api.post('/habits', habitData),
  update: (id, habitData) => api.put(`/habits/${id}`, habitData),
  delete: (id) => api.delete(`/habits/${id}`),
  generateRoadmap: (data) => api.post('/habits/generate-roadmap', data),
  exportCSV: () => api.get('/habits/export', { responseType: 'blob' }),
};

export const postsAPI = {
  getAll: () => api.get('/posts'),
  getUserPosts: (userId) => api.get(`/posts/user/${userId}`),
  create: (postData) => api.post('/posts', postData, {
    headers: {
      'Content-Type': postData instanceof FormData ? 'multipart/form-data' : 'application/json'
    }
  }),
  like: (postId) => api.post(`/posts/${postId}/like`),
  getCommunityStats: () => api.get('/posts/stats/community'),
  comment: (postId, content) => api.post(`/posts/${postId}/comments`, { content }),
  getComments: (postId) => api.get(`/posts/${postId}/comments`),
};

export const leaderboardAPI = {
  getTop: () => api.get('/leaderboard'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/mark-read'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
};

export const inviteAPI = {
  sendInvite: (email) => api.post('/invite', { email }),
};

export default api;
