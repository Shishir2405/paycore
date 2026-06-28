import Link from 'next/link';
import { ChatCircleDots, CaretRight } from '@phosphor-icons/react';
import type { HelpdeskTicket } from '@/lib/api/ess';
import { HelpdeskStatusBadge } from './HelpdeskStatusBadge';
import { formatDateTime } from './format';

/** A single helpdesk ticket as a tappable card linking to its detail thread. */
export function HelpdeskTicketRow({ ticket }: { ticket: HelpdeskTicket }) {
  return (
    <Link
      href={`/ess/helpdesk/${ticket.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 shadow-card transition-colors hover:border-brand/40"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-2xs text-muted">{ticket.ticketNumber}</span>
          <HelpdeskStatusBadge status={ticket.status} />
        </div>
        <p className="mt-1 truncate text-sm font-medium text-fg">{ticket.subject}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
          <span>{ticket.category}</span>
          {ticket.responses.length > 0 && (
            <span className="inline-flex items-center gap-1">
              <ChatCircleDots size={13} /> {ticket.responses.length}
            </span>
          )}
          <span>· {formatDateTime(ticket.updatedAt)}</span>
        </p>
      </div>
      <CaretRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}
