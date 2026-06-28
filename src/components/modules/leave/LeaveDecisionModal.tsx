'use client';

import { useEffect, useState } from 'react';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/api/leave';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Textarea, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  mode: 'approve' | 'reject';
  request: LeaveRequest | null;
  onClose: () => void;
  onDone: () => void;
};

/** Confirm an approve/reject decision with an optional note. */
export function LeaveDecisionModal({ open, mode, request, onClose, onDone }: Props) {
  const toast = useToast();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setNote('');
  }, [open, request?.id]);

  async function handleConfirm() {
    if (!request) return;
    setSubmitting(true);
    try {
      const body = note.trim() ? { decisionNote: note.trim() } : undefined;
      if (mode === 'approve') {
        await leaveRequestsApi.approve(request.id, body);
        toast.success('Request approved');
      } else {
        await leaveRequestsApi.reject(request.id, body);
        toast.success('Request rejected');
      }
      onDone();
      onClose();
    } catch (err) {
      toast.error('Could not save decision', err instanceof ApiError ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  const isApprove = mode === 'approve';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isApprove ? 'Approve leave request' : 'Reject leave request'}
      description={
        request
          ? `${request.employeeName ?? 'Employee'} · ${request.leaveTypeName ?? 'Leave'} · ${request.days} day(s)`
          : undefined
      }
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'primary' : 'danger'}
            onClick={handleConfirm}
            loading={submitting}
          >
            {isApprove ? 'Approve' : 'Reject'}
          </Button>
        </>
      }
    >
      <Field label="Decision note" hint="Optional — shared with the requester">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={isApprove ? 'e.g. Approved, enjoy your break' : 'e.g. Insufficient balance'}
        />
      </Field>
    </Modal>
  );
}
