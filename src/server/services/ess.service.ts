/**
 * Employee Self-Service domain logic. Everything here is scoped to the *logged-in
 * user's own* linked employee record — never another employee's. The auth context
 * carries the userId; we resolve `employeeId` from the User document and use it to
 * gate every read/write. Routes call this; this layer calls repositories.
 */
import { User } from '@/models/User';
import { Employee, type EmployeeDoc } from '@/models/Employee';
import { LeaveRequest } from '@/models/LeaveRequest';
import { LeaveBalance } from '@/models/LeaveBalance';
import { LeaveType } from '@/models/LeaveType';
import type { HelpdeskTicketDoc, HelpdeskStatus } from '@/models/HelpdeskTicket';
import type { ProfileChangeRequestDoc } from '@/models/ProfileChangeRequest';
import {
  helpdeskTicketRepository,
  type HelpdeskFilter,
} from '@/server/repositories/helpdesk-ticket.repository';
import {
  profileChangeRequestRepository,
  type ProfileChangeFilter,
} from '@/server/repositories/profile-change-request.repository';
import { recordAudit, type AuditInput } from '@/lib/audit/log';
import { AppError } from '@/lib/utils/errors';
import { buildPageMeta, type ListQuery } from '@/lib/utils/pagination';
import type { AuthContext } from '@/types';
import type {
  HelpdeskCreateInput,
  HelpdeskRespondInput,
  ProfileChangeCreateInput,
} from '@/lib/validators/ess';

// ─── Public shapes (plain JSON, string ids) ─────────────────────────────────

export type EssProfile = {
  id: string;
  employeeCode: string;
  fullName: string;
  firstName: string;
  lastName?: string;
  email?: string;
  personalEmail?: string;
  phone?: string;
  status: string;
  designationId?: string | null;
  departmentId?: string | null;
  dateOfJoining?: Date | null;
  employmentType?: string;
  workMode?: string;
  locationName?: string;
  gender?: string;
  dateOfBirth?: Date | null;
  bloodGroup?: string;
  currentAddress?: EmployeeDoc['currentAddress'];
  emergencyContacts: EmployeeDoc['emergencyContacts'];
  bank?: { ifsc?: string; bankName?: string };
};

export type EssSummary = {
  profile: EssProfile;
  leave: {
    balances: { leaveTypeId: string; leaveTypeName: string; entitled: number; used: number; balance: number }[];
    pendingRequests: number;
    approvedThisYear: number;
  };
  helpdesk: { open: number; total: number };
  pendingProfileRequests: number;
};

export type PublicHelpdeskTicket = {
  id: string;
  ticketNumber: string;
  employeeId: string;
  subject: string;
  category: string;
  message: string;
  status: HelpdeskStatus;
  responses: { byName?: string; message: string; at: Date }[];
  createdAt: Date;
  updatedAt: Date;
};

export type PublicProfileChangeRequest = {
  id: string;
  employeeId: string;
  field: string;
  newValue: string;
  reason?: string;
  status: string;
  reviewNote?: string;
  reviewedAt?: Date | null;
  createdAt: Date;
};

// ─── Mappers ────────────────────────────────────────────────────────────────

function profileToPublic(doc: Record<string, unknown>): EssProfile {
  const d = doc as unknown as EmployeeDoc & { _id: unknown };
  return {
    id: String(d._id),
    employeeCode: d.employeeCode,
    fullName: [d.firstName, d.middleName, d.lastName].filter(Boolean).join(' '),
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    personalEmail: d.personalEmail,
    phone: d.phone,
    status: d.status,
    designationId: d.designationId ? String(d.designationId) : null,
    departmentId: d.departmentId ? String(d.departmentId) : null,
    dateOfJoining: d.dateOfJoining ?? null,
    employmentType: d.employmentType,
    workMode: d.workMode,
    locationName: d.locationName,
    gender: d.gender,
    dateOfBirth: d.dateOfBirth ?? null,
    bloodGroup: d.bloodGroup,
    currentAddress: d.currentAddress,
    emergencyContacts: d.emergencyContacts ?? [],
    bank: d.bank ? { ifsc: d.bank.ifsc, bankName: d.bank.bankName } : undefined,
  };
}

function ticketToPublic(doc: Record<string, unknown>): PublicHelpdeskTicket {
  const d = doc as unknown as HelpdeskTicketDoc & { _id: unknown };
  return {
    id: String(d._id),
    ticketNumber: d.ticketNumber,
    employeeId: String(d.employeeId),
    subject: d.subject,
    category: d.category,
    message: d.message,
    status: d.status,
    responses: (d.responses ?? []).map((r) => ({ byName: r.byName, message: r.message, at: r.at })),
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

function changeToPublic(doc: Record<string, unknown>): PublicProfileChangeRequest {
  const d = doc as unknown as ProfileChangeRequestDoc & { _id: unknown };
  return {
    id: String(d._id),
    employeeId: String(d.employeeId),
    field: d.field,
    newValue: d.newValue,
    reason: d.reason,
    status: d.status,
    reviewNote: d.reviewNote,
    reviewedAt: d.reviewedAt ?? null,
    createdAt: d.createdAt,
  };
}

// ─── Current-employee resolution ────────────────────────────────────────────

/**
 * Resolve the Employee record linked to the logged-in user. ESS only works for
 * users whose account is linked to an employee (`user.employeeId`).
 */
async function resolveEmployeeId(ctx: AuthContext): Promise<string> {
  const user = await User.findOne({ _id: ctx.userId, companyId: ctx.companyId, isDeleted: false })
    .select('employeeId')
    .lean()
    .exec();
  if (!user?.employeeId) {
    throw AppError.notFound('Your account is not linked to an employee profile yet');
  }
  return String(user.employeeId);
}

async function getOwnEmployee(ctx: AuthContext): Promise<EmployeeDoc> {
  const employeeId = await resolveEmployeeId(ctx);
  const emp = await Employee.findOne({ _id: employeeId, companyId: ctx.companyId, isDeleted: false })
    .lean<EmployeeDoc>({ virtuals: true })
    .exec();
  if (!emp) throw AppError.notFound('Employee profile not found');
  return emp;
}

export const essService = {
  /** The logged-in employee's own profile (safe fields only). */
  async profile(ctx: AuthContext): Promise<EssProfile> {
    const emp = await getOwnEmployee(ctx);
    return profileToPublic(emp as unknown as Record<string, unknown>);
  },

  /** Personal dashboard summary: profile + leave + helpdesk + pending requests. */
  async summary(ctx: AuthContext): Promise<EssSummary> {
    const emp = await getOwnEmployee(ctx);
    const employeeId = String(emp._id);
    const year = new Date().getFullYear();

    const [balances, leaveTypes, pendingRequests, approvedThisYear, openTickets, totalTickets, pendingChanges] =
      await Promise.all([
        LeaveBalance.find({ companyId: ctx.companyId, employeeId, year, isDeleted: false }).lean().exec(),
        LeaveType.find({ companyId: ctx.companyId, isDeleted: false }).select('name').lean().exec(),
        LeaveRequest.countDocuments({ companyId: ctx.companyId, employeeId, status: 'Pending', isDeleted: false }),
        LeaveRequest.countDocuments({
          companyId: ctx.companyId,
          employeeId,
          status: 'Approved',
          isDeleted: false,
          fromDate: { $gte: new Date(year, 0, 1) },
        }),
        helpdeskTicketRepository.collectionCount(ctx.companyId, { employeeId, status: { $in: ['Open', 'InProgress'] } }),
        helpdeskTicketRepository.collectionCount(ctx.companyId, { employeeId }),
        profileChangeRequestRepository.collectionCount(ctx.companyId, { employeeId, status: 'Pending' }),
      ]);

    const typeName = new Map(leaveTypes.map((t) => [String(t._id), t.name]));

    return {
      profile: profileToPublic(emp as unknown as Record<string, unknown>),
      leave: {
        balances: balances.map((b) => ({
          leaveTypeId: String(b.leaveTypeId),
          leaveTypeName: typeName.get(String(b.leaveTypeId)) ?? 'Leave',
          entitled: b.entitled,
          used: b.used,
          balance: b.balance,
        })),
        pendingRequests,
        approvedThisYear,
      },
      helpdesk: { open: openTickets, total: totalTickets },
      pendingProfileRequests: pendingChanges,
    };
  },

  // ── Helpdesk ──────────────────────────────────────────────────────────────

  /** List the logged-in employee's own tickets. */
  async listTickets(ctx: AuthContext, query: ListQuery, filter: Omit<HelpdeskFilter, 'employeeId'>) {
    const employeeId = await resolveEmployeeId(ctx);
    const { rows, total } = await helpdeskTicketRepository.search(ctx.companyId, query, {
      ...filter,
      employeeId,
    });
    return {
      data: rows.map((r) => ticketToPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  async getTicket(ctx: AuthContext, id: string): Promise<PublicHelpdeskTicket> {
    const employeeId = await resolveEmployeeId(ctx);
    const doc = await helpdeskTicketRepository.findOne(ctx.companyId, { _id: id, employeeId });
    if (!doc) throw AppError.notFound('Ticket not found');
    return ticketToPublic(doc as Record<string, unknown>);
  },

  async createTicket(ctx: AuthContext, input: HelpdeskCreateInput, meta?: AuditInput['meta']) {
    const employeeId = await resolveEmployeeId(ctx);
    const ticketNumber = await helpdeskTicketRepository.nextTicketNumber(ctx.companyId);

    const created = await helpdeskTicketRepository.create({
      companyId: ctx.companyId as unknown as HelpdeskTicketDoc['companyId'],
      createdBy: ctx.userId as unknown as HelpdeskTicketDoc['createdBy'],
      updatedBy: ctx.userId as unknown as HelpdeskTicketDoc['updatedBy'],
      employeeId: employeeId as unknown as HelpdeskTicketDoc['employeeId'],
      ticketNumber,
      subject: input.subject,
      category: input.category,
      message: input.message,
      status: 'Open',
      responses: [],
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'ess',
      entityId: String(created._id),
      summary: `Raised helpdesk ticket ${ticketNumber}`,
      meta,
    });

    return ticketToPublic(created as Record<string, unknown>);
  },

  /** Append a reply to one of the employee's own tickets (optional status move). */
  async respondTicket(ctx: AuthContext, id: string, input: HelpdeskRespondInput, meta?: AuditInput['meta']) {
    const employeeId = await resolveEmployeeId(ctx);
    const before = await helpdeskTicketRepository.findOne(ctx.companyId, { _id: id, employeeId });
    if (!before) throw AppError.notFound('Ticket not found');

    const response: HelpdeskTicketDoc['responses'][number] = {
      by: ctx.userId as unknown as HelpdeskTicketDoc['responses'][number]['by'],
      byName: ctx.name,
      message: input.message,
      at: new Date(),
    };

    const updated = await helpdeskTicketRepository.updateById(ctx.companyId, id, {
      $push: { responses: response },
      ...(input.status ? { status: input.status } : {}),
      updatedBy: ctx.userId as unknown as HelpdeskTicketDoc['updatedBy'],
    });
    if (!updated) throw AppError.notFound('Ticket not found');

    await recordAudit(ctx, {
      action: 'update',
      module: 'ess',
      entityId: id,
      summary: `Replied on ticket ${updated.ticketNumber}`,
      meta,
    });

    return ticketToPublic(updated as Record<string, unknown>);
  },

  // ── Profile change requests ─────────────────────────────────────────────────

  async listProfileRequests(ctx: AuthContext, query: ListQuery, filter: Omit<ProfileChangeFilter, 'employeeId'>) {
    const employeeId = await resolveEmployeeId(ctx);
    const { rows, total } = await profileChangeRequestRepository.search(ctx.companyId, query, {
      ...filter,
      employeeId,
    });
    return {
      data: rows.map((r) => changeToPublic(r as Record<string, unknown>)),
      meta: buildPageMeta(query.page, query.limit, total),
    };
  },

  /** Submit a personal-detail change request — pending admin approval. */
  async createProfileRequest(ctx: AuthContext, input: ProfileChangeCreateInput, meta?: AuditInput['meta']) {
    const employeeId = await resolveEmployeeId(ctx);

    const created = await profileChangeRequestRepository.create({
      companyId: ctx.companyId as unknown as ProfileChangeRequestDoc['companyId'],
      createdBy: ctx.userId as unknown as ProfileChangeRequestDoc['createdBy'],
      updatedBy: ctx.userId as unknown as ProfileChangeRequestDoc['updatedBy'],
      employeeId: employeeId as unknown as ProfileChangeRequestDoc['employeeId'],
      field: input.field,
      newValue: input.newValue,
      reason: input.reason,
      status: 'Pending',
    });

    await recordAudit(ctx, {
      action: 'create',
      module: 'ess',
      entityId: String(created._id),
      summary: `Requested change to ${input.field}`,
      meta,
    });

    return changeToPublic(created as Record<string, unknown>);
  },
};
