'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, Info, Warning, XCircle, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type Toast = { id: number; tone: ToastTone; title: string; description?: string };

type ToastContextValue = {
  push: (tone: ToastTone, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle weight="fill" className="text-success" size={20} />,
  error: <XCircle weight="fill" className="text-danger" size={20} />,
  warning: <Warning weight="fill" className="text-warning" size={20} />,
  info: <Info weight="fill" className="text-info" size={20} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      const id = (seq.current += 1);
      setToasts((prev) => [...prev, { id, tone, title, description }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value: ToastContextValue = {
    push,
    success: (t, d) => push('success', t, d),
    error: (t, d) => push('error', t, d),
    warning: (t, d) => push('warning', t, d),
    info: (t, d) => push('info', t, d),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 shadow-pop',
              )}
            >
              <span className="mt-0.5 shrink-0">{ICONS[t.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-muted">{t.description}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded p-0.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label="Dismiss"
              >
                <X size={16} weight="bold" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
