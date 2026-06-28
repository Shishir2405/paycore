'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProhibitInset, ArrowLeft } from '@phosphor-icons/react';
import { useAuth } from '@/store/auth';
import { Button } from '@/components/ui';

/**
 * Client-side route guard. Wrap a create/edit (or any) page so it only renders
 * for users who hold `permission`. The API enforces the same check server-side —
 * this is the UX layer (hide + friendly denial), not the security boundary.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { ready, can, bootstrap } = useAuth();

  // Resolve the session if the app shell hasn't already.
  useEffect(() => {
    if (!ready) void bootstrap();
  }, [ready, bootstrap]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted">Checking access…</div>
    );
  }

  if (!can(permission)) return <AccessDenied />;

  return <>{children}</>;
}

function AccessDenied() {
  const router = useRouter();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
        <ProhibitInset size={24} weight="bold" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-fg">You don&apos;t have access</h2>
        <p className="mt-1 text-sm text-muted">
          Your role doesn&apos;t include permission for this action. Ask an administrator if you
          think this is a mistake.
        </p>
      </div>
      <Button variant="outline" size="sm" icon={<ArrowLeft size={15} />} onClick={() => router.back()}>
        Go back
      </Button>
    </div>
  );
}
