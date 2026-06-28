import { z } from 'zod';
import { HOLIDAY_TYPES } from '@/models/Holiday';

/** Shared between the holiday form and the server route. */
export const holidayCreateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  date: z.coerce.date({ message: 'Date is required' }),
  type: z.enum(HOLIDAY_TYPES).default('Public'),
  state: z.string().trim().optional(),
  location: z.string().trim().optional(),
});

export const holidayUpdateSchema = holidayCreateSchema.partial();

export type HolidayCreateInput = z.infer<typeof holidayCreateSchema>;
export type HolidayUpdateInput = z.infer<typeof holidayUpdateSchema>;
