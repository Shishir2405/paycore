/**
 * Sidebar navigation model. `permission` gates visibility (checked against the
 * session). `soon` marks modules on the roadmap that aren't built yet — they
 * render disabled so the full product shape is visible from day one.
 */
import type { Icon } from '@phosphor-icons/react';
import {
  SquaresFour,
  UsersThree,
  Buildings,
  Clock,
  CalendarCheck,
  Money,
  Receipt,
  FileText,
  Percent,
  ShieldCheck,
  ClipboardText,
  HandCoins,
  Bank,
  UserCircle,
  Gear,
} from '@phosphor-icons/react';

export type NavItem = {
  label: string;
  href: string;
  icon: Icon;
  permission: string;
  soon?: boolean;
};

export type NavGroup = { title: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: SquaresFour, permission: 'dashboard:view' }],
  },
  {
    title: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: UsersThree, permission: 'employees:view' },
      { label: 'Departments', href: '/departments', icon: Buildings, permission: 'departments:view', soon: true },
      { label: 'Attendance', href: '/attendance', icon: Clock, permission: 'attendance:view', soon: true },
      { label: 'Leave', href: '/leave', icon: CalendarCheck, permission: 'leave:view', soon: true },
    ],
  },
  {
    title: 'Payroll',
    items: [
      { label: 'Payroll Runs', href: '/payroll', icon: Money, permission: 'payroll:view', soon: true },
      { label: 'Pay Heads', href: '/pay-heads', icon: Receipt, permission: 'payheads:view', soon: true },
      { label: 'Payslips', href: '/payslips', icon: FileText, permission: 'payslips:view', soon: true },
    ],
  },
  {
    title: 'Compliance',
    items: [
      { label: 'Tax', href: '/tax', icon: Percent, permission: 'tax:view', soon: true },
      { label: 'Statutory', href: '/compliance', icon: ShieldCheck, permission: 'compliance:view', soon: true },
      { label: 'Audit Trail', href: '/audit', icon: ClipboardText, permission: 'audit:view', soon: true },
    ],
  },
  {
    title: 'Finance & ESS',
    items: [
      { label: 'Benefits', href: '/benefits', icon: HandCoins, permission: 'benefits:view', soon: true },
      { label: 'Finance', href: '/finance', icon: Bank, permission: 'finance:view', soon: true },
      { label: 'Self-Service', href: '/ess', icon: UserCircle, permission: 'ess:view', soon: true },
    ],
  },
  {
    title: 'Admin',
    items: [{ label: 'Settings', href: '/settings', icon: Gear, permission: 'settings:view' }],
  },
];
