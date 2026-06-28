import { api } from './client';
import type {
  LeaveTypeCreateInput,
  LeaveTypeUpdateInput,
  LeaveRequestCreateInput,
  LeaveRequestUpdateInput,
  LeaveDecisionInput,
} from '@/lib/validators/leave';

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  description?: string;
  annualQuota: number;
  paid: boolean;
  carryForward: boolean;
  maxCarryForward: number;
  isActive: boolean;
};

export type LeaveRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type LeaveRequest = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  leaveTypeId: string | null;
  leaveTypeName?: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason?: string;
  status: LeaveRequestStatus;
  approverId?: string | null;
  decidedAt?: string | null;
  decisionNote?: string;
};

export type LeaveBalance = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  leaveTypeId: string | null;
  leaveTypeName?: string;
  year: number;
  entitled: number;
  used: number;
  balance: number;
};

export const leaveTypesApi = {
  create: (input: LeaveTypeCreateInput) => api.post<LeaveType>('/leave-types', input),
  update: (id: string, input: LeaveTypeUpdateInput) => api.put<LeaveType>(`/leave-types/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/leave-types/${id}`),
};

export const leaveRequestsApi = {
  create: (input: LeaveRequestCreateInput) => api.post<LeaveRequest>('/leave-requests', input),
  update: (id: string, input: LeaveRequestUpdateInput) =>
    api.put<LeaveRequest>(`/leave-requests/${id}`, input),
  approve: (id: string, input?: LeaveDecisionInput) =>
    api.post<LeaveRequest>(`/leave-requests/${id}/approve`, input ?? {}),
  reject: (id: string, input?: LeaveDecisionInput) =>
    api.post<LeaveRequest>(`/leave-requests/${id}/reject`, input ?? {}),
  remove: (id: string) => api.del<{ id: string }>(`/leave-requests/${id}`),
};
