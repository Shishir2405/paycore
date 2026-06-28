'use client';

import { useEffect, useState } from 'react';
import { employeesApi } from '@/lib/api/employees';
import type { SelectOption } from '@/components/ui';

/** Loads active employees as <Select> options for benefit/tax/payroll forms. */
export function useEmployeeOptions(): SelectOption[] {
  const [options, setOptions] = useState<SelectOption[]>([]);
  useEffect(() => {
    employeesApi
      .list({ limit: 200, sortBy: 'employeeCode', sortDir: 'asc' })
      .then((r) => setOptions(r.data.map((e) => ({ label: `${e.fullName} (${e.employeeCode})`, value: e.id }))))
      .catch(() => setOptions([]));
  }, []);
  return options;
}
