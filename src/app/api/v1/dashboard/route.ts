import { withRoute } from '@/server/middlewares/with-route';
import { ok } from '@/lib/utils/api-response';
import { permission } from '@/lib/rbac/permissions';
import { Employee } from '@/models/Employee';
import { Department } from '@/models/Department';

export const runtime = 'nodejs';

/** Lightweight role-aware dashboard summary. Trend/payroll figures arrive with the payroll engine. */
export const GET = withRoute(
  async ({ auth }) => {
    const base = { companyId: auth.companyId, isDeleted: false };

    const [total, active, onNotice, exited, departments] = await Promise.all([
      Employee.countDocuments(base),
      Employee.countDocuments({ ...base, status: 'Active' }),
      Employee.countDocuments({ ...base, status: 'OnNotice' }),
      Employee.countDocuments({ ...base, status: 'Exited' }),
      Department.countDocuments(base),
    ]);

    return ok({
      employees: { total, active, onNotice, exited },
      departments,
      // Placeholders until the payroll/compliance engines land (Phase 2).
      monthlyPayrollCost: 0,
      pendingApprovals: 0,
      upcomingDeadlines: [],
    });
  },
  { permission: permission('dashboard', 'view') },
);
