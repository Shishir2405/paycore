import { api } from './client';
import type {
  ComplianceItemCreateInput,
  ComplianceItemUpdateInput,
  PtSlabCreateInput,
  PtSlabUpdateInput,
  LwfRuleCreateInput,
  LwfRuleUpdateInput,
  CalculateInput,
} from '@/lib/validators/compliance';

export type ComplianceItem = {
  id: string;
  type: string;
  period: string;
  dueDate: string;
  status: string;
  amount: number;
  reference?: string;
  filedDate?: string | null;
  notes?: string;
};

export type PtSlab = {
  id: string;
  stateCode: string;
  fromAmount: number;
  toAmount: number | null;
  amount: number;
  frequency: string;
  month: number | null;
  isActive: boolean;
};

export type LwfRule = {
  id: string;
  stateCode: string;
  employeeAmount: number;
  employerAmount: number;
  frequency: string;
  deductionMonths: number[];
  isActive: boolean;
};

export type CalculateResult = {
  input: CalculateInput;
  pf: {
    pfWage: number;
    contributionBase: number;
    employee: number;
    employer: number;
    employerEps: number;
    employerEpf: number;
    total: number;
  };
  esi: { applicable: boolean; grossWage: number; employee: number; employer: number; total: number };
  pt: { stateCode: string; monthlyGross: number; amount: number; usedDefault: boolean };
  lwf: {
    stateCode: string;
    applicable: boolean;
    employee: number;
    employer: number;
    total: number;
    frequency: string;
  };
  totals: { employee: number; employer: number; ctcImpact: number };
};

export const complianceApi = {
  // Calendar items
  listItems: (params?: Record<string, string | number | undefined>) =>
    api.list<ComplianceItem>('/compliance/items', params),
  createItem: (input: ComplianceItemCreateInput) => api.post<ComplianceItem>('/compliance/items', input),
  updateItem: (id: string, input: ComplianceItemUpdateInput) =>
    api.put<ComplianceItem>(`/compliance/items/${id}`, input),
  removeItem: (id: string) => api.del<{ id: string }>(`/compliance/items/${id}`),

  // PT slabs
  listPtSlabs: (params?: Record<string, string | number | undefined>) =>
    api.list<PtSlab>('/compliance/pt-slabs', params),
  createPtSlab: (input: PtSlabCreateInput) => api.post<PtSlab>('/compliance/pt-slabs', input),
  updatePtSlab: (id: string, input: PtSlabUpdateInput) => api.put<PtSlab>(`/compliance/pt-slabs/${id}`, input),
  removePtSlab: (id: string) => api.del<{ id: string }>(`/compliance/pt-slabs/${id}`),

  // LWF rules
  listLwfRules: (params?: Record<string, string | number | undefined>) =>
    api.list<LwfRule>('/compliance/lwf-rules', params),
  createLwfRule: (input: LwfRuleCreateInput) => api.post<LwfRule>('/compliance/lwf-rules', input),
  updateLwfRule: (id: string, input: LwfRuleUpdateInput) => api.put<LwfRule>(`/compliance/lwf-rules/${id}`, input),
  removeLwfRule: (id: string) => api.del<{ id: string }>(`/compliance/lwf-rules/${id}`),

  // Calculator
  calculate: (input: CalculateInput) => api.post<CalculateResult>('/compliance/calculate', input),
};
