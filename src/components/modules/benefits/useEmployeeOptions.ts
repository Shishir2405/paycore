'use client';

import { useEffect, useState } from 'react';
import { employeesApi } from '@/lib/api/employees';
import type { SelectOption } from '@/components/ui';

/**
 * Loads a flat list of employees as `<Select>` options. Used by every benefits
 * form modal's employee picker. Fetches once when `enabled` flips true (modal
 * open) so closed modals do no work. Failures are non-fatal: the form still
 * renders, just without options.
 */
export function useEmployeeOptions(enabled: boolean): SelectOption[] {
  const [options, setOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    if (!enabled || options.length > 0) return;
    let active = true;
    void (async () => {
      try {
        const res = await employeesApi.list({ limit: 100, sortBy: 'firstName', sortDir: 'asc' });
        if (!active) return;
        setOptions(res.data.map((e) => ({ label: `${e.fullName} (${e.employeeCode})`, value: e.id })));
      } catch {
        // Non-fatal.
      }
    })();
    return () => {
      active = false;
    };
  }, [enabled, options.length]);

  return options;
}
