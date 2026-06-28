import { z } from 'zod';
import { ALL_PERMISSIONS } from '@/lib/rbac/permissions';

const PERMISSION_SET = new Set(ALL_PERMISSIONS);

/** Permissions must be drawn from the central catalog — reject unknown keys. */
const permissionList = z
  .array(z.string())
  .default([])
  .refine((perms) => perms.every((p) => PERMISSION_SET.has(p)), {
    message: 'Contains an unknown permission key',
  });

export const roleCreateSchema = z.object({
  name: z.string().trim().min(1, 'Role name is required'),
  description: z.string().trim().optional(),
  permissions: permissionList,
});

export const roleUpdateSchema = roleCreateSchema.partial();

export type RoleCreateInput = z.infer<typeof roleCreateSchema>;
export type RoleUpdateInput = z.infer<typeof roleUpdateSchema>;
