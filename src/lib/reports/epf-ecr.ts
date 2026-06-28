/**
 * EPF ECR (Electronic Challan-cum-Return) builder. Produces one row per member
 * who has a PF deduction, with the wage and employee/employer EPF + EPS split as
 * required for the EPFO upload. Employees with no PF contribution are excluded.
 *
 * Note: EPS is computed on the statutory ceiling (₹15,000); EPF difference is the
 * employer 12% less EPS. Columns mirror the common ECR text layout.
 */
import type { Column } from '@/lib/utils/tabular';
import type { PayrollEntryDoc } from '@/models/PayrollEntry';
import { computePf } from '@/lib/statutory';

export type EpfEcrRow = {
  uan: string;
  memberName: string;
  grossWages: number;
  epfWages: number;
  epsWages: number;
  employeePf: number;
  employerEps: number;
  employerEpf: number;
  ncpDays: number;
};

export const EPF_ECR_COLUMNS: Column<EpfEcrRow>[] = [
  { key: 'uan', header: 'UAN' },
  { key: 'memberName', header: 'Member Name' },
  { key: 'grossWages', header: 'Gross Wages' },
  { key: 'epfWages', header: 'EPF Wages' },
  { key: 'epsWages', header: 'EPS Wages' },
  { key: 'employeePf', header: 'EE Share' },
  { key: 'employerEps', header: 'EPS Contribution' },
  { key: 'employerEpf', header: 'ER Share (EPF)' },
  { key: 'ncpDays', header: 'NCP Days' },
];

/** A row needs the member's UAN; the service supplies a uan map keyed by employeeId. */
export function buildEpfEcr(
  entries: PayrollEntryDoc[],
  uanByEmployee: Record<string, string | undefined>,
): EpfEcrRow[] {
  return entries
    .filter((e) => e.pf > 0)
    .map((e) => {
      // Re-derive the employer split from the employee PF (employee = employer 12%).
      const pf = computePf(Math.round(e.pf / 0.12), { capContribution: true });
      return {
        uan: uanByEmployee[String(e.employeeId)] ?? '',
        memberName: e.employeeName,
        grossWages: e.gross,
        epfWages: pf.contributionBase,
        epsWages: Math.min(pf.pfWage, 15000),
        employeePf: e.pf,
        employerEps: pf.employerEps,
        employerEpf: pf.employerEpf,
        ncpDays: e.lop,
      };
    });
}
