import { api } from './client';
import type { AttendanceCreateInput, AttendanceUpdateInput } from '@/lib/validators/attendance';

export type Attendance = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  employeeCode?: string;
  shiftId?: string | null;
  date: string;
  status: string;
  inTime?: string;
  outTime?: string;
  workedHours: number;
  overtimeHours: number;
  source: string;
  remarks?: string;
};

export type AttendanceListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  employeeId?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type ImportReport = {
  totalRows: number;
  inserted: number;
  errorCount: number;
  errors: { row: number; message: string }[];
};

export const attendanceApi = {
  list: (params: AttendanceListParams) => api.list<Attendance>('/attendance', params),
  get: (id: string) => api.get<Attendance>(`/attendance/${id}`),
  create: (input: AttendanceCreateInput) => api.post<Attendance>('/attendance', input),
  update: (id: string, input: AttendanceUpdateInput) => api.put<Attendance>(`/attendance/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/attendance/${id}`),
  import: (file: File) => api.upload<ImportReport>('/attendance/import', file),
  exportUrl: (format: 'csv' | 'xlsx', params?: AttendanceListParams) =>
    api.downloadUrl('/attendance/export', { ...params, format }),
};
