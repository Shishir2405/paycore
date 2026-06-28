import { Badge } from '@/components/ui';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';

/** Map each audit action to a consistent badge tone + label. */
const ACTION_TONE: Record<string, Tone> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  approve: 'brand',
  login: 'neutral',
  logout: 'neutral',
  export: 'warning',
  import: 'warning',
};

export function AuditActionBadge({ action }: { action: string }) {
  return (
    <Badge tone={ACTION_TONE[action] ?? 'neutral'} dot>
      {action}
    </Badge>
  );
}
