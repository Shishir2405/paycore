import { api } from './client';
import type {
  SalaryStructureCreateInput,
  SalaryStructureUpdateInput,
  PayrollRunCreateInput,
  PayrollRunDecisionInput,
  ArrearCreateInput,
  ArrearUpdateInput,
  BonusCreateInput,
  BonusUpdateInput,
  FinalSettlementCreateInput,
  FinalSettlementUpdateInput,
} from '@/lib/validators/payroll';

type ListParams = Record<string, string | number | undefined>;

export type EmployeeRef = { id: string; employeeCode?: string; fullName?: string };
export type Line = { code: string; name: string; amount: number };

// ─── Salary Structures ────────────────────────────────────────────────────────

export type SalaryStructure = {
  id: string;
  employee: EmployeeRef;
  effectiveFrom: string;
  version: number;
  isActive: boolean;
  basic: number;
  heads: { payHeadId?: string | null; code: string; name: string; type: string; amount: number }[];
  gross: number;
  ctc: number;
  createdAt?: string;
};

// ─── Payroll Runs ─────────────────────────────────────────────────────────────

export type PayrollRunTotals = {
  gross: number;
  deductions: number;
  net: number;
  employerCost: number;
  headcount: number;
};

export type PayrollRun = {
  id: string;
  month: number;
  monthName: string;
  year: number;
  status: 'Draft' | 'Calculated' | 'Approved' | 'Locked';
  totals: PayrollRunTotals;
  makerId?: string | null;
  checkerId?: string | null;
  lockedAt?: string | null;
  notes?: string;
  createdAt?: string;
};

export type PayrollEntry = {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  earnings: Line[];
  deductions: Line[];
  gross: number;
  totalDeductions: number;
  net: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  lop: number;
};

export type PayrollRunDetail = {
  run: PayrollRun;
  entries: PayrollEntry[];
  skipped?: { employeeCode: string; reason: string }[];
};

// ─── Arrears / Bonuses / Final Settlements ────────────────────────────────────

export type Arrear = {
  id: string;
  employee: EmployeeRef;
  month: number;
  year: number;
  amount: number;
  reason: string;
  status: string;
  createdAt?: string;
};

export type Bonus = {
  id: string;
  employee: EmployeeRef;
  type: string;
  amount: number;
  month: number;
  year: number;
  notes?: string;
  createdAt?: string;
};

export type FinalSettlement = {
  id: string;
  employee: EmployeeRef;
  lastWorkingDay: string;
  leaveEncashment: number;
  gratuity: number;
  noticeRecovery: number;
  otherDues: number;
  netSettlement: number;
  status: string;
  approvedAt?: string | null;
  notes?: string;
  createdAt?: string;
};

export const payrollApi = {
  // Salary structures
  structures: {
    list: (params?: ListParams) => api.list<SalaryStructure>('/salary-structures', params),
    get: (id: string) => api.get<SalaryStructure>(`/salary-structures/${id}`),
    create: (input: SalaryStructureCreateInput) =>
      api.post<SalaryStructure>('/salary-structures', input),
    update: (id: string, input: SalaryStructureUpdateInput) =>
      api.put<SalaryStructure>(`/salary-structures/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/salary-structures/${id}`),
  },

  // Payroll runs
  runs: {
    list: (params?: ListParams) => api.list<PayrollRun>('/payroll-runs', params),
    get: (id: string) => api.get<PayrollRunDetail>(`/payroll-runs/${id}`),
    calculate: (input: PayrollRunCreateInput) =>
      api.post<PayrollRunDetail>('/payroll-runs', input),
    approve: (id: string, input?: PayrollRunDecisionInput) =>
      api.post<PayrollRun>(`/payroll-runs/${id}/approve`, input ?? {}),
    lock: (id: string, input?: PayrollRunDecisionInput) =>
      api.post<PayrollRun>(`/payroll-runs/${id}/lock`, input ?? {}),
  },

  // Arrears
  arrears: {
    list: (params?: ListParams) => api.list<Arrear>('/arrears', params),
    get: (id: string) => api.get<Arrear>(`/arrears/${id}`),
    create: (input: ArrearCreateInput) => api.post<Arrear>('/arrears', input),
    update: (id: string, input: ArrearUpdateInput) => api.put<Arrear>(`/arrears/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/arrears/${id}`),
  },

  // Bonuses
  bonuses: {
    list: (params?: ListParams) => api.list<Bonus>('/bonuses', params),
    get: (id: string) => api.get<Bonus>(`/bonuses/${id}`),
    create: (input: BonusCreateInput) => api.post<Bonus>('/bonuses', input),
    update: (id: string, input: BonusUpdateInput) => api.put<Bonus>(`/bonuses/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/bonuses/${id}`),
  },

  // Final settlements
  settlements: {
    list: (params?: ListParams) => api.list<FinalSettlement>('/final-settlements', params),
    get: (id: string) => api.get<FinalSettlement>(`/final-settlements/${id}`),
    create: (input: FinalSettlementCreateInput) =>
      api.post<FinalSettlement>('/final-settlements', input),
    update: (id: string, input: FinalSettlementUpdateInput) =>
      api.put<FinalSettlement>(`/final-settlements/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/final-settlements/${id}`),
  },
};

/** Convenience alias for the salary-structure endpoints (used by the form pages). */
export const salaryStructuresApi = payrollApi.structures;
