/**
 * Payroll engine — the heart of Module 1. Given a (month, year) it loads every
 * Active employee, resolves their active salary structure, evaluates earnings,
 * derives statutory deductions (PF/ESI/PT) and TDS, and assembles one
 * PayrollEntry per employee plus the aggregate run totals.
 *
 * Pure-ish: it talks to repositories/models to LOAD data and to the statutory +
 * tax libraries to COMPUTE, but it does not persist anything itself — the
 * payroll service owns the writes. This keeps the engine unit-testable and the
 * transaction boundary in one place.
 */
import { Employee, type EmployeeDoc } from '@/models/Employee';
import { SalaryStructure, type SalaryStructureDoc } from '@/models/SalaryStructure';
import type { EntryLine } from '@/models/PayrollEntry';
import type { PayrollRunTotals } from '@/models/PayrollRun';
import { computePf, computeEsi, computePt } from '@/lib/statutory';
import { computeTaxOldRegime, computeTaxNewRegime } from '@/lib/tax/regime';
import { money2 } from '@/server/services/benefits.shared';
import type { AuthContext } from '@/types';

/** A single computed payslip (not yet persisted). */
export type ComputedEntry = {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  earnings: EntryLine[];
  deductions: EntryLine[];
  gross: number;
  totalDeductions: number;
  net: number;
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  /** Employer-side statutory cost — rolls into the run's employerCost total. */
  employerPf: number;
  employerEsi: number;
  lop: number;
};

export type EngineResult = {
  entries: ComputedEntry[];
  totals: PayrollRunTotals;
  /** Per-employee skip notes (e.g. no active structure) surfaced to the caller. */
  skipped: { employeeCode: string; reason: string }[];
};

function fullName(e: Pick<EmployeeDoc, 'firstName' | 'middleName' | 'lastName'>): string {
  return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ');
}

/** Estimate annual TDS from this month's taxable income, then take 1/12. */
function monthlyTds(monthlyTaxable: number, regime: 'Old' | 'New'): number {
  const annual = Math.max(0, monthlyTaxable) * 12;
  const breakdown = regime === 'Old' ? computeTaxOldRegime(annual) : computeTaxNewRegime(annual);
  return money2(breakdown.totalTax / 12);
}

/**
 * Compute payroll for one company + period. Loads its own data so callers only
 * pass the auth context + period. Throws nothing engine-specific; persistence and
 * the "locked run exists" guard are the service's responsibility.
 */
export async function runPayroll(
  ctx: AuthContext,
  period: { month: number; year: number },
): Promise<EngineResult> {
  const employees = await Employee.find({
    companyId: ctx.companyId,
    isDeleted: false,
    status: 'Active',
  })
    .lean<EmployeeDoc[]>({ virtuals: false })
    .exec();

  const entries: ComputedEntry[] = [];
  const skipped: { employeeCode: string; reason: string }[] = [];

  for (const emp of employees) {
    const structure = await SalaryStructure.findOne({
      companyId: ctx.companyId,
      employeeId: emp._id,
      isActive: true,
      isDeleted: false,
    })
      .sort({ version: -1 })
      .lean<SalaryStructureDoc>({ virtuals: false })
      .exec();

    if (!structure) {
      skipped.push({ employeeCode: emp.employeeCode, reason: 'No active salary structure' });
      continue;
    }

    entries.push(computeEntry(emp, structure, period));
  }

  const totals = entries.reduce<PayrollRunTotals>(
    (acc, e) => {
      acc.gross += e.gross;
      acc.deductions += e.totalDeductions;
      acc.net += e.net;
      acc.employerCost += e.gross + e.employerPf + e.employerEsi;
      acc.headcount += 1;
      return acc;
    },
    { gross: 0, deductions: 0, net: 0, employerCost: 0, headcount: 0 },
  );

  totals.gross = money2(totals.gross);
  totals.deductions = money2(totals.deductions);
  totals.net = money2(totals.net);
  totals.employerCost = money2(totals.employerCost);

  return { entries, totals, skipped };
}

/** Evaluate a single employee's structure into a computed payslip. */
function computeEntry(
  emp: EmployeeDoc,
  structure: SalaryStructureDoc,
  period: { month: number; year: number },
): ComputedEntry {
  const earnings: EntryLine[] = [];
  const deductions: EntryLine[] = [];

  // Earning heads from the structure (already resolved to rupee amounts).
  let gross = 0;
  for (const head of structure.heads) {
    if (head.type !== 'Earning') continue;
    const amount = money2(head.amount);
    earnings.push({ code: head.code, name: head.name, amount });
    gross += amount;
  }
  gross = money2(gross);

  const basic = money2(structure.basic);

  // ── Statutory deductions ──────────────────────────────────────────────────
  let pf = 0;
  let employerPf = 0;
  if (emp.pfApplicable) {
    const r = computePf(basic, { capContribution: true });
    pf = money2(r.employee);
    employerPf = money2(r.employer);
    if (pf > 0) deductions.push({ code: 'PF', name: 'Provident Fund', amount: pf });
  }

  let esi = 0;
  let employerEsi = 0;
  if (emp.esiApplicable) {
    const r = computeEsi(gross);
    esi = money2(r.employee);
    employerEsi = money2(r.employer);
    if (esi > 0) deductions.push({ code: 'ESI', name: "Employees' State Insurance", amount: esi });
  }

  let pt = 0;
  if (emp.ptApplicable) {
    const stateCode = emp.currentAddress?.stateCode ?? emp.permanentAddress?.stateCode ?? 'MH';
    const r = computePt(gross, stateCode, [], period.month);
    pt = money2(r.amount);
    if (pt > 0) deductions.push({ code: 'PT', name: 'Professional Tax', amount: pt });
  }

  // ── TDS (income tax) ──────────────────────────────────────────────────────
  // Taxable monthly income approximated as gross less the employee PF (80C-ish
  // under Old regime). The regime libs apply the standard deduction internally.
  const regime = emp.taxRegime === 'Old' ? 'Old' : 'New';
  const monthlyTaxable = regime === 'Old' ? gross - pf : gross;
  const tds = monthlyTds(monthlyTaxable, regime);
  if (tds > 0) deductions.push({ code: 'TDS', name: 'Income Tax (TDS)', amount: tds });

  // Any non-statutory deduction heads carried on the structure itself.
  for (const head of structure.heads) {
    if (head.type !== 'Deduction') continue;
    const amount = money2(head.amount);
    if (amount > 0) deductions.push({ code: head.code, name: head.name, amount });
  }

  const totalDeductions = money2(deductions.reduce((s, d) => s + d.amount, 0));
  const net = money2(gross - totalDeductions);

  return {
    employeeId: String(emp._id),
    employeeCode: emp.employeeCode,
    employeeName: fullName(emp),
    earnings,
    deductions,
    gross,
    totalDeductions,
    net,
    pf,
    esi,
    pt,
    tds,
    employerPf,
    employerEsi,
    lop: 0,
  };
}
