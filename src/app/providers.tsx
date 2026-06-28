'use client';

import { ToastProvider } from '@/components/ui/Toast';

/** Global client providers mounted once at the root. */
export function Providers({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
