import { api } from './client';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/lib/validators/employee';

export type Employee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
  dateOfJoining: string;
  departmentId?: string | null;
  designationId?: string | null;
  employmentType?: string;
  panMasked?: string;
  uan?: string;
  bank?: { accountMasked?: string; ifsc?: string; bankName?: string };
};

export type EmployeeListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: string;
  departmentId?: string;
};

export type ImportReport = {
  totalRows: number;
  inserted: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

export const employeesApi = {
  list: (params: EmployeeListParams) => api.list<Employee>('/employees', params),
  get: (id: string, reveal = false) => api.get<Employee>(`/employees/${id}`, reveal ? { reveal: 1 } : undefined),
  create: (input: EmployeeCreateInput) => api.post<Employee>('/employees', input),
  update: (id: string, input: EmployeeUpdateInput) => api.put<Employee>(`/employees/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/employees/${id}`),
  import: (file: File) => api.upload<ImportReport>('/employees/import', file),
  exportUrl: (format: 'csv' | 'xlsx', params?: EmployeeListParams) =>
    api.downloadUrl('/employees/export', { ...params, format }),
  templateUrl: () => api.downloadUrl('/employees/template'),
};
