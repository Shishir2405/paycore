'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils/cn';

export type TabItem = { key: string; label: React.ReactNode; count?: number };

export type TabsProps = {
  items: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (key: string) => void;
  className?: string;
};

/** Animated underline tab bar. Controlled (`value`) or uncontrolled (`defaultValue`). */
export function Tabs({ items, value, defaultValue, onChange, className }: TabsProps) {
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.key);
  const active = value ?? internal;

  function select(key: string) {
    if (value === undefined) setInternal(key);
    onChange?.(key);
  }

  return (
    <div className={cn('flex gap-1 border-b border-border', className)}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => select(item.key)}
            className={cn(
              'relative px-3 py-2.5 text-sm font-medium transition-colors',
              isActive ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {item.label}
              {item.count !== undefined && (
                <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-2xs text-fg-subtle">
                  {item.count}
                </span>
              )}
            </span>
            {isActive && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
