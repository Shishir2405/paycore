import { api } from './client';
import type {
  TaxDeclarationCreateInput,
  TaxDeclarationUpdateInput,
  TaxDeclarationVerifyInput,
  RegimeCompareInput,
} from '@/lib/validators/tax';

export type TaxSection = {
  code: string;
  label?: string;
  declaredAmount: number;
  proofAmount: number;
  verified: boolean;
};

export type TaxDeclaration = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  employeeCode?: string;
  financialYear: string;
  regime: string;
  status: string;
  sections: TaxSection[];
  totalDeclared: number;
  totalProof: number;
  submittedAt?: string | null;
  createdAt?: string;
};

export type RegimeBreakdown = {
  taxableIncome: number;
  taxBeforeRebate: number;
  rebate: number;
  cess: number;
  totalTax: number;
};

export type RegimeComparison = {
  old: RegimeBreakdown;
  new: RegimeBreakdown;
  recommended: 'Old' | 'New';
  savings: number;
};

export type TaxListParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  financialYear?: string;
  status?: string;
  regime?: string;
};

export const taxApi = {
  list: (params: TaxListParams) => api.list<TaxDeclaration>('/tax/declarations', params),
  get: (id: string) => api.get<TaxDeclaration>(`/tax/declarations/${id}`),
  create: (input: TaxDeclarationCreateInput) =>
    api.post<TaxDeclaration>('/tax/declarations', input),
  update: (id: string, input: TaxDeclarationUpdateInput) =>
    api.put<TaxDeclaration>(`/tax/declarations/${id}`, input),
  verify: (id: string, input: TaxDeclarationVerifyInput = {}) =>
    api.post<TaxDeclaration>(`/tax/declarations/${id}/verify`, input),
  remove: (id: string) => api.del<{ id: string }>(`/tax/declarations/${id}`),
  compareRegimes: (input: RegimeCompareInput) =>
    api.post<RegimeComparison>('/tax/regime-compare', input),
};
