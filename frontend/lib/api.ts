import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/api/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  getCurrentUser: () =>
    api.get('/api/auth/me'),
};

// User APIs
export const userAPI = {
  getUsers: (search?: string) =>
    api.get('/api/users', { params: { search } }),
  
  getUser: (id: string) =>
    api.get(`/api/users/${id}`),
  
  updateProfile: (data: { username?: string; avatar?: string }) =>
    api.put('/api/users/profile', data),
};

// Chatroom APIs
export const chatroomAPI = {
  getChatrooms: () =>
    api.get('/api/chatrooms'),
  
  getChatroom: (id: string) =>
    api.get(`/api/chatrooms/${id}`),
  
  createChatroom: (data: { name: string; type?: string; userIds?: string[] }) =>
    api.post('/api/chatrooms', data),
  
  joinChatroom: (id: string) =>
    api.post(`/api/chatrooms/${id}/join`),
  
  leaveChatroom: (id: string) =>
    api.post(`/api/chatrooms/${id}/leave`),
};

// Message APIs
export const messageAPI = {
  getMessages: (chatroomId: string, limit?: number, before?: string) =>
    api.get(`/api/messages/${chatroomId}`, { params: { limit, before } }),
};

export default api;