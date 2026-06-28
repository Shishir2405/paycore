/**
 * Typed application errors. Services and repositories throw these; the route
 * handler wrapper (`withRoute`) maps them to consistent HTTP responses.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }

  static badRequest(msg = 'Bad request', details?: unknown) {
    return new AppError('BAD_REQUEST', msg, details);
  }
  static unauthorized(msg = 'Authentication required') {
    return new AppError('UNAUTHORIZED', msg);
  }
  static forbidden(msg = 'You do not have permission to perform this action') {
    return new AppError('FORBIDDEN', msg);
  }
  static notFound(msg = 'Resource not found') {
    return new AppError('NOT_FOUND', msg);
  }
  static conflict(msg = 'Resource already exists', details?: unknown) {
    return new AppError('CONFLICT', msg, details);
  }
  static validation(msg = 'Validation failed', details?: unknown) {
    return new AppError('VALIDATION', msg, details);
  }
  static internal(msg = 'Something went wrong') {
    return new AppError('INTERNAL', msg);
  }
}
