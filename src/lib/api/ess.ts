import { api } from './client';
import type { HelpdeskCreateInput, HelpdeskRespondInput, ProfileChangeCreateInput } from '@/lib/validators/ess';

export type EssLeaveBalance = {
  leaveTypeId: string;
  leaveTypeName: string;
  entitled: number;
  used: number;
  balance: number;
};

export type EssProfile = {
  id: string;
  employeeCode: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  status: string;
  designationId?: string | null;
  departmentId?: string | null;
  dateOfJoining?: string | null;
  employmentType?: string;
  workMode?: string;
  locationName?: string;
  gender?: string;
  dateOfBirth?: string | null;
  bloodGroup?: string;
  currentAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  emergencyContacts: { name: string; relationship?: string; phone?: string; email?: string }[];
  bank?: { ifsc?: string; bankName?: string };
};

export type EssSummary = {
  profile: EssProfile;
  leave: {
    balances: EssLeaveBalance[];
    pendingRequests: number;
    approvedThisYear: number;
  };
  helpdesk: { open: number; total: number };
  pendingProfileRequests: number;
};

export type HelpdeskStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';

export type HelpdeskTicket = {
  id: string;
  ticketNumber: string;
  employeeId: string;
  subject: string;
  category: string;
  message: string;
  status: HelpdeskStatus;
  responses: { byName?: string; message: string; at: string }[];
  createdAt: string;
  updatedAt: string;
};

export type ProfileChangeRequest = {
  id: string;
  employeeId: string;
  field: string;
  newValue: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewNote?: string;
  reviewedAt?: string | null;
  createdAt: string;
};

export const essApi = {
  summary: () => api.get<EssSummary>('/ess/summary'),
  profile: () => api.get<EssProfile>('/ess/profile'),

  // Helpdesk
  listTickets: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.list<HelpdeskTicket>('/ess/helpdesk', params),
  getTicket: (id: string) => api.get<HelpdeskTicket>(`/ess/helpdesk/${id}`),
  createTicket: (input: HelpdeskCreateInput) => api.post<HelpdeskTicket>('/ess/helpdesk', input),
  respondTicket: (id: string, input: HelpdeskRespondInput) =>
    api.post<HelpdeskTicket>(`/ess/helpdesk/${id}/respond`, input),

  // Profile change requests
  listProfileRequests: (params?: { page?: number; limit?: number; status?: string }) =>
    api.list<ProfileChangeRequest>('/ess/profile-request', params),
  submitProfileRequest: (input: ProfileChangeCreateInput) =>
    api.post<ProfileChangeRequest>('/ess/profile-request', input),
};
