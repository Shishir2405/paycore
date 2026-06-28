/**
 * Employee Self-Service helpdesk ticket. An employee raises a query (payslip,
 * leave, IT, HR, …); HR/Admin reply via the `responses` thread. Moves through an
 * Open → InProgress → Resolved → Closed lifecycle. Multi-tenant + soft-delete via
 * baseFields; `ticketNumber` is a per-company human reference.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const HELPDESK_STATUSES = ['Open', 'InProgress', 'Resolved', 'Closed'] as const;
export type HelpdeskStatus = (typeof HELPDESK_STATUSES)[number];

export const HELPDESK_CATEGORIES = [
  'Payroll',
  'Leave',
  'Attendance',
  'Tax',
  'IT',
  'HR',
  'Other',
] as const;
export type HelpdeskCategory = (typeof HELPDESK_CATEGORIES)[number];

export type HelpdeskResponse = {
  by: Types.ObjectId | null;
  byName?: string;
  message: string;
  at: Date;
};

export type HelpdeskTicketDoc = WithBase<{
  ticketNumber: string;
  employeeId: Types.ObjectId;
  subject: string;
  category: HelpdeskCategory;
  message: string;
  status: HelpdeskStatus;
  responses: HelpdeskResponse[];
}>;

const HelpdeskResponseSchema = new Schema<HelpdeskResponse>(
  {
    by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, trim: true },
    message: { type: String, required: true, trim: true },
    at: { type: Date, default: () => new Date() },
  },
  { _id: false },
);

const HelpdeskTicketSchema = new Schema<HelpdeskTicketDoc>(
  {
    ...baseFields,
    ticketNumber: { type: String, required: true, trim: true, uppercase: true },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    subject: { type: String, required: true, trim: true },
    category: { type: String, enum: HELPDESK_CATEGORIES, default: 'Other' },
    message: { type: String, required: true, trim: true },
    status: { type: String, enum: HELPDESK_STATUSES, default: 'Open', index: true },
    responses: { type: [HelpdeskResponseSchema], default: [] },
  },
  baseSchemaOptions,
);

// Unique ticket number per tenant + the common list filters.
HelpdeskTicketSchema.index({ companyId: 1, ticketNumber: 1 }, { unique: true });
HelpdeskTicketSchema.index({ companyId: 1, employeeId: 1, createdAt: -1 });
HelpdeskTicketSchema.index({ companyId: 1, status: 1, isDeleted: 1 });

export const HelpdeskTicket: Model<HelpdeskTicketDoc> =
  (models.HelpdeskTicket as Model<HelpdeskTicketDoc>) ??
  model<HelpdeskTicketDoc>('HelpdeskTicket', HelpdeskTicketSchema);
