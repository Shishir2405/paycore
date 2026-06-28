/**
 * Idempotent seed: bootstraps a tenant so you can log in immediately.
 *
 *   npm run seed
 *
 * Creates (or reuses): one Company, the five system Roles with their default
 * permission grants, a Settings document, a SuperAdmin User, and a little sample
 * org data (departments, designations, a couple of employees) for the dashboard.
 *
 * Re-running is safe — everything is upserted by its natural unique key.
 *
 * `.env` is loaded manually below (before any module that reads it) so the script
 * works with a plain `tsx src/scripts/seed.ts` and no extra flags.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv(): void {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) {
    console.warn('⚠  No .env found — relying on shell environment. Copy .env.example → .env first.');
    return;
  }
  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    // Strip an inline `# comment` and surrounding quotes.
    if (!v.startsWith('"') && !v.startsWith("'")) v = v.split(' #')[0].trim();
    v = v.replace(/^["']|["']$/g, '');
    if (k && !(k in process.env)) process.env[k] = v;
  }
}

async function main(): Promise<void> {
  loadDotEnv();

  // Dynamic imports so env validation runs *after* .env is in process.env.
  const { dbConnect, dbDisconnect } = await import('@/lib/db/connect');
  const { env } = await import('@/config/env');
  const { Company } = await import('@/models/Company');
  const { Role } = await import('@/models/Role');
  const { User } = await import('@/models/User');
  const { Settings } = await import('@/models/Settings');
  const { Department } = await import('@/models/Department');
  const { Designation } = await import('@/models/Designation');
  const { Employee } = await import('@/models/Employee');
  const { hashPassword } = await import('@/lib/auth/password');
  const { SYSTEM_ROLES, DEFAULT_ROLE_PERMISSIONS } = await import('@/lib/rbac/permissions');

  await dbConnect();
  console.log('→ Connected to MongoDB');

  // 1) Company (tenant root)
  const company = await Company.findOneAndUpdate(
    { name: env.SEED_COMPANY_NAME },
    {
      $setOnInsert: {
        name: env.SEED_COMPANY_NAME,
        legalName: env.SEED_COMPANY_NAME,
        currency: 'INR',
        financialYearStartMonth: 4,
        isActive: true,
        locations: [{ name: 'Head Office', isHeadOffice: true, isActive: true, stateCode: '27' }],
        subscription: { plan: 'trial', status: 'trialing', seats: 5, employeeLimit: 25 },
      },
    },
    { new: true, upsert: true },
  );
  console.log(`→ Company: ${company.name} (${company._id})`);

  // 2) System roles
  const roleIds: Record<string, string> = {};
  for (const roleName of SYSTEM_ROLES) {
    const role = await Role.findOneAndUpdate(
      { companyId: company._id, name: roleName },
      {
        $setOnInsert: {
          companyId: company._id,
          name: roleName,
          description: `${roleName} (system role)`,
          isSystem: true,
        },
        // Keep permission grants in sync with the catalog on every seed.
        $set: { permissions: DEFAULT_ROLE_PERMISSIONS[roleName] },
      },
      { new: true, upsert: true },
    );
    roleIds[roleName] = String(role._id);
  }
  console.log(`→ Roles: ${SYSTEM_ROLES.join(', ')}`);

  // 3) Settings (one per company)
  await Settings.findOneAndUpdate(
    { companyId: company._id },
    { $setOnInsert: { companyId: company._id } },
    { upsert: true },
  );
  console.log('→ Settings initialized');

  // 4) SuperAdmin user
  const existingAdmin = await User.findOne({ companyId: company._id, email: env.SEED_ADMIN_EMAIL });
  if (!existingAdmin) {
    await User.create({
      companyId: company._id,
      name: 'Super Admin',
      email: env.SEED_ADMIN_EMAIL,
      passwordHash: await hashPassword(env.SEED_ADMIN_PASSWORD),
      roleId: roleIds.SuperAdmin,
      roleName: 'SuperAdmin',
      status: 'Active',
      isActive: true,
    });
    console.log(`→ SuperAdmin created: ${env.SEED_ADMIN_EMAIL} / ${env.SEED_ADMIN_PASSWORD}`);
  } else {
    console.log(`→ SuperAdmin already exists: ${env.SEED_ADMIN_EMAIL}`);
  }

  // 5) Sample org data (departments + designations) — handy for the dashboard.
  const deptDefs = [
    { name: 'Engineering', code: 'ENG' },
    { name: 'Human Resources', code: 'HR' },
    { name: 'Finance & Accounts', code: 'FIN' },
    { name: 'Sales & Marketing', code: 'SLS' },
  ];
  const deptIds: Record<string, string> = {};
  for (const d of deptDefs) {
    const dept = await Department.findOneAndUpdate(
      { companyId: company._id, code: d.code },
      { $setOnInsert: { companyId: company._id, name: d.name, code: d.code, isActive: true } },
      { new: true, upsert: true },
    );
    deptIds[d.code] = String(dept._id);
  }

  const desigDefs = [
    { name: 'Software Engineer', code: 'SE', level: 3 },
    { name: 'Senior Software Engineer', code: 'SSE', level: 4 },
    { name: 'HR Executive', code: 'HRE', level: 3 },
    { name: 'Accountant', code: 'ACC', level: 3 },
  ];
  const desigIds: Record<string, string> = {};
  for (const d of desigDefs) {
    const desig = await Designation.findOneAndUpdate(
      { companyId: company._id, code: d.code },
      { $setOnInsert: { companyId: company._id, name: d.name, code: d.code, level: d.level, isActive: true } },
      { new: true, upsert: true },
    );
    desigIds[d.code] = String(desig._id);
  }
  console.log(`→ Departments: ${deptDefs.length}, Designations: ${desigDefs.length}`);

  // 6) A couple of sample employees so the list/dashboard isn't empty.
  const sampleEmployees = [
    {
      employeeCode: 'EMP-0001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      email: 'aarav.sharma@acme.local',
      departmentId: deptIds.ENG,
      designationId: desigIds.SSE,
    },
    {
      employeeCode: 'EMP-0002',
      firstName: 'Diya',
      lastName: 'Patel',
      email: 'diya.patel@acme.local',
      departmentId: deptIds.HR,
      designationId: desigIds.HRE,
    },
  ];
  for (const e of sampleEmployees) {
    await Employee.findOneAndUpdate(
      { companyId: company._id, employeeCode: e.employeeCode },
      {
        $setOnInsert: {
          companyId: company._id,
          ...e,
          dateOfJoining: new Date('2024-04-01'),
          status: 'Active',
          statusHistory: [{ status: 'Active', effectiveDate: new Date('2024-04-01'), reason: 'Seed' }],
        },
      },
      { upsert: true },
    );
  }
  console.log(`→ Sample employees: ${sampleEmployees.length}`);

  await dbDisconnect();
  console.log('\n✅ Seed complete. Start the app with `npm run dev` and log in.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Seed failed:', err);
  process.exit(1);
});
