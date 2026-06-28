/**
 * Statutory calculators — pure, dependency-free functions shared by the
 * compliance module and the payroll engine. Import these from payroll to derive
 * PF / ESI / PT / LWF deductions for a payslip.
 */
export {
  computePf,
  PF_WAGE_CEILING,
  PF_EMPLOYEE_RATE,
  PF_EMPLOYER_RATE,
  EPS_RATE,
  type PfOptions,
  type PfResult,
} from './pf';

export {
  computeEsi,
  ESI_WAGE_THRESHOLD,
  ESI_EMPLOYEE_RATE,
  ESI_EMPLOYER_RATE,
  type EsiOptions,
  type EsiResult,
} from './esi';

export {
  computePt,
  MAHARASHTRA_DEFAULT_SLABS,
  type PtFrequency,
  type PtSlabRow,
  type PtResult,
} from './pt';

export {
  computeLwf,
  type LwfFrequency,
  type LwfRuleInput,
  type LwfResult,
} from './lwf';
