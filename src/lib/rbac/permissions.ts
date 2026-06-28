/**
 * Granular permission catalog. Every guarded route checks a `module:action`
 * permission (e.g. "payroll:approve"). The seed maps these onto system roles.
 *
 * Keep this list as the single source of truth — the Settings → Roles UI renders
 * directly from `PERMISSION_CATALOG`.
 */
export const PERMISSION_ACTIONS = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'import',
  'export',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export type PermissionModule = {
  key: string;
  label: string;
  /** Actions that make sense for this module (subset of PERMISSION_ACTIONS). */
  actions: PermissionAction[];
};

export const PERMISSION_CATALOG: PermissionModule[] = [
  { key: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { key: 'employees', label: 'Employee Management', actions: ['view', 'create', 'edit', 'delete', 'import', 'export'] },
  { key: 'departments', label: 'Departments & Designations', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'attendance', label: 'Time & Attendance', actions: ['view', 'create', 'edit', 'delete', 'approve', 'import', 'export'] },
  { key: 'leave', label: 'Leave Management', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'payroll', label: 'Payroll Processing', actions: ['view', 'create', 'edit', 'approve', 'export'] },
  { key: 'payheads', label: 'Pay Heads', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'tax', label: 'Tax Management', actions: ['view', 'create', 'edit', 'approve', 'export'] },
  { key: 'compliance', label: 'Statutory Compliance', actions: ['view', 'create', 'edit', 'export'] },
  { key: 'payslips', label: 'Payslips & Reports', actions: ['view', 'export'] },
  { key: 'benefits', label: 'Benefits & Deductions', actions: ['view', 'create', 'edit', 'delete', 'approve'] },
  { key: 'finance', label: 'Finance & Integration', actions: ['view', 'create', 'export'] },
  { key: 'ess', label: 'Employee Self-Service', actions: ['view', 'create', 'edit'] },
  { key: 'audit', label: 'Compliance & Audit', actions: ['view', 'export'] },
  { key: 'settings', label: 'Settings & Configuration', actions: ['view', 'edit'] },
  { key: 'users', label: 'Users', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'roles', label: 'Roles & Permissions', actions: ['view', 'create', 'edit', 'delete'] },
];

/** All valid permission strings, e.g. ["dashboard:view", "employees:create", ...]. */
export const ALL_PERMISSIONS: string[] = PERMISSION_CATALOG.flatMap((m) =>
  m.actions.map((a) => `${m.key}:${a}`),
);

export function permission(moduleKey: string, action: PermissionAction): string {
  return `${moduleKey}:${action}`;
}

/** System role identifiers. Custom roles can be created on top of these. */
export const SYSTEM_ROLES = ['SuperAdmin', 'Admin', 'HR', 'Manager', 'Employee'] as const;
export type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Default permission grants per system role (used by the seed). */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, string[]> = {
  // SuperAdmin & Admin get everything; SuperAdmin additionally bypasses checks (see hasPermission).
  SuperAdmin: ALL_PERMISSIONS,
  Admin: ALL_PERMISSIONS,
  HR: ALL_PERMISSIONS.filter(
    (p) => !p.startsWith('roles:') && !p.startsWith('settings:edit') && !p.startsWith('finance:'),
  ),
  Manager: [
    'dashboard:view',
    'employees:view',
    'attendance:view',
    'attendance:approve',
    'leave:view',
    'leave:approve',
    'payslips:view',
    'ess:view',
  ],
  Employee: ['dashboard:view', 'ess:view', 'ess:create', 'ess:edit', 'payslips:view'],
};

/**
 * SuperAdmin is an implicit wildcard so a fresh install is never locked out even
 * if the catalog gains new permissions before roles are re-seeded.
 */
export function hasPermission(
  ctx: { role: string; permissions: string[] },
  required: string,
): boolean {
  if (ctx.role === 'SuperAdmin') return true;
  return ctx.permissions.includes(required);
}
