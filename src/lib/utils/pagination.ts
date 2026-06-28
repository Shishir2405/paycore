/**
 * Parse standard list-query params shared by every module:
 *   ?page=&limit=&search=&sortBy=&sortDir=
 * Plus a helper to build the PageMeta envelope.
 */
import type { PageMeta } from './api-response';

export type ListQuery = {
  page: number;
  limit: number;
  skip: number;
  search: string;
  sortBy: string;
  sortDir: 1 | -1;
};

const MAX_LIMIT = 100;

export function parseListQuery(
  searchParams: URLSearchParams,
  defaults?: { sortBy?: string; limit?: number },
): ListQuery {
  const page = Math.max(1, toInt(searchParams.get('page'), 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, toInt(searchParams.get('limit'), defaults?.limit ?? 20)));
  const search = (searchParams.get('search') ?? '').trim();
  const sortBy = (searchParams.get('sortBy') ?? defaults?.sortBy ?? 'createdAt').trim();
  const sortDir: 1 | -1 = searchParams.get('sortDir') === 'asc' ? 1 : -1;

  return { page, limit, skip: (page - 1) * limit, search, sortBy, sortDir };
}

export function buildPageMeta(page: number, limit: number, total: number): PageMeta {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/** Escape a user string for safe use inside a RegExp (search). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
