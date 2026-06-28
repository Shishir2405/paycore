'use client';

import { Modal } from '@/components/ui';
import type { AuditLogEntry } from '@/lib/api/audit';
import { AuditActionBadge } from './AuditActionBadge';

/** Read-only inspector for a single audit-trail entry. */
export function AuditDetailModal({
  entry,
  onClose,
}: {
  entry: AuditLogEntry | null;
  onClose: () => void;
}) {
  return (
    <Modal open={Boolean(entry)} onClose={onClose} title="Audit entry" size="md">
      {entry && (
        <dl className="space-y-3 text-sm">
          <Row label="Timestamp">
            <span className="text-fg">{new Date(entry.timestamp).toLocaleString()}</span>
          </Row>
          <Row label="Action">
            <AuditActionBadge action={entry.action} />
          </Row>
          <Row label="Module">
            <span className="font-mono text-xs text-fg-subtle">{entry.module}</span>
          </Row>
          <Row label="Actor">
            <span className="text-fg">{entry.actorName}</span>
          </Row>
          <Row label="Summary">
            <span className="text-fg">{entry.summary}</span>
          </Row>
          {entry.entityId && (
            <Row label="Entity">
              <span className="font-mono text-xs text-fg-subtle">{entry.entityId}</span>
            </Row>
          )}
          <Row label="Changes">
            <span className="text-fg-subtle">
              {entry.changeCount} field{entry.changeCount === 1 ? '' : 's'}
            </span>
          </Row>
          {entry.ip && (
            <Row label="IP address">
              <span className="font-mono text-xs text-fg-subtle">{entry.ip}</span>
            </Row>
          )}
          {entry.userAgent && (
            <Row label="User agent">
              <span className="break-all text-xs text-muted">{entry.userAgent}</span>
            </Row>
          )}
        </dl>
      )}
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}
