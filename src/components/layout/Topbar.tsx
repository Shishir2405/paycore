'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { List, Bell, SignOut, Moon, Sun, User as UserIcon } from '@phosphor-icons/react';
import { useAuth } from '@/store/auth';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = (localStorage.getItem('pc_theme') as 'light' | 'dark') ?? 'light';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('pc_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  const initials = (user?.name ?? 'U')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-surface-2 lg:hidden"
        aria-label="Open menu"
      >
        <List size={20} />
      </button>

      <div className="flex flex-1 items-center justify-end gap-1">
        <button
          onClick={toggleTheme}
          className="rounded-md p-2 text-fg-subtle transition-colors hover:bg-surface-2"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          className="relative rounded-md p-2 text-fg-subtle transition-colors hover:bg-surface-2"
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-danger" />
        </button>

        <Dropdown
          trigger={
            <button className="ml-1 flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-surface-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-brand-fg">
                {initials}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-fg">{user?.name}</span>
                <span className="block text-xs leading-tight text-muted">{user?.role}</span>
              </span>
            </button>
          }
        >
          <div className="px-2.5 py-2">
            <p className="text-sm font-medium text-fg">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <DropdownDivider />
          <DropdownItem icon={<UserIcon size={16} />} onClick={() => router.push('/ess')}>
            My profile
          </DropdownItem>
          <DropdownItem icon={<SignOut size={16} />} danger onClick={handleLogout}>
            Sign out
          </DropdownItem>
        </Dropdown>
      </div>
    </header>
  );
}
