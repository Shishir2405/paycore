/**
 * Holiday calendar entry. Public holidays apply to everyone; Restricted
 * (optional) holidays are employee-selectable. Optional state/location scopes a
 * holiday to a region for multi-location companies.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export const HOLIDAY_TYPES = ['Public', 'Restricted'] as const;
export type HolidayType = (typeof HOLIDAY_TYPES)[number];

export type HolidayDoc = WithBase<{
  name: string;
  date: Date;
  type: HolidayType;
  /** Optional region scope (state name or location label). Empty = all. */
  state?: string;
  location?: string;
}>;

const HolidaySchema = new Schema<HolidayDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    type: { type: String, enum: HOLIDAY_TYPES, default: 'Public' },
    state: { type: String, trim: true },
    location: { type: String, trim: true },
  },
  baseSchemaOptions,
);

// One holiday per name+date per tenant; supporting sort/filter index.
HolidaySchema.index({ companyId: 1, date: 1, name: 1 }, { unique: true });
HolidaySchema.index({ companyId: 1, date: 1, isDeleted: 1 });

export const Holiday: Model<HolidayDoc> =
  (models.Holiday as Model<HolidayDoc>) ?? model<HolidayDoc>('Holiday', HolidaySchema);
