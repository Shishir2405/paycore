'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Buildings } from '@phosphor-icons/react';
import { NAV } from '@/config/nav';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils/cn';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const can = useAuth((s) => s.can);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
          <Buildings size={18} weight="fill" />
        </div>
        <span className="text-sm font-semibold text-fg">PayCore</span>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 scrollbar-thin">
        {NAV.map((group) => {
          const items = group.items.filter((i) => can(i.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-muted">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  if (item.soon) {
                    return (
                      <span
                        key={item.href}
                        className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-muted/70"
                        title="Coming soon"
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon size={18} />
                          {item.label}
                        </span>
                        <span className="rounded bg-surface-2 px-1.5 py-0.5 text-2xs">Soon</span>
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        active ? 'bg-brand-subtle text-brand' : 'text-fg-subtle hover:bg-surface-2 hover:text-fg',
                      )}
                    >
                      <Icon size={18} weight={active ? 'fill' : 'regular'} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
