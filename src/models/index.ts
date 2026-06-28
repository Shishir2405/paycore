/** Barrel — importing this registers every model on the Mongoose connection. */
export {
  AddressSchema,
  EmergencyContactSchema,
  MoneySchema,
  type Address,
  type EmergencyContact,
  type Money,
  type WithBase,
} from './_base';
export { Company, type CompanyDoc, SUBSCRIPTION_PLANS, type SubscriptionPlan } from './Company';
export { Role, type RoleDoc } from './Role';
export { User, type UserDoc, USER_STATUSES, type UserStatus } from './User';
export { Settings, type SettingsDoc, type EmailProviderKey, type SmsProviderKey } from './Settings';
export { AuditLog, type AuditLogDoc, type AuditAction, type AuditChange } from './AuditLog';
export { Department, type DepartmentDoc } from './Department';
export { Designation, type DesignationDoc } from './Designation';
export {
  Employee,
  type EmployeeDoc,
  EMPLOYEE_STATUSES,
  type EmployeeStatus,
  EMPLOYMENT_TYPES,
  type EmploymentType,
  WORK_MODES,
  type WorkMode,
  MARITAL_STATUSES,
  type MaritalStatus,
  TAX_REGIMES,
  type TaxRegime,
  PAYMENT_MODES,
  type PaymentMode,
  EXIT_TYPES,
  type ExitType,
} from './Employee';
