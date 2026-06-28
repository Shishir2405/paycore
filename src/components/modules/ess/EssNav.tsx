'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Gauge,
  FileText,
  CalendarBlank,
  UserCircle,
  AddressBook,
  Lifebuoy,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

const ITEMS = [
  { href: '/ess', label: 'Overview', icon: Gauge },
  { href: '/ess/payslips', label: 'Payslips', icon: FileText },
  { href: '/ess/leave', label: 'Leave', icon: CalendarBlank },
  { href: '/ess/profile', label: 'Profile', icon: UserCircle },
  { href: '/ess/directory', label: 'Directory', icon: AddressBook },
  { href: '/ess/helpdesk', label: 'Helpdesk', icon: Lifebuoy },
] as const;

/** Horizontal, scrollable sub-nav shared by every ESS page (mobile-friendly). */
export function EssNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-5 -mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px scrollbar-thin">
      {ITEMS.map((item) => {
        const active = item.href === '/ess' ? pathname === '/ess' : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-brand text-fg'
                : 'border-transparent text-muted hover:text-fg',
            )}
          >
            <Icon size={16} weight={active ? 'fill' : 'regular'} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
