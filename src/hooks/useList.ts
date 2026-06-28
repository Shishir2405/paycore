'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api/client';
import type { PageMeta } from '@/lib/utils/api-response';
import { useDebouncedValue } from './useDebouncedValue';

export type UseListOptions = {
  initialLimit?: number;
  initialSortBy?: string;
  initialSortDir?: 'asc' | 'desc';
  /** Extra query params (filters). Changing these refetches from page 1. */
  filters?: Record<string, string | undefined>;
};

/**
 * Generic list controller: server-side pagination + debounced search + sort.
 * Backs every module's list view so behavior stays consistent.
 */
export function useList<T>(path: string, options: UseListOptions = {}) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(options.initialSortBy ?? 'createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(options.initialSortDir ?? 'desc');

  const debouncedSearch = useDebouncedValue(search);
  const filterKey = JSON.stringify(options.filters ?? {});

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.list<T>(path, {
        page,
        limit: options.initialLimit ?? 20,
        search: debouncedSearch,
        sortBy,
        sortDir,
        ...(options.filters ?? {}),
      });
      setRows(res.data);
      setMeta(res.meta);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load data');
      setRows([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, page, debouncedSearch, sortBy, sortDir, filterKey, options.initialLimit]);

  useEffect(() => {
    void fetchPage();
  }, [fetchPage]);

  // Reset to page 1 whenever the search term or filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterKey]);

  function toggleSort(key: string) {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  }

  return {
    rows,
    meta,
    loading,
    error,
    page,
    setPage,
    search,
    setSearch,
    sortBy,
    sortDir,
    toggleSort,
    refetch: fetchPage,
  };
}
