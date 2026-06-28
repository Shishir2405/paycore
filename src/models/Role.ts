/**
 * A role bundles permission strings (`module:action`). System roles are seeded
 * per company; admins can also create custom roles from Settings → Roles.
 */
import { Schema, model, models, type Model } from 'mongoose';
import { baseFields, baseSchemaOptions, type WithBase } from './_base';

export type RoleDoc = WithBase<{
  name: string;
  description?: string;
  permissions: string[];
  /** System roles cannot be deleted and have protected names. */
  isSystem: boolean;
}>;

const RoleSchema = new Schema<RoleDoc>(
  {
    ...baseFields,
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
  },
  baseSchemaOptions,
);

// One role name per company.
RoleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Role: Model<RoleDoc> =
  (models.Role as Model<RoleDoc>) ?? model<RoleDoc>('Role', RoleSchema);
