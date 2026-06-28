/**
 * Journal entry domain logic: balanced-line totals, voucher numbering, audit
 * trail, and Tally XML export. Routes call this; this layer calls the repository
 * and the pure `buildTallyXml` helper — never Mongoose directly.
 */
import type { JournalEntryDoc, JournalLine } from '@/models/JournalEntry';
import {
  journalEntryRepository,
  type JournalEntryFilter,
} from '@/server/repositories/journal-entry.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { JournalEntryCreateInput, JournalEntryUpdateInput } from '@/lib/validators/finance';
import { buildTallyXml, type TallyEntry } from '@/lib/finance/tally';

export type PublicJournalLine = {
  account: string;
  debit: number;
  credit: number;
  costCenterId?: string | null;
  narration?: string;
};

export type PublicJournalEntry = {
  id: string;
  voucherNo: string;
  date: Date;
  narration: string;
  source: string;
  payrollRunId?: string | null;
  lines: PublicJournalLine[];
  totalDebit: number;
  totalCredit: number;
};

function toPublicLine(line: JournalLine): PublicJournalLine {
  return {
    account: line.account,
    debit: line.debit,
    credit: line.credit,
    costCenterId: line.costCenterId ? String(line.costCenterId) : null,
    narration: line.narration,
  };
}

function toPublic(doc: Record<string, unknown>): PublicJournalEntry {
  const d = doc as unknown as JournalEntryDoc & { _id: unknown };
  return {
    id: String(d._id),
    voucherNo: d.voucherNo,
    date: d.date,
    narration: d.narration,
    source: d.source,
    payrollRunId: d.payrollRunId ? String(d.payrollRunId) : null,
    lines: (d.lines ?? []).map(toPublicLine),
    totalDebit: d.totalDebit,
    totalCredit: d.totalCredit,
  };
}

/** Sum debit/credit columns, rounded to paise. */
function totals(lines: { debit: number; credit: number }[]) {
  const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  return {
    totalDebit: round(lines.reduce((s, l) => s + (l.debit ?? 0), 0)),
    totalCredit: round(lines.reduce((s, l) => s + (l.credit ?? 0), 0)),
  };
}

function toSchemaLines(lines: JournalEntryCreateInput['lines']): JournalLine[] {
  return lines.map((l) => ({
    account: l.account,
    debit: l.debit ?? 0,
    credit: l.credit ?? 0,
    costCenterId: (l.costCenterId || null) as unknown as JournalLine['costCenterId'],
    narration: l.narration,
  }));
}

export const journalEntryService = {
  async list(ctx: AuthContext, query: ListQuery, filter: JournalEntryFilter) {
    const { rows, total } = await journalEntryRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicJournalEntry> {
    const doc = await journalEntryRepository.findById(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Journal entry not found');
    return toPublic(doc as Record<string, unknown>);
  },

  async create(ctx: AuthContext, input: JournalEntryCreateInput, meta?: AuditInput['meta']) {
    const voucherNo = await journalEntryRepository.nextVoucherNo(ctx.companyId);
    const lines = toSchemaLines(input.lines);
    const { totalDebit, totalCredit } = totals(lines);

    const created = await journalEntryRepository.create({
      companyId: ctx.companyId as unknown as JournalEntryDoc['companyId'],
      createdBy: ctx.userId as unknown as JournalEntryDoc['createdBy'],
      updatedBy: ctx.userId as unknown as JournalEntryDoc['updatedBy'],
      voucherNo,
      date: input.date,
      narration: input.narration,
      source: input.source ?? 'Manual',
      payrollRunId: (input.payrollRunId || null) as unknown as JournalEntryDoc['payrollRunId'],
      lines,
      totalDebit,
      totalCredit,
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'finance',
      entityId: String(created._id),
      summary: `Created journal entry ${voucherNo}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: JournalEntryUpdateInput, meta?: AuditInput['meta']) {
    const before = await journalEntryRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Journal entry not found');

    const patch: Partial<JournalEntryDoc> = {
      updatedBy: ctx.userId as unknown as JournalEntryDoc['updatedBy'],
      ...(input.date !== undefined && { date: input.date }),
      ...(input.narration !== undefined && { narration: input.narration }),
    };

    if (input.lines !== undefined) {
      const lines = toSchemaLines(input.lines);
      const { totalDebit, totalCredit } = totals(lines);
      patch.lines = lines;
      patch.totalDebit = totalDebit;
      patch.totalCredit = totalCredit;
    }

    const updated = await journalEntryRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Journal entry not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'finance',
      entityId: id,
      summary: `Updated journal entry ${updated.voucherNo}`,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await journalEntryRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Journal entry not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'finance',
      entityId: id,
      summary: `Deleted journal entry ${removed.voucherNo}`,
      meta,
    });
    return { id };
  },

  /** Export the filtered journal set as a Tally-import XML string. */
  async exportTally(ctx: AuthContext, query: ListQuery, filter: JournalEntryFilter): Promise<string> {
    const { rows } = await journalEntryRepository.search(
      ctx.companyId,
      { ...query, skip: 0, limit: 100_000 },
      filter,
    );

    const entries: TallyEntry[] = rows.map((r) => {
      const d = r as unknown as JournalEntryDoc;
      return {
        voucherNo: d.voucherNo,
        date: d.date,
        narration: d.narration,
        lines: (d.lines ?? []).map((l) => ({
          account: l.account,
          debit: l.debit,
          credit: l.credit,
          costCenter: l.costCenterId ? String(l.costCenterId) : null,
        })),
      };
    });

    await recordAudit(ctx, {
      action: 'export',
      module: 'finance',
      summary: `Exported ${entries.length} journal entries to Tally XML`,
    });

    return buildTallyXml(entries);
  },
};
