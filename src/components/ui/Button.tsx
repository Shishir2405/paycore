'use client';

import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'motion/react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-fg hover:bg-brand/90 disabled:bg-brand/50',
  secondary: 'bg-surface-2 text-fg hover:bg-border disabled:opacity-50',
  outline: 'border border-border bg-surface text-fg hover:bg-surface-2 disabled:opacity-50',
  ghost: 'text-fg-subtle hover:bg-surface-2 hover:text-fg disabled:opacity-50',
  danger: 'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export type ButtonProps = Omit<HTMLMotionProps<'button'>, 'ref' | 'children'> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Phosphor icon element rendered before the label. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <CircleNotch weight="bold" className="animate-spin" /> : icon}
      {children}
    </motion.button>
  );
});
