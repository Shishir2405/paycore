'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { costCenterCreateSchema, type CostCenterCreateInput } from '@/lib/validators/finance';
import { financeApi, type CostCenter } from '@/lib/api/finance';
import { ApiError } from '@/lib/api/client';
import { Modal, Field, Input, Select, Textarea, Button, useToast } from '@/components/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  costCenter?: CostCenter | null;
};

export function CostCenterFormModal({ open, onClose, onSaved, costCenter }: Props) {
  const toast = useToast();
  const isEdit = Boolean(costCenter);
  const [parents, setParents] = useState<CostCenter[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CostCenterCreateInput>({
    resolver: zodResolver(costCenterCreateSchema),
    defaultValues: costCenter
      ? {
          name: costCenter.name,
          code: costCenter.code,
          description: costCenter.description ?? '',
          parentId: costCenter.parentId ?? '',
          isActive: costCenter.isActive,
        }
      : { isActive: true },
  });

  // Load potential parents (excluding self) when the modal opens.
  useEffect(() => {
    if (!open) return;
    financeApi.costCenters
      .list({ limit: 100, sortBy: 'code', sortDir: 'asc' })
      .then((res) => setParents(res.data.filter((c) => c.id !== costCenter?.id)))
      .catch(() => setParents([]));
  }, [open, costCenter?.id]);

  async function onSubmit(values: CostCenterCreateInput) {
    try {
      if (isEdit && costCenter) {
        await financeApi.costCenters.update(costCenter.id, values);
        toast.success('Cost center updated');
      } else {
        await financeApi.costCenters.create(values);
        toast.success('Cost center created');
      }
      reset();
      onSaved();
      onClose();
    } catch (err) {
      toast.error('Could not save cost center', err instanceof ApiError ? err.message : undefined);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit cost center' : 'Add cost center'}
      description={isEdit ? `Updating ${costCenter?.code}` : 'Create a finance cost dimension'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" form="cost-center-form" loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create cost center'}
          </Button>
        </>
      }
    >
      <form
        id="cost-center-form"
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register('name')} invalid={!!errors.name} placeholder="Engineering" />
        </Field>
        <Field label="Code" required error={errors.code?.message}>
          <Input {...register('code')} invalid={!!errors.code} placeholder="ENG" className="uppercase" />
        </Field>
        <Field label="Parent cost center" error={errors.parentId?.message}>
          <Select
            {...register('parentId')}
            placeholder="None (top level)"
            options={parents.map((p) => ({ label: `${p.name} (${p.code})`, value: p.id }))}
          />
        </Field>
        <Field label="Active" error={errors.isActive?.message}>
          <Select
            {...register('isActive', { setValueAs: (v) => v === 'true' })}
            options={[
              { label: 'Active', value: 'true' },
              { label: 'Inactive', value: 'false' },
            ]}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" error={errors.description?.message}>
            <Textarea {...register('description')} rows={2} placeholder="Optional notes" />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
