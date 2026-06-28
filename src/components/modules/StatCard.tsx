'use client';

import { motion } from 'motion/react';
import type { Icon } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'brand',
  hint,
}: {
  label: string;
  value: React.ReactNode;
  icon: Icon;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'info';
  hint?: string;
}) {
  const toneClass = {
    brand: 'bg-brand-subtle text-brand',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  }[tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg', toneClass)}>
          <Icon size={18} weight="fill" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-fg">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </motion.div>
  );
}
