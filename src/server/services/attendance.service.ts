/**
 * Attendance domain logic: tenant scoping, overtime auto-computation against the
 * resolved shift, one-row-per-employee-per-day upserts, audit trail, and
 * CSV/Excel import/export. Route handlers call this; this layer calls the
 * repository (and the shift/employee repositories for lookups) — never Mongoose.
 */
import type { AttendanceDoc } from '@/models/Attendance';
import type { ShiftDoc } from '@/models/Shift';
import { attendanceRepository, type AttendanceFilter } from '@/server/repositories/attendance.repository';
import { shiftRepository } from '@/server/repositories/shift.repository';
import { employeeRepository } from '@/server/repositories/employee.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import { computeWorked } from '@/lib/utils/time';
import { toCsv, toXlsx, parseUpload, type Column } from '@/lib/utils/tabular';
import type { AuthContext } from '@/types';
import {
  attendanceCreateSchema,
  type AttendanceCreateInput,
  type AttendanceUpdateInput,
} from '@/lib/validators/attendance';

export type PublicAttendance = {
  id: string;
  employeeId: string | null;
  employeeName?: string;
  employeeCode?: string;
  shiftId?: string | null;
  date: Date;
  status: string;
  inTime?: string;
  outTime?: string;
  workedHours: number;
  overtimeHours: number;
  source: string;
  remarks?: string;
};

type PopulatedEmployee = { _id: unknown; employeeCode?: string; firstName?: string; lastName?: string };

function toPublic(doc: Record<string, unknown>): PublicAttendance {
  const d = doc as unknown as AttendanceDoc & { _id: unknown; employeeId: unknown };
  const emp = d.employeeId as PopulatedEmployee | string | null;
  const isPopulated = emp !== null && typeof emp === 'object';
  const empObj = isPopulated ? (emp as PopulatedEmployee) : null;

  return {
    id: String(d._id),
    employeeId: emp ? String(empObj ? empObj._id : emp) : null,
    employeeName: empObj
      ? [empObj.firstName, empObj.lastName].filter(Boolean).join(' ') || undefined
      : undefined,
    employeeCode: empObj?.employeeCode,
    shiftId: d.shiftId ? String(d.shiftId) : null,
    date: d.date,
    status: d.status,
    inTime: d.inTime,
    outTime: d.outTime,
    workedHours: d.workedHours,
    overtimeHours: d.overtimeHours,
    source: d.source,
    remarks: d.remarks,
  };
}

/** Normalize any date to midnight UTC so one record == one calendar day. */
function dayKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Resolve the shift used for overtime math (explicit > employee default). */
async function resolveShift(
  companyId: string,
  shiftId: string | null | undefined,
  employeeId: string,
): Promise<ShiftDoc | null> {
  if (shiftId) return shiftRepository.findById(companyId, shiftId);
  const emp = await employeeRepository.findById(companyId, employeeId);
  const empShiftId = emp?.shiftId ? String(emp.shiftId) : null;
  return empShiftId ? shiftRepository.findById(companyId, empShiftId) : null;
}

/** Derive workedHours + overtimeHours from punches against the shift. */
function deriveHours(
  status: string,
  inTime: string | undefined,
  outTime: string | undefined,
  shift: ShiftDoc | null,
) {
  if (status !== 'Present' && status !== 'HalfDay') return { workedHours: 0, overtimeHours: 0 };
  return computeWorked({
    inTime,
    outTime,
    shiftStart: shift?.startTime,
    shiftEnd: shift?.endTime,
    breakMinutes: shift?.breakMinutes ?? 0,
  });
}

const EXPORT_COLUMNS: Column<PublicAttendance>[] = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'employeeName', header: 'Name' },
  { key: 'date', header: 'Date' },
  { key: 'status', header: 'Status' },
  { key: 'inTime', header: 'In Time' },
  { key: 'outTime', header: 'Out Time' },
  { key: 'workedHours', header: 'Worked Hours' },
  { key: 'overtimeHours', header: 'Overtime Hours' },
  { key: 'source', header: 'Source' },
];

export const IMPORT_HEADERS = ['Employee Code', 'Date', 'Status', 'In Time', 'Out Time'];

export const attendanceService = {
  async list(ctx: AuthContext, query: ListQuery, filter: AttendanceFilter) {
    const { rows, total } = await attendanceRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string): Promise<PublicAttendance> {
    const doc = await attendanceRepository.findById(ctx.companyId, id, { populate: ['employeeId'] });
    if (!doc) throw AppError.notFound('Attendance record not found');
    return toPublic(doc as Record<string, unknown>);
  },

  /**
   * Create or update the single record for the employee's day. Overtime is
   * auto-computed from the punch window vs. the resolved shift.
   */
  async upsert(ctx: AuthContext, input: AttendanceCreateInput, meta?: AuditInput['meta']) {
    const day = dayKey(input.date);
    const inTime = input.inTime || undefined;
    const outTime = input.outTime || undefined;

    const shift = await resolveShift(ctx.companyId, input.shiftId, input.employeeId);
    const { workedHours, overtimeHours } = deriveHours(input.status, inTime, outTime, shift);

    const fields: Partial<AttendanceDoc> = {
      employeeId: input.employeeId as unknown as AttendanceDoc['employeeId'],
      shiftId: (shift ? String(shift._id) : (input.shiftId ?? null)) as unknown as AttendanceDoc['shiftId'],
      date: day,
      status: input.status,
      inTime,
      outTime,
      workedHours,
      overtimeHours,
      source: input.source ?? 'Manual',
      remarks: input.remarks,
      updatedBy: ctx.userId as unknown as AttendanceDoc['updatedBy'],
    };

    const existing = await attendanceRepository.findForDay(ctx.companyId, input.employeeId, day);
    if (existing) {
      const updated = await attendanceRepository.updateById(
        ctx.companyId,
        String((existing as { _id: unknown })._id),
        fields,
      );
      await recordAudit(ctx, {
        action: 'update',
        module: 'attendance',
        entityId: String((existing as { _id: unknown })._id),
        summary: `Updated attendance for ${day.toISOString().slice(0, 10)}`,
        meta,
      });
      return toPublic(updated as Record<string, unknown>);
    }

    const created = await attendanceRepository.create({
      ...fields,
      companyId: ctx.companyId as unknown as AttendanceDoc['companyId'],
      createdBy: ctx.userId as unknown as AttendanceDoc['createdBy'],
    });
    await recordAudit(ctx, {
      action: 'create',
      module: 'attendance',
      entityId: String(created._id),
      summary: `Marked attendance for ${day.toISOString().slice(0, 10)}`,
      meta,
    });
    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: AttendanceUpdateInput, meta?: AuditInput['meta']) {
    const before = await attendanceRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Attendance record not found');

    const employeeId = input.employeeId ?? String(before.employeeId);
    const status = input.status ?? before.status;
    const inTime = input.inTime !== undefined ? input.inTime || undefined : before.inTime;
    const outTime = input.outTime !== undefined ? input.outTime || undefined : before.outTime;
    const shiftId = input.shiftId !== undefined ? input.shiftId : before.shiftId ? String(before.shiftId) : undefined;

    const shift = await resolveShift(ctx.companyId, shiftId, employeeId);
    const { workedHours, overtimeHours } = deriveHours(status, inTime, outTime, shift);

    const patch: Partial<AttendanceDoc> = {
      updatedBy: ctx.userId as unknown as AttendanceDoc['updatedBy'],
      status,
      inTime,
      outTime,
      workedHours,
      overtimeHours,
      shiftId: (shift ? String(shift._id) : (shiftId ?? null)) as unknown as AttendanceDoc['shiftId'],
      ...(input.date !== undefined && { date: dayKey(input.date) }),
      ...(input.remarks !== undefined && { remarks: input.remarks }),
    };

    const updated = await attendanceRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Attendance record not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'attendance',
      entityId: id,
      summary: `Updated attendance ${updated.date.toISOString().slice(0, 10)}`,
      meta,
    });
    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await attendanceRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Attendance record not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'attendance',
      entityId: id,
      summary: `Deleted attendance ${removed.date.toISOString().slice(0, 10)}`,
      meta,
    });
    return { id };
  },

  async export(ctx: AuthContext, query: ListQuery, filter: AttendanceFilter, format: 'csv' | 'xlsx') {
    const { rows } = await attendanceRepository.search(
      ctx.companyId,
      { ...query, skip: 0, limit: 100_000 },
      filter,
    );
    const data = rows.map((r) => toPublic(r as Record<string, unknown>));
    await recordAudit(ctx, {
      action: 'export',
      module: 'attendance',
      summary: `Exported ${data.length} attendance rows (${format})`,
    });
    if (format === 'xlsx') return { kind: 'xlsx' as const, buffer: await toXlsx(data, EXPORT_COLUMNS, 'Attendance') };
    return { kind: 'csv' as const, content: toCsv(data, EXPORT_COLUMNS) };
  },

  /**
   * Import attendance from a spreadsheet keyed by employee code. Each row is
   * validated, the employee resolved by code, and the record upserted (so a
   * re-import corrects a day rather than duplicating it).
   */
  async import(ctx: AuthContext, file: File, meta?: AuditInput['meta']) {
    const { rows } = await parseUpload(file);
    const errors: { row: number; message: string }[] = [];
    let inserted = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const raw = rows[i];
      const rowNo = i + 2; // header is row 1
      const code = (raw['Employee Code'] ?? '').trim().toUpperCase();
      if (!code) {
        errors.push({ row: rowNo, message: 'Employee Code is required' });
        continue;
      }

      const employee = await employeeRepository.findOne(ctx.companyId, { employeeCode: code });
      if (!employee) {
        errors.push({ row: rowNo, message: `No employee with code ${code}` });
        continue;
      }

      const candidate = {
        employeeId: String((employee as { _id: unknown })._id),
        date: raw['Date'],
        status: raw['Status'] || 'Present',
        inTime: raw['In Time'] || undefined,
        outTime: raw['Out Time'] || undefined,
        source: 'Import' as const,
      };
      const parsed = attendanceCreateSchema.safeParse(candidate);
      if (!parsed.success) {
        errors.push({
          row: rowNo,
          message: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; '),
        });
        continue;
      }

      try {
        await this.upsert(ctx, parsed.data, meta);
        inserted += 1;
      } catch (err) {
        errors.push({ row: rowNo, message: err instanceof Error ? err.message : 'Insert failed' });
      }
    }

    await recordAudit(ctx, {
      action: 'import',
      module: 'attendance',
      summary: `Imported ${inserted} attendance rows (${errors.length} errors)`,
      meta,
    });

    return { totalRows: rows.length, inserted, errorCount: errors.length, errors };
  },
};
