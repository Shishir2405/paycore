/**
 * Daily attendance record — one row per employee per calendar day. Captures the
 * punch window (inTime/outTime), the derived worked + overtime hours, the
 * day status, and where the record came from (manual entry, spreadsheet import,
 * or a biometric device). A compound unique index enforces one row per
 * employee/day per tenant so re-imports upsert instead of duplicating.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const ATTENDANCE_STATUSES = [
  'Present',
  'Absent',
  'HalfDay',
  'Leave',
  'Holiday',
  'WeeklyOff',
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ATTENDANCE_SOURCES = ['Manual', 'Import', 'Biometric'] as const;
export type AttendanceSource = (typeof ATTENDANCE_SOURCES)[number];

export type AttendanceDoc = WithBase<{
  employeeId: Types.ObjectId;
  shiftId?: Types.ObjectId | null;
  /** Calendar day this record covers (normalized to midnight UTC). */
  date: Date;
  status: AttendanceStatus;
  /** Punch-in/out, "HH:mm" 24h. */
  inTime?: string;
  outTime?: string;
  /** Net hours worked (after break) — derived on save. */
  workedHours: number;
  /** Hours beyond the shift span — derived on save. */
  overtimeHours: number;
  source: AttendanceSource;
  remarks?: string;
}>;

const AttendanceSchema = new Schema<AttendanceDoc>(
  {
    ...baseFields,
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    shiftId: { type: Schema.Types.ObjectId, ref: 'Shift', default: null },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUSES, default: 'Present', index: true },
    inTime: { type: String, trim: true },
    outTime: { type: String, trim: true },
    workedHours: { type: Number, default: 0, min: 0 },
    overtimeHours: { type: Number, default: 0, min: 0 },
    source: { type: String, enum: ATTENDANCE_SOURCES, default: 'Manual' },
    remarks: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// One attendance row per employee per day per tenant.
AttendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ companyId: 1, date: 1, status: 1, isDeleted: 1 });

export const Attendance: Model<AttendanceDoc> =
  (models.Attendance as Model<AttendanceDoc>) ?? model<AttendanceDoc>('Attendance', AttendanceSchema);
