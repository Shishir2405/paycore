import { z } from 'zod';
import { ATTENDANCE_STATUSES, ATTENDANCE_SOURCES } from '@/models/Attendance';

const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalTime = z.string().trim().regex(HHMM_RE, 'Use HH:mm (24h)').optional().or(z.literal(''));

/** Shared between the attendance form and the server route. */
export const attendanceCreateSchema = z.object({
  employeeId: z.string().trim().min(1, 'Employee is required'),
  shiftId: z.string().trim().optional(),
  date: z.coerce.date({ message: 'Date is required' }),
  status: z.enum(ATTENDANCE_STATUSES).default('Present'),
  inTime: optionalTime,
  outTime: optionalTime,
  source: z.enum(ATTENDANCE_SOURCES).optional(),
  remarks: z.string().trim().optional(),
});

export const attendanceUpdateSchema = attendanceCreateSchema.partial();

export type AttendanceCreateInput = z.infer<typeof attendanceCreateSchema>;
export type AttendanceUpdateInput = z.infer<typeof attendanceUpdateSchema>;
