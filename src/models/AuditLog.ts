/**
 * Immutable audit trail. Every create/update/delete across the app writes one
 * row here with actor, action, module, and a before/after diff. Never updated
 * or soft-deleted — this is the compliance record.
 */
import { Schema, model, models, type Model, type Types } from 'mongoose';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'approve' | 'export' | 'import';

export type AuditChange = { field: string; from: unknown; to: unknown };

export type AuditLogDoc = {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  actorId?: Types.ObjectId | null;
  actorName: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  /** Human summary, e.g. "Updated employee EMP-0012". */
  summary: string;
  changes: AuditChange[];
  ip?: string;
  userAgent?: string;
  createdAt: Date;
};

const AuditLogSchema = new Schema<AuditLogDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String, required: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete', 'login', 'logout', 'approve', 'export', 'import'],
      required: true,
      index: true,
    },
    module: { type: String, required: true, index: true },
    entityId: { type: String, index: true },
    summary: { type: String, required: true },
    changes: {
      type: [{ field: String, from: Schema.Types.Mixed, to: Schema.Types.Mixed }],
      default: [],
    },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ companyId: 1, module: 1, createdAt: -1 });

export const AuditLog: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) ?? model<AuditLogDoc>('AuditLog', AuditLogSchema);
