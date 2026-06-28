/**
 * Consistent API response envelope used by every /api/v1 route.
 *
 *   success: { success: true,  data, meta? }
 *   failure: { success: false, error: { code, message, details? } }
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ApiSuccess<T> = { success: true; data: T; meta?: PageMeta };
export type ApiFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, init);
}

export function created<T>(data: T) {
  return ok(data, { status: 201 });
}

export function paginated<T>(data: T[], meta: PageMeta) {
  return NextResponse.json<ApiSuccess<T[]>>({ success: true, data, meta });
}

export function fail(error: AppError) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status },
  );
}

/**
 * Normalize any thrown value into our failure envelope.
 * Zod and Mongoose duplicate-key errors get friendly mappings.
 */
export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) return fail(err);

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return fail(AppError.validation('Validation failed', details));
  }

  // Mongoose duplicate key
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    const keys = Object.keys((err as { keyValue?: Record<string, unknown> }).keyValue ?? {});
    return fail(AppError.conflict(`Duplicate value for: ${keys.join(', ') || 'unique field'}`));
  }

  if (process.env.NODE_ENV !== 'production') {
    // Surface unexpected errors in dev to speed debugging.
    console.error('[api] unhandled error:', err);
  }
  return fail(AppError.internal());
}
