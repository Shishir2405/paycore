import { z } from 'zod';
import { JOURNAL_SOURCES } from '@/models/JournalEntry';
import { BANK_FILE_FORMATS } from '@/models/BankFile';

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// ─── Cost Centers ───────────────────────────────────────────────────────────

export const costCenterCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  code: z.string().trim().toUpperCase().min(1, 'Code is required'),
  description: z.string().trim().optional(),
  parentId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const costCenterUpdateSchema = costCenterCreateSchema.partial();

export type CostCenterCreateInput = z.infer<typeof costCenterCreateSchema>;
export type CostCenterUpdateInput = z.infer<typeof costCenterUpdateSchema>;

// ─── Journal Entries ────────────────────────────────────────────────────────

export const journalLineSchema = z.object({
  account: z.string().trim().min(1, 'Account is required'),
  debit: z.coerce.number().min(0).default(0),
  credit: z.coerce.number().min(0).default(0),
  costCenterId: z.string().optional(),
  narration: z.string().trim().optional(),
});

export const journalEntryCreateSchema = z
  .object({
    date: z.coerce.date({ message: 'Date is required' }),
    narration: z.string().trim().min(1, 'Narration is required'),
    source: z.enum(JOURNAL_SOURCES).optional(),
    payrollRunId: z.string().optional(),
    lines: z.array(journalLineSchema).min(2, 'At least two lines are required'),
  })
  .refine(
    (v) => {
      const totalDebit = v.lines.reduce((s, l) => s + (l.debit ?? 0), 0);
      const totalCredit = v.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: 'Debits and credits must balance', path: ['lines'] },
  );

export const journalEntryUpdateSchema = z.object({
  date: z.coerce.date().optional(),
  narration: z.string().trim().min(1).optional(),
  lines: z.array(journalLineSchema).min(2).optional(),
});

export type JournalLineInput = z.infer<typeof journalLineSchema>;
export type JournalEntryCreateInput = z.infer<typeof journalEntryCreateSchema>;
export type JournalEntryUpdateInput = z.infer<typeof journalEntryUpdateSchema>;

// ─── Bank Files ─────────────────────────────────────────────────────────────

export const bankFileRowSchema = z.object({
  beneficiaryRef: z.string().trim().min(1, 'Reference is required'),
  beneficiaryName: z.string().trim().min(1, 'Beneficiary name is required'),
  accountNumber: z.string().trim().min(1, 'Account number is required'),
  ifsc: z.string().trim().toUpperCase().regex(IFSC_RE, 'Invalid IFSC'),
  amount: z.coerce.number().min(0, 'Amount must be positive'),
  narration: z.string().trim().optional(),
});

export const bankFileCreateSchema = z.object({
  payrollRunId: z.string().optional(),
  format: z.enum(BANK_FILE_FORMATS).optional(),
  rows: z.array(bankFileRowSchema).min(1, 'At least one beneficiary is required'),
});

export type BankFileRowInput = z.infer<typeof bankFileRowSchema>;
export type BankFileCreateInput = z.infer<typeof bankFileCreateSchema>;
