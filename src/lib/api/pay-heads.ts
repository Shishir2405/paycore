import { api } from './client';
import type { PayHeadCreateInput, PayHeadUpdateInput } from '@/lib/validators/pay-head';

export type PayHead = {
  id: string;
  name: string;
  code: string;
  type: 'Earning' | 'Deduction';
  calcType: 'Flat' | 'PercentOfBasic' | 'PercentOfGross' | 'Formula';
  value: number;
  formula?: string;
  taxable: boolean;
  isStatutory: boolean;
  affectsPf: boolean;
  affectsEsi: boolean;
  displayOrder: number;
  isActive: boolean;
};

export type PayHeadListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  type?: string;
  calcType?: string;
  isActive?: string;
};

export const payHeadsApi = {
  list: (params: PayHeadListParams) => api.list<PayHead>('/pay-heads', params),
  get: (id: string) => api.get<PayHead>(`/pay-heads/${id}`),
  create: (input: PayHeadCreateInput) => api.post<PayHead>('/pay-heads', input),
  update: (id: string, input: PayHeadUpdateInput) => api.put<PayHead>(`/pay-heads/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/pay-heads/${id}`),
};
