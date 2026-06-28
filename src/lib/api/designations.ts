import { api } from './client';
import type { DesignationCreateInput, DesignationUpdateInput } from '@/lib/validators/designation';

export type Designation = {
  id: string;
  name: string;
  code: string;
  description?: string;
  grade?: string;
  band?: string;
  level: number;
  ctcRange?: { min?: number; max?: number };
  isActive: boolean;
  createdAt?: string;
};

export type DesignationListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: string;
  grade?: string;
};

export const designationsApi = {
  list: (params: DesignationListParams) => api.list<Designation>('/designations', params),
  get: (id: string) => api.get<Designation>(`/designations/${id}`),
  create: (input: DesignationCreateInput) => api.post<Designation>('/designations', input),
  update: (id: string, input: DesignationUpdateInput) => api.put<Designation>(`/designations/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/designations/${id}`),
};
