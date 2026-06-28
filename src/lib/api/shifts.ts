import { api } from './client';
import type { ShiftCreateInput, ShiftUpdateInput } from '@/lib/validators/shift';

export type Shift = {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  weeklyOffDays: number[];
  isActive: boolean;
};

export type ShiftListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: string;
};

export const shiftsApi = {
  list: (params: ShiftListParams) => api.list<Shift>('/shifts', params),
  get: (id: string) => api.get<Shift>(`/shifts/${id}`),
  create: (input: ShiftCreateInput) => api.post<Shift>('/shifts', input),
  update: (id: string, input: ShiftUpdateInput) => api.put<Shift>(`/shifts/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/shifts/${id}`),
};
