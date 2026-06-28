/**
 * Browser API client for /api/v1. Unwraps the response envelope, throws a typed
 * ApiError on failure, and transparently refreshes the session once on a 401.
 */
import type { PageMeta } from '@/lib/utils/api-response';

const BASE = '/api/v1';

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ListResult<T> = { data: T[]; meta: PageMeta };

type RequestOptions = { method?: string; body?: unknown; query?: Record<string, string | number | undefined>; _retry?: boolean };

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }
  return url.pathname + url.search;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, _retry } = options;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });

  // Try a one-time silent refresh on expiry, then replay the original request.
  if (res.status === 401 && !_retry && path !== '/auth/refresh' && path !== '/auth/login') {
    const refreshed = await fetch(BASE + '/auth/refresh', { method: 'POST', credentials: 'same-origin' });
    if (refreshed.ok) return request<T>(path, { ...options, _retry: true });
  }

  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload?.success) {
    const err = payload?.error ?? { code: 'INTERNAL', message: 'Request failed' };
    throw new ApiError(res.status, err.code, err.message, err.details);
  }
  return (payload.meta ? { data: payload.data, meta: payload.meta } : payload.data) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { query }),
  list: <T>(path: string, query?: RequestOptions['query']) => request<ListResult<T>>(path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return request<T>(path, { method: 'POST', body: fd });
  },
  /** Absolute href for file downloads (export/template) via the browser. */
  downloadUrl: (path: string, query?: RequestOptions['query']) => buildUrl(path, query),
};
