'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveRequestCreateSchema, type LeaveRequestCreateInput } from '@/lib/validators/leave';
import { leaveRequestsApi, type LeaveType } from '@/lib/api/leave';
import { api, ApiError } from '@/lib/api/client';
import type { Employee } from '@/lib/api/employees';
import { Modal, Field, Input, Textarea, Select, DatePicker, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Create a new leave request. Loads employee + leave-type options on open.
 * Editing of existing requests happens inline elsewhere; this modal is create-only.
 */
export function LeaveRequestFormModal({ open, onClose, onSaved }: Props) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeaveRequestCreateInput>({
    resolver: zodResolver(leaveRequestCreateSchema),
    defaultValues: { days: 1 },
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      try {
        const [emp, lt] = await Promise.all([
          api.list<Employee>('/employees', { limit: 100, sortBy: 'firstName', sortDir: 'asc' }),
          api.list<LeaveType>('/leave-types', { limit: 100, isActive: 'true', sortBy: 'name', sortDir: 'asc' }),
        ]);
        if (!active) return;
        setEmployees(emp.data);
        setTypes(lt.data);
      } catch {
        // Options are best-effort; the empty selects still render.
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  async function onSubmit(values: LeaveRequestCreateInput) {
    try {
      await leaveRequestsApi.create(values);
      toast.success('Leave request submitted');
      reset({ days: 1 });
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not submit request', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New leave request"
      description="Apply for leave on behalf of an employee"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="leave-request-form" loading={isSubmitting}>
            Submit request
          </Button>
        </>
      }
    >
      <form
        id="leave-request-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Employee" required error={errors.employeeId?.message}>
          <Select
            {...register('employeeId')}
            invalid={!!errors.employeeId}
            placeholder="Select employee"
            options={employees.map((e) => ({ label: `${e.fullName} (${e.employeeCode})`, value: e.id }))}
          />
        </Field>
        <Field label="Leave type" required error={errors.leaveTypeId?.message}>
          <Select
            {...register('leaveTypeId')}
            invalid={!!errors.leaveTypeId}
            placeholder="Select type"
            options={types.map((t) => ({ label: `${t.name} (${t.code})`, value: t.id }))}
          />
        </Field>
        <Field label="From date" required error={errors.fromDate?.message}>
          <DatePicker {...register('fromDate')} invalid={!!errors.fromDate} />
        </Field>
        <Field label="To date" required error={errors.toDate?.message}>
          <DatePicker {...register('toDate')} invalid={!!errors.toDate} />
        </Field>
        <Field label="Days" required error={errors.days?.message} hint="Use 0.5 for half-days">
          <Input type="number" step="0.5" min="0.5" {...register('days')} invalid={!!errors.days} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reason" error={errors.reason?.message}>
            <Textarea {...register('reason')} rows={2} placeholder="Optional reason for the leave" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
