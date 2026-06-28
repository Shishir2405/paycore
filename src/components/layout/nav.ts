/**
 * Sidebar navigation model. Each item is gated by a `module:view` permission and
 * flagged `ready` so the shell can link built modules and show the rest as
 * upcoming — the nav doubles as the product roadmap without dead 404 links.
 */
export type NavItem = {
  label: string;
  href: string;
  /** Phosphor icon name resolved in the Sidebar. */
  icon: string;
  permission: string;
  ready: boolean;
};

export type NavSection = { heading: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', href: '/dashboard', icon: 'SquaresFour', permission: 'dashboard:view', ready: true }],
  },
  {
    heading: 'People',
    items: [
      { label: 'Employees', href: '/employees', icon: 'UsersThree', permission: 'employees:view', ready: true },
      { label: 'Attendance', href: '/attendance', icon: 'CalendarCheck', permission: 'attendance:view', ready: false },
      { label: 'Leave', href: '/leave', icon: 'AirplaneTilt', permission: 'leave:view', ready: false },
    ],
  },
  {
    heading: 'Payroll',
    items: [
      { label: 'Payroll Runs', href: '/payroll', icon: 'Money', permission: 'payroll:view', ready: false },
      { label: 'Pay Heads', href: '/pay-heads', icon: 'Sliders', permission: 'payheads:view', ready: false },
      { label: 'Tax', href: '/tax', icon: 'Receipt', permission: 'tax:view', ready: false },
      { label: 'Compliance', href: '/compliance', icon: 'ShieldCheck', permission: 'compliance:view', ready: false },
      { label: 'Payslips & Reports', href: '/payslips', icon: 'FileText', permission: 'payslips:view', ready: false },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Audit Log', href: '/audit', icon: 'ClockCounterClockwise', permission: 'audit:view', ready: false },
      { label: 'Settings', href: '/settings', icon: 'GearSix', permission: 'settings:view', ready: false },
    ],
  },
];
