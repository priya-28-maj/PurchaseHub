import api from './api';
import { User, Product, Repair, DashboardData, TimelineEvent, OcrResult, ApiResponse } from '../types';

export const authService = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', data),

  getProfile: () => api.get<ApiResponse<User>>('/auth/profile'),

  updateProfile: (data: { name: string }) =>
    api.put<ApiResponse<User>>('/auth/profile', data),
};

export const productService = {
  getAll: (params?: { search?: string; category?: string; warrantyStatus?: string }) =>
    api.get<ApiResponse<Product[]>>('/products', { params }),

  getById: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`),

  create: (formData: FormData) =>
    api.post<ApiResponse<Product>>('/products', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: string, formData: FormData) =>
    api.put<ApiResponse<Product>>(`/products/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (id: string) => api.delete(`/products/${id}`),

  uploadDocument: (id: string, formData: FormData) =>
    api.post<ApiResponse<Product>>(`/products/${id}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteDocument: (productId: string, docId: string) =>
    api.delete<ApiResponse<Product>>(`/products/${productId}/documents/${docId}`),

  getTimeline: (id: string) =>
    api.get<ApiResponse<TimelineEvent[]>>(`/products/${id}/timeline`),
};

export const repairService = {
  getAll: (productId: string) =>
    api.get<ApiResponse<Repair[]>>(`/products/${productId}/repairs`),

  create: (productId: string, formData: FormData) =>
    api.post<ApiResponse<Repair>>(`/products/${productId}/repairs`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (productId: string, repairId: string, formData: FormData) =>
    api.put<ApiResponse<Repair>>(`/products/${productId}/repairs/${repairId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  delete: (productId: string, repairId: string) =>
    api.delete(`/products/${productId}/repairs/${repairId}`),
};

export const dashboardService = {
  getStats: () => api.get<ApiResponse<DashboardData>>('/dashboard/stats'),
  getCategories: () => api.get<ApiResponse<string[]>>('/dashboard/categories'),
};

export const ocrService = {
  getStatus: () => api.get<ApiResponse<{ vision: boolean; ready: boolean; message?: string }>>('/ocr/status'),

  scanReceipt: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiResponse<OcrResult>>('/ocr/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
