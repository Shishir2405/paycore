/**
 * Bank file domain logic: generate a NEFT/RTGS disbursement text file from a set
 * of beneficiary rows, persist a record with control totals, and audit it. The
 * actual delimited content is produced by the pure `buildNeftFile` helper.
 */
import type { BankFileDoc } from '@/models/BankFile';
import { bankFileRepository, type BankFileFilter } from '@/server/repositories/bank-file.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { BankFileCreateInput } from '@/lib/validators/finance';
import { buildNeftFile } from '@/lib/finance/bank-file';

export type PublicBankFile = {
  id: string;
  payrollRunId?: string | null;
  format: string;
  generatedAt: Date;
  fileUrl?: string;
  fileName: string;
  totalAmount: number;
  recordCount: number;
};

function toPublic(doc: Record<string, unknown>): PublicBankFile {
  const d = doc as unknown as BankFileDoc & { _id: unknown };
  return {
    id: String(d._id),
    payrollRunId: d.payrollRunId ? String(d.payrollRunId) : null,
    format: d.format,
    generatedAt: d.generatedAt,
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    totalAmount: d.totalAmount,
    recordCount: d.recordCount,
  };
}

export const bankFileService = {
  async list(ctx: AuthContext, query: ListQuery, filter: BankFileFilter) {
    const { rows, total } = await bankFileRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicBankFile> {
    const doc = await bankFileRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Bank file not found');
    return toPublic(doc as Record<string, unknown>);
  },

  /**
   * Generate the delimited file + persist a record. Returns both the saved
   * record and the raw text content so the route can stream it as a download.
   */
  async generate(ctx: AuthContext, input: BankFileCreateInput, meta?: AuditInput['meta']) {
    const format = input.format ?? 'NEFT';
    const payMode = format === 'RTGS' ? 'RTGS' : 'NEFT';
    const built = buildNeftFile(input.rows, { payMode });

    const stamp = new Date().toISOString().slice(0, 10);
    const fileName = `bank-${format.toLowerCase()}-${stamp}.txt`;

    const created = await bankFileRepository.create({
      companyId: ctx.companyId as unknown as BankFileDoc['companyId'],
      createdBy: ctx.userId as unknown as BankFileDoc['createdBy'],
      updatedBy: ctx.userId as unknown as BankFileDoc['updatedBy'],
      payrollRunId: (input.payrollRunId || null) as unknown as BankFileDoc['payrollRunId'],
      format,
      generatedAt: new Date(),
      fileName,
      totalAmount: built.totalAmount,
      recordCount: built.recordCount,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'finance',
      entityId: String(created._id),
      summary: `Generated ${format} bank file (${built.recordCount} records, ₹${built.totalAmount})`,
      meta,
    });

    return { record: toPublic(created as Record<string, unknown>), content: built.content };
  },
};
