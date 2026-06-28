import { api } from './client';
import type { DepartmentCreateInput, DepartmentUpdateInput } from '@/lib/validators/department';

export type Department = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  headEmployeeId?: string | null;
  budgetAnnual?: number;
  isActive: boolean;
  createdAt?: string;
};

export type DepartmentListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: string;
  parentId?: string;
};

export const departmentsApi = {
  list: (params: DepartmentListParams) => api.list<Department>('/departments', params),
  get: (id: string) => api.get<Department>(`/departments/${id}`),
  create: (input: DepartmentCreateInput) => api.post<Department>('/departments', input),
  update: (id: string, input: DepartmentUpdateInput) => api.put<Department>(`/departments/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/departments/${id}`),
};
