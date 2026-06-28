import { api } from './client';
import type {
  LoanCreateInput,
  LoanUpdateInput,
  ReimbursementCreateInput,
  ReimbursementUpdateInput,
  ReimbursementDecisionInput,
  InsurancePolicyCreateInput,
  InsurancePolicyUpdateInput,
  DeductionCreateInput,
  DeductionUpdateInput,
} from '@/lib/validators/benefits';

/** Populated employee reference shared by every benefits entity. */
export type EmployeeRef = {
  id: string;
  employeeCode?: string;
  fullName?: string;
};

// ─── Loans ──────────────────────────────────────────────────────────────────

export type Loan = {
  id: string;
  employee: EmployeeRef;
  principal: number;
  interestRatePa: number;
  tenureMonths: number;
  emi: number;
  outstanding: number;
  totalInterest: number;
  startMonth: string;
  status: string;
  notes?: string;
  createdAt?: string;
};

export type LoanRepayment = {
  id: string;
  monthIndex: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  balance: number;
  paid: boolean;
};

export const loansApi = {
  list: (params?: Record<string, string | number | undefined>) => api.list<Loan>('/loans', params),
  get: (id: string) => api.get<Loan>(`/loans/${id}`),
  schedule: (id: string) => api.get<LoanRepayment[]>(`/loans/${id}/schedule`),
  create: (input: LoanCreateInput) => api.post<Loan>('/loans', input),
  update: (id: string, input: LoanUpdateInput) => api.put<Loan>(`/loans/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/loans/${id}`),
};

// ─── Reimbursements ───────────────────────────────────────────────────────────

export type Reimbursement = {
  id: string;
  employee: EmployeeRef;
  type: string;
  amount: number;
  date: string;
  status: string;
  description?: string;
  receiptUrl?: string;
  decidedAt?: string | null;
  decisionNote?: string;
  createdAt?: string;
};

export const reimbursementsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.list<Reimbursement>('/reimbursements', params),
  get: (id: string) => api.get<Reimbursement>(`/reimbursements/${id}`),
  create: (input: ReimbursementCreateInput) => api.post<Reimbursement>('/reimbursements', input),
  update: (id: string, input: ReimbursementUpdateInput) =>
    api.put<Reimbursement>(`/reimbursements/${id}`, input),
  approve: (id: string, input: ReimbursementDecisionInput = {}) =>
    api.post<Reimbursement>(`/reimbursements/${id}/approve`, input),
  reject: (id: string, input: ReimbursementDecisionInput = {}) =>
    api.post<Reimbursement>(`/reimbursements/${id}/reject`, input),
  remove: (id: string) => api.del<{ id: string }>(`/reimbursements/${id}`),
};

// ─── Insurance policies ───────────────────────────────────────────────────────

export type InsurancePolicy = {
  id: string;
  employee: EmployeeRef;
  policyNo: string;
  provider: string;
  sumInsured: number;
  premiumMonthly: number;
  isActive: boolean;
  createdAt?: string;
};

export const insurancePoliciesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.list<InsurancePolicy>('/insurance-policies', params),
  get: (id: string) => api.get<InsurancePolicy>(`/insurance-policies/${id}`),
  create: (input: InsurancePolicyCreateInput) =>
    api.post<InsurancePolicy>('/insurance-policies', input),
  update: (id: string, input: InsurancePolicyUpdateInput) =>
    api.put<InsurancePolicy>(`/insurance-policies/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/insurance-policies/${id}`),
};

// ─── Deductions ───────────────────────────────────────────────────────────────

export type Deduction = {
  id: string;
  employee: EmployeeRef;
  name: string;
  amount: number;
  recurring: boolean;
  month: string;
  isActive: boolean;
  createdAt?: string;
};

export const deductionsApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    api.list<Deduction>('/deductions', params),
  get: (id: string) => api.get<Deduction>(`/deductions/${id}`),
  create: (input: DeductionCreateInput) => api.post<Deduction>('/deductions', input),
  update: (id: string, input: DeductionUpdateInput) => api.put<Deduction>(`/deductions/${id}`, input),
  remove: (id: string) => api.del<{ id: string }>(`/deductions/${id}`),
};
