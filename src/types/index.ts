/** Cross-cutting shared types. */
import type { Types } from 'mongoose';

export type ID = string;

/** Authenticated request context resolved from the access token + DB. */
export type AuthContext = {
  userId: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

/** Fields every collection carries (multi-tenant scoping + audit + soft delete). */
export type BaseFields = {
  companyId: Types.ObjectId;
  createdBy?: Types.ObjectId | null;
  updatedBy?: Types.ObjectId | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ListResponse<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};
