'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { RequirePermission } from '@/components/auth/RequirePermission';
import { DesignationForm } from '@/components/modules/departments/DesignationForm';

export default function NewDesignationPage() {
  return (
    <RequirePermission permission="departments:create">
      <PageHeader title="Add designation" description="Create a new job title or grade." />
      <DesignationForm />
    </RequirePermission>
  );
}
