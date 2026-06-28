'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { attendanceCreateSchema, type AttendanceCreateInput } from '@/lib/validators/attendance';
import { attendanceApi, type Attendance } from '@/lib/api/attendance';
import { employeesApi, type Employee } from '@/lib/api/employees';
import { shiftsApi, type Shift } from '@/lib/api/shifts';
import { ApiError } from '@/lib/api/client';
import { ATTENDANCE_STATUSES } from '@/models/Attendance';
import { Modal, Field, Input, Select, DatePicker, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  record?: Attendance | null;
};

export function AttendanceFormModal({ open, onClose, onSaved, record }: Props) {
  const toast = useToast();
  const isEdit = Boolean(record);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AttendanceCreateInput>({
    resolver: zodResolver(attendanceCreateSchema),
    defaultValues: record
      ? {
          employeeId: record.employeeId ?? '',
          shiftId: record.shiftId ?? '',
          date: record.date?.slice(0, 10) as unknown as Date,
          status: record.status as AttendanceCreateInput['status'],
          inTime: record.inTime ?? '',
          outTime: record.outTime ?? '',
          remarks: record.remarks,
        }
      : { status: 'Present' },
  });

  // Load pickers when the modal opens.
  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      try {
        const [emp, shf] = await Promise.all([
          employeesApi.list({ limit: 100, sortBy: 'firstName', sortDir: 'asc' }),
          shiftsApi.list({ limit: 100, isActive: 'true' }),
        ]);
        if (!active) return;
        setEmployees(emp.data);
        setShifts(shf.data);
      } catch {
        // Non-fatal: the form still renders, just without options.
      }
    })();
    return () => {
      active = false;
    };
  }, [open]);

  async function onSubmit(values: AttendanceCreateInput) {
    try {
      if (isEdit && record) {
        await attendanceApi.update(record.id, values);
        toast.success('Attendance updated');
      } else {
        await attendanceApi.create(values);
        toast.success('Attendance saved');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save attendance', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit attendance' : 'Mark attendance'}
      description={isEdit ? `Updating ${record?.employeeName ?? 'record'}` : 'Overtime is computed from the shift'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="attendance-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Save'}
          </Button>
        </>
      }
    >
      <form id="attendance-form" onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Employee" required error={errors.employeeId?.message} className="sm:col-span-2">
          <Select
            {...register('employeeId')}
            invalid={!!errors.employeeId}
            placeholder="Select employee"
            options={employees.map((e) => ({ label: `${e.fullName} (${e.employeeCode})`, value: e.id }))}
            disabled={isEdit}
          />
        </Field>
        <Field label="Date" required error={errors.date?.message}>
          <DatePicker {...register('date')} invalid={!!errors.date} disabled={isEdit} />
        </Field>
        <Field label="Status" error={errors.status?.message}>
          <Select
            {...register('status')}
            options={ATTENDANCE_STATUSES.map((s) => ({ label: s, value: s }))}
          />
        </Field>
        <Field label="In time" error={errors.inTime?.message} hint="HH:mm">
          <Input type="time" {...register('inTime')} invalid={!!errors.inTime} />
        </Field>
        <Field label="Out time" error={errors.outTime?.message} hint="HH:mm">
          <Input type="time" {...register('outTime')} invalid={!!errors.outTime} />
        </Field>
        <Field label="Shift (overtime basis)" error={errors.shiftId?.message} className="sm:col-span-2">
          <Select
            {...register('shiftId')}
            placeholder="Use employee's default shift"
            options={shifts.map((s) => ({ label: `${s.name} (${s.startTime}–${s.endTime})`, value: s.id }))}
          />
        </Field>
        <Field label="Remarks" error={errors.remarks?.message} className="sm:col-span-2">
          <Input {...register('remarks')} placeholder="Optional note" />
        </Field>
      </form>
    </Modal>
  );
}
