import { Badge } from '@/components/ui';
import type { HelpdeskStatus } from '@/lib/api/ess';

const TONE: Record<HelpdeskStatus, Parameters<typeof Badge>[0]['tone']> = {
  Open: 'info',
  InProgress: 'warning',
  Resolved: 'success',
  Closed: 'neutral',
};

const LABEL: Record<HelpdeskStatus, string> = {
  Open: 'Open',
  InProgress: 'In progress',
  Resolved: 'Resolved',
  Closed: 'Closed',
};

/** Coloured status pill for a helpdesk ticket. */
export function HelpdeskStatusBadge({ status }: { status: HelpdeskStatus }) {
  return (
    <Badge tone={TONE[status]} dot>
      {LABEL[status]}
    </Badge>
  );
}
