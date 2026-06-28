/**
 * Salary-structure validators live alongside the rest of the payroll validators
 * in `./payroll` (single source of truth). This module re-exports them so callers
 * can import from either path.
 */
export {
  salaryStructureCreateSchema,
  salaryStructureUpdateSchema,
  type SalaryStructureHeadInput,
  type SalaryStructureCreateInput,
  type SalaryStructureUpdateInput,
} from './payroll';
