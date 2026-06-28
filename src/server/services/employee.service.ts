/**
 * Employee domain logic: tenant scoping, sensitive-field encryption + masking,
 * audit trail, and CSV/Excel import/export. Route handlers call this; this layer
 * calls the repository — never Mongoose directly.
 */
import type { EmployeeDoc } from '@/models/Employee';
import { employeeRepository, type EmployeeFilter } from '@/server/repositories/employee.repository';
import { encryptField, decryptField, maskSensitive } from '@/lib/utils/crypto';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { computeDiff } from '@/lib/audit/diff';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta } from '@/lib/utils/pagination';
import type { ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type { EmployeeCreateInput, EmployeeUpdateInput } from '@/lib/validators/employee';
import { toCsv, toXlsx, parseUpload, type Column } from '@/lib/utils/tabular';
import { employeeCreateSchema } from '@/lib/validators/employee';

/** Safe, masked representation returned by the API (never raw ciphertext/PII). */
export type PublicEmployee = {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName?: string;
  fullName: string;
  email?: string;
  phone?: string;
  status: string;
  dateOfJoining: Date;
  departmentId?: string | null;
  designationId?: string | null;
  employmentType?: string;
  panMasked?: string;
  aadhaarMasked?: string;
  uan?: string;
  bank?: { accountMasked?: string; ifsc?: string; bankName?: string };
};

function toPublic(doc: Record<string, unknown>, opts?: { reveal?: boolean }): PublicEmployee {
  const d = doc as unknown as EmployeeDoc & { _id: unknown };
  const pan = d.panEnc ? decryptField(d.panEnc) : undefined;
  const aadhaar = d.aadhaarEnc ? decryptField(d.aadhaarEnc) : undefined;
  const acct = d.bank?.accountNumberEnc ? decryptField(d.bank.accountNumberEnc) : undefined;

  return {
    id: String(d._id),
    employeeCode: d.employeeCode,
    firstName: d.firstName,
    lastName: d.lastName,
    fullName: [d.firstName, d.lastName].filter(Boolean).join(' '),
    email: d.email,
    phone: d.phone,
    status: d.status,
    dateOfJoining: d.dateOfJoining,
    departmentId: d.departmentId ? String(d.departmentId) : null,
    designationId: d.designationId ? String(d.designationId) : null,
    employmentType: d.employmentType,
    panMasked: pan ? (opts?.reveal ? pan : maskSensitive(pan, 4)) : undefined,
    aadhaarMasked: aadhaar ? (opts?.reveal ? aadhaar : maskSensitive(aadhaar, 4)) : undefined,
    uan: d.uan,
    bank: d.bank
      ? {
          accountMasked: acct ? (opts?.reveal ? acct : maskSensitive(acct, 4)) : undefined,
          ifsc: d.bank.ifsc,
          bankName: d.bank.bankName,
        }
      : undefined,
  };
}

const EXPORT_COLUMNS: Column<PublicEmployee>[] = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'fullName', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'phone', header: 'Phone' },
  { key: 'status', header: 'Status' },
  { key: 'dateOfJoining', header: 'Date of Joining' },
  { key: 'uan', header: 'UAN' },
  { key: 'panMasked', header: 'PAN (masked)' },
];

export const IMPORT_HEADERS = [
  'Employee Code',
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Date of Joining',
  'PAN',
  'UAN',
];

function buildSensitive(input: EmployeeCreateInput | EmployeeUpdateInput): Partial<EmployeeDoc> {
  const patch: Partial<EmployeeDoc> = {};
  if (input.pan !== undefined) patch.panEnc = input.pan ? encryptField(input.pan) : undefined;
  if (input.aadhaar !== undefined) patch.aadhaarEnc = input.aadhaar ? encryptField(input.aadhaar) : undefined;
  if (input.bank) {
    patch.bank = {
      accountNumberEnc: input.bank.accountNumber ? encryptField(input.bank.accountNumber) : undefined,
      ifsc: input.bank.ifsc || undefined,
      bankName: input.bank.bankName,
      accountHolderName: input.bank.accountHolderName,
    };
  }
  return patch;
}

export const employeeService = {
  async list(ctx: AuthContext, query: ListQuery, filter: EmployeeFilter) {
    const { rows, total } = await employeeRepository.search(ctx.companyId, query, filter);
    return {
      data: rows.map((r) => toPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async get(ctx: AuthContext, id: string, reveal = false): Promise<PublicEmployee> {
    const doc = await employeeRepository.findByIdWithSecrets(ctx.companyId, id);
    if (!doc) throw AppError.notFound('Employee not found');
    return toPublic(doc as Record<string, unknown>, { reveal });
  },

  async create(ctx: AuthContext, input: EmployeeCreateInput, meta?: AuditInput['meta']) {
    const code = input.employeeCode || (await employeeRepository.nextEmployeeCode(ctx.companyId));
    if (await employeeRepository.exists(ctx.companyId, { employeeCode: code })) {
      throw AppError.conflict(`Employee code ${code} already exists`);
    }

    const created = await employeeRepository.create({
      companyId: ctx.companyId as unknown as EmployeeDoc['companyId'],
      createdBy: ctx.userId as unknown as EmployeeDoc['createdBy'],
      updatedBy: ctx.userId as unknown as EmployeeDoc['updatedBy'],
      employeeCode: code,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email || undefined,
      phone: input.phone,
      gender: input.gender,
      dateOfBirth: input.dateOfBirth,
      dateOfJoining: input.dateOfJoining,
      departmentId: input.departmentId as unknown as EmployeeDoc['departmentId'],
      designationId: input.designationId as unknown as EmployeeDoc['designationId'],
      reportingManagerId: input.reportingManagerId as unknown as EmployeeDoc['reportingManagerId'],
      locationName: input.locationName,
      employmentType: input.employmentType,
      uan: input.uan,
      esicNumber: input.esicNumber,
      status: input.status ?? 'Active',
      statusHistory: [{ status: input.status ?? 'Active', effectiveDate: new Date(), reason: 'Created' }],
      ...buildSensitive(input),
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'employees',
      entityId: String(created._id),
      summary: `Created employee ${code}`,
      meta,
    });

    return toPublic(created as Record<string, unknown>);
  },

  async update(ctx: AuthContext, id: string, input: EmployeeUpdateInput, meta?: AuditInput['meta']) {
    const before = await employeeRepository.findById(ctx.companyId, id);
    if (!before) throw AppError.notFound('Employee not found');

    const patch: Partial<EmployeeDoc> = {
      updatedBy: ctx.userId as unknown as EmployeeDoc['updatedBy'],
      ...(input.firstName !== undefined && { firstName: input.firstName }),
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.email !== undefined && { email: input.email || undefined }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.gender !== undefined && { gender: input.gender }),
      ...(input.dateOfBirth !== undefined && { dateOfBirth: input.dateOfBirth }),
      ...(input.dateOfJoining !== undefined && { dateOfJoining: input.dateOfJoining }),
      ...(input.departmentId !== undefined && {
        departmentId: input.departmentId as unknown as EmployeeDoc['departmentId'],
      }),
      ...(input.designationId !== undefined && {
        designationId: input.designationId as unknown as EmployeeDoc['designationId'],
      }),
      ...(input.employmentType !== undefined && { employmentType: input.employmentType }),
      ...(input.uan !== undefined && { uan: input.uan }),
      ...(input.esicNumber !== undefined && { esicNumber: input.esicNumber }),
      ...buildSensitive(input),
    };

    // Track a status change in history rather than silently overwriting.
    if (input.status && input.status !== before.status) {
      patch.status = input.status;
      patch.statusHistory = [
        ...(before.statusHistory ?? []),
        { status: input.status, effectiveDate: new Date(), changedBy: ctx.userId as unknown as EmployeeDoc['createdBy'] },
      ];
    }

    const updated = await employeeRepository.updateById(ctx.companyId, id, patch);
    if (!updated) throw AppError.notFound('Employee not found');

    const changes = computeDiff(
      before as unknown as Record<string, unknown>,
      updated as unknown as Record<string, unknown>,
      ['firstName', 'lastName', 'email', 'phone', 'status', 'departmentId', 'designationId', 'employmentType', 'uan'],
    );

    await recordAudit(ctx, {
      action: 'update',
      module: 'employees',
      entityId: id,
      summary: `Updated employee ${updated.employeeCode}`,
      changes,
      meta,
    });

    return toPublic(updated as Record<string, unknown>);
  },

  async remove(ctx: AuthContext, id: string, meta?: AuditInput['meta']) {
    const removed = await employeeRepository.softDelete(ctx.companyId, id, ctx.userId);
    if (!removed) throw AppError.notFound('Employee not found');
    await recordAudit(ctx, {
      action: 'delete',
      module: 'employees',
      entityId: id,
      summary: `Deleted employee ${removed.employeeCode}`,
      meta,
    });
    return { id };
  },

  async export(ctx: AuthContext, query: ListQuery, filter: EmployeeFilter, format: 'csv' | 'xlsx') {
    // Export the full filtered set, not just the current page.
    const { rows } = await employeeRepository.search(
      ctx.companyId,
      { ...query, skip: 0, limit: 100_000 },
      filter,
    );
    const data = rows.map((r) => toPublic(r as Record<string, unknown>));
    await recordAudit(ctx, {
      action: 'export',
      module: 'employees',
      summary: `Exported ${data.length} employees (${format})`,
    });
    if (format === 'xlsx') return { kind: 'xlsx' as const, buffer: await toXlsx(data, EXPORT_COLUMNS, 'Employees') };
    return { kind: 'csv' as const, content: toCsv(data, EXPORT_COLUMNS) };
  },

  /** Validate an uploaded file row-by-row; commit only fully-valid rows. */
  async import(ctx: AuthContext, file: File, meta?: AuditInput['meta']) {
    const { rows } = await parseUpload(file);
    const errors: { row: number; message: string }[] = [];
    const valid: EmployeeCreateInput[] = [];

    rows.forEach((raw, i) => {
      const candidate = {
        employeeCode: raw['Employee Code'] || undefined,
        firstName: raw['First Name'],
        lastName: raw['Last Name'] || undefined,
        email: raw['Email'] || undefined,
        phone: raw['Phone'] || undefined,
        dateOfJoining: raw['Date of Joining'],
        pan: raw['PAN'] || undefined,
        uan: raw['UAN'] || undefined,
      };
      const parsed = employeeCreateSchema.safeParse(candidate);
      if (parsed.success) valid.push(parsed.data);
      else errors.push({ row: i + 2, message: parsed.error.issues.map((x) => `${x.path.join('.')}: ${x.message}`).join('; ') });
    });

    let inserted = 0;
    for (const row of valid) {
      try {
        await this.create(ctx, row, meta);
        inserted += 1;
      } catch (err) {
        errors.push({ row: -1, message: err instanceof Error ? err.message : 'Insert failed' });
      }
    }

    await recordAudit(ctx, {
      action: 'import',
      module: 'employees',
      summary: `Imported ${inserted} employees (${errors.length} errors)`,
      meta,
    });

    return { totalRows: rows.length, inserted, errorCount: errors.length, errors };
  },
};
