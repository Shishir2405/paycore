/**
 * ESIC monthly contribution builder. One row per member with an ESI deduction,
 * showing the ESI wage (gross) and the employee/employer contribution. Members
 * with no ESI are excluded (ESI only applies up to the wage threshold).
 */
import type { Column } from '@/lib/utils/tabular';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';
import { computeEsi } from '@/lib/statutory';

export type EsicRow = {
  ipNumber: string;
  memberName: string;
  esiWages: number;
  employeeContribution: number;
  employerContribution: number;
  workingDays: number;
};

export const ESIC_COLUMNS: Column<EsicRow>[] = [
  { key: 'ipNumber', header: 'IP Number' },
  { key: 'memberName', header: 'IP Name' },
  { key: 'esiWages', header: 'ESI Wages' },
  { key: 'employeeContribution', header: 'EE Contribution' },
  { key: 'employerContribution', header: 'ER Contribution' },
  { key: 'workingDays', header: 'No. of Days' },
];

export function buildEsic(
  entries: PayrollEntryDoc[],
  esicByEmployee: Record<string, string | undefined>,
): EsicRow[] {
  return entries
    .filter((e) => e.esi > 0)
    .map((e) => {
      const esi = computeEsi(e.gross);
      return {
        ipNumber: esicByEmployee[String(e.employeeId)] ?? '',
        memberName: e.employeeName,
        esiWages: e.gross,
        employeeContribution: e.esi,
        employerContribution: esi.employer,
        workingDays: Math.max(0, 30 - e.lop),
      };
    });
}
