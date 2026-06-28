import { CircleNotch } from '@phosphor-icons/react/dist/ssr';
import { cn } from '@/lib/utils/cn';

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return <CircleNotch weight="bold" size={size} className={cn('animate-spin text-muted', className)} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
