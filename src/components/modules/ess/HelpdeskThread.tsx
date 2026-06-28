import { User, Headset } from '@phosphor-icons/react';
import type { HelpdeskTicket } from '@/lib/api/ess';
import { formatDateTime } from './format';

type ThreadMessage = { byName?: string; message: string; at: string; isOwner: boolean };

/**
 * Renders the ticket's conversation: the original message followed by each
 * response, oldest first. `ownerName` distinguishes the employee's own messages.
 */
export function HelpdeskThread({ ticket, ownerName }: { ticket: HelpdeskTicket; ownerName?: string }) {
  const messages: ThreadMessage[] = [
    { byName: ownerName ?? 'You', message: ticket.message, at: ticket.createdAt, isOwner: true },
    ...ticket.responses.map((r) => ({
      byName: r.byName,
      message: r.message,
      at: r.at,
      // Responses without an explicit author name are treated as support replies.
      isOwner: !!ownerName && r.byName === ownerName,
    })),
  ];

  return (
    <ul className="space-y-3">
      {messages.map((m, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full ' +
              (m.isOwner ? 'bg-brand-subtle text-brand' : 'bg-info/10 text-info')
            }
          >
            {m.isOwner ? <User size={16} weight="fill" /> : <Headset size={16} weight="fill" />}
          </span>
          <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-fg">{m.byName ?? (m.isOwner ? 'You' : 'Support')}</span>
              <span className="text-2xs text-muted">{formatDateTime(m.at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-fg-subtle">{m.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
