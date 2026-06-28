import { api } from './client';
import type { HolidayCreateInput, HolidayUpdateInput } from '@/lib/validators/holiday';

export type Holiday = {
  id: string;
  name: string;
  date: string;
  type: string;
  state?: string;
  location?: string;
};

export type HolidayListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  type?: string;
  year?: string;
};

export const holidaysApi = {
  list: (params: HolidayListParams) => api.list<Holiday>('/holidays', params),
  get: (id: string) => api.get<Holiday>(`/holidays/${id}`),
  create: (input: HolidayCreateInput) => api.post<Holiday>('/holidays', input),
  update: (id: string, input: HolidayUpdateInput) => api.put<Holiday>(`/holidays/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/holidays/${id}`),
};
