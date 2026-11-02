export type StaffRole =
  | 'SUPER_ADMIN'
  | 'OPERATIONS'
  | 'PRODUCTION'
  | 'QC'
  | 'PACKING'
  | 'SUPPORT'
  | 'CONTENT'
  | 'ANALYTICS';

export type Permission =
  | 'products.read'
  | 'products.write'
  | 'orders.read'
  | 'orders.update'
  | 'production.run'
  | 'production.assign'
  | 'qc.perform'
  | 'packing.perform'
  | 'materials.read'
  | 'materials.write'
  | 'suppliers.manage'
  | 'purchasing.manage'
  | 'refunds.issue'
  | 'giftcards.issue'
  | 'analytics.view'
  | 'cms.edit'
  | 'security.manage'
  | 'users.manage';

export const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  SUPER_ADMIN: [
    'products.read',
    'products.write',
    'orders.read',
    'orders.update',
    'production.run',
    'production.assign',
    'qc.perform',
    'packing.perform',
    'materials.read',
    'materials.write',
    'suppliers.manage',
    'purchasing.manage',
    'refunds.issue',
    'giftcards.issue',
    'analytics.view',
    'cms.edit',
    'security.manage',
    'users.manage',
  ],
  OPERATIONS: [
    'products.read',
    'orders.read',
    'orders.update',
    'production.run',
    'production.assign',
    'qc.perform',
    'packing.perform',
    'materials.read',
    'materials.write',
    'suppliers.manage',
    'purchasing.manage',
    'analytics.view',
  ],
  PRODUCTION: [
    'orders.read',
    'production.run',
    'production.assign',
    'materials.read',
    'materials.write',
  ],
  QC: [
    'orders.read',
    'qc.perform',
    'production.run',
  ],
  PACKING: [
    'orders.read',
    'packing.perform',
    'materials.read',
  ],
  SUPPORT: [
    'orders.read',
    'orders.update',
    'products.read',
  ],
  CONTENT: [
    'products.read',
    'products.write',
    'cms.edit',
  ],
  ANALYTICS: [
    'orders.read',
    'products.read',
    'analytics.view',
  ],
};

/**
 * Checks whether a user has the specified permission.
 * SUPER_ADMIN role always has full permission.
 */
export function hasPermission(
  user: { role?: string; staffRole?: string | null; permissions?: string[] },
  requiredPermission: Permission,
): boolean {
  if (user.role === 'SUPER_ADMIN' || user.staffRole === 'SUPER_ADMIN') {
    return true;
  }

  // Check custom individual permissions override
  if (user.permissions && user.permissions.includes(requiredPermission)) {
    return true;
  }

  // Check role-based permissions
  if (user.staffRole && ROLE_PERMISSIONS[user.staffRole as StaffRole]) {
    return ROLE_PERMISSIONS[user.staffRole as StaffRole].includes(requiredPermission);
  }

  // Legacy ADMIN role has broad operational permissions except super-admin security
  if (user.role === 'ADMIN' && requiredPermission !== 'security.manage') {
    return true;
  }

  return false;
}

