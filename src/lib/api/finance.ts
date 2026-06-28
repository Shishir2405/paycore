import { api } from './client';
import type {
  CostCenterCreateInput,
  CostCenterUpdateInput,
  JournalEntryCreateInput,
  JournalEntryUpdateInput,
  BankFileCreateInput,
} from '@/lib/validators/finance';

// ─── Cost Centers ───────────────────────────────────────────────────────────

export type CostCenter = {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string | null;
  parentName?: string | null;
  isActive: boolean;
};

// ─── Journal Entries ────────────────────────────────────────────────────────

export type JournalLine = {
  account: string;
  debit: number;
  credit: number;
  costCenterId?: string | null;
  narration?: string;
};

export type JournalEntry = {
  id: string;
  voucherNo: string;
  date: string;
  narration: string;
  source: string;
  payrollRunId?: string | null;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
};

// ─── Bank Files ─────────────────────────────────────────────────────────────

export type BankFile = {
  id: string;
  payrollRunId?: string | null;
  format: string;
  generatedAt: string;
  fileUrl?: string;
  fileName: string;
  totalAmount: number;
  recordCount: number;
};

/** POST /bank-files returns the saved record plus the generated text content. */
export type BankFileGenerated = BankFile & { content: string };

type ListParams = Record<string, string | number | undefined>;

export const financeApi = {
  // Cost centers
  costCenters: {
    list: (params?: ListParams) => api.list<CostCenter>('/cost-centers', params),
    get: (id: string) => api.get<CostCenter>(`/cost-centers/${id}`),
    create: (input: CostCenterCreateInput) => api.post<CostCenter>('/cost-centers', input),
    update: (id: string, input: CostCenterUpdateInput) =>
      api.put<CostCenter>(`/cost-centers/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/cost-centers/${id}`),
  },

  // Journal entries
  journals: {
    list: (params?: ListParams) => api.list<JournalEntry>('/journal-entries', params),
    get: (id: string) => api.get<JournalEntry>(`/journal-entries/${id}`),
    create: (input: JournalEntryCreateInput) =>
      api.post<JournalEntry>('/journal-entries', input),
    update: (id: string, input: JournalEntryUpdateInput) =>
      api.put<JournalEntry>(`/journal-entries/${id}`, input),
    remove: (id: string) => api.del<{ id: string }>(`/journal-entries/${id}`),
    exportUrl: (params?: ListParams) =>
      api.downloadUrl('/journal-entries/export', { ...params, format: 'tally' }),
  },

  // Bank files
  bankFiles: {
    list: (params?: ListParams) => api.list<BankFile>('/bank-files', params),
    generate: (input: BankFileCreateInput) =>
      api.post<BankFileGenerated>('/bank-files', input),
  },
};
