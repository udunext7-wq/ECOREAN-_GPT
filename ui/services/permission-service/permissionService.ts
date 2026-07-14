import type { ViewKey } from '../../src/types/dashboard';

export type RoleId =
  | 'CEO'
  | 'ADMIN'
  | 'MANAGER'
  | 'STAFF'
  | 'SITE_CREW'
  | 'CLIENT_VIEWER'
  | 'READ_ONLY_AUDITOR';

export type RoleRecord = {
  roleId: RoleId;
  displayNameKo: string;
  descriptionKo: string;
};

export type PermissionRecord = {
  permissionId: string;
  permissionKey: string;
  roleId: RoleId;
  allowed: boolean;
  descriptionKo: string;
};

export type PermissionAuditRecord = {
  auditEventId: string;
  actorId: string;
  roleId: RoleId;
  eventType: string;
  permissionKey: string;
  resourceType?: string;
  resourceId?: string;
  decision: 'ALLOWED' | 'DENIED';
  reasonKo: string;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type RoleSummaryRecord = RoleRecord & {
  allowedCount: number;
  deniedCount: number;
  restrictedCount: number;
  dangerousAllowed: string[];
  blockedFieldLabels: string[];
};

export type PermissionMatrixRecord = {
  roleId: RoleId;
  roleDisplayNameKo: string;
  permissionKey: string;
  descriptionKo: string;
  allowed: boolean;
  status: 'ALLOW' | 'DENY' | 'RESTRICTED';
  isDangerous: boolean;
};

export type AccessDeniedReasonRecord = {
  roleId: RoleId | 'UNKNOWN';
  roleDisplayNameKo: string;
  permissionKey: string;
  routeKey?: string;
  reasonKo: string;
  actionKo: string;
  safeForCustomer: boolean;
  hiddenDetails: string[];
};

export type RoleVisibilityPreviewRecord = {
  roleId: RoleId;
  roleDisplayNameKo: string;
  visibleFieldKeys: string[];
  hiddenFieldLabels: string[];
  previewPayload: Record<string, unknown>;
  customerSafe: boolean;
};

export type PermissionAdminData = {
  currentUser: {
    userId: string;
    userNameKo: string;
    userStatus: string;
    roleId: RoleId;
    roleDisplayNameKo: string;
    isLocalMock: boolean;
  };
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  routePermissionMap: Partial<Record<ViewKey, string>>;
  visibleRoutes: ViewKey[];
  recentAudit: PermissionAuditRecord[];
  roleSummaries?: RoleSummaryRecord[];
  permissionMatrix?: PermissionMatrixRecord[];
  dangerousPermissions?: Array<{ permissionKey: string; descriptionKo: string }>;
  auditEventFilters?: string[];
  accessDeniedSamples?: AccessDeniedReasonRecord[];
  visibilityPreview?: RoleVisibilityPreviewRecord[];
  uxVersion?: string;
  externalAuthentication: 'DISABLED';
  securityModel: 'LOCAL_INTERNAL_RBAC';
};

const fallback: PermissionAdminData = {
  currentUser: {
    userId: 'USER-LOCAL-RBAC',
    userNameKo: '로컬 운영 사용자',
    roleId: 'CEO',
    roleDisplayNameKo: '대표',
    userStatus: 'ACTIVE',
    isLocalMock: true
  },
  roles: [],
  permissions: [],
  routePermissionMap: {},
  visibleRoutes: [],
  recentAudit: [],
  externalAuthentication: 'DISABLED',
  securityModel: 'LOCAL_INTERNAL_RBAC'
};

export async function loadPermissionAdminData(): Promise<PermissionAdminData> {
  const api = window.ecorean?.bocDb;
  if (api?.getRolePermissionCenterData) {
    return api.getRolePermissionCenterData() as Promise<PermissionAdminData>;
  }
  if (api?.getPermissionAdminData) {
    const legacy = await api.getPermissionAdminData() as Record<string, unknown>;
    return { ...fallback, ...legacy } as PermissionAdminData;
  }
  return fallback;
}

export async function evaluatePermission(permissionKey: string, roleId?: RoleId) {
  return window.ecorean?.bocDb?.evaluateRolePermission?.({ roleId, permissionKey }) as Promise<{
    allowed: boolean;
    roleId: RoleId;
    permissionKey: string;
    reasonKo: string;
  } | undefined>;
}

export async function loadPermissionAuditEvents(payload: Record<string, unknown> = {}) {
  return window.ecorean?.bocDb?.getPermissionAuditEvents?.(payload) as Promise<PermissionAuditRecord[] | undefined>;
}

export function hasPermission(data: PermissionAdminData | null, permissionKey?: string) {
  if (!permissionKey) return true;
  if (!data) return false;
  return data.permissions.some((item) => (
    item.roleId === data.currentUser.roleId
    && item.permissionKey === permissionKey
    && item.allowed
  ));
}

export function getRoutePermission(data: PermissionAdminData | null, view: ViewKey) {
  return data?.routePermissionMap?.[view];
}

export function canAccessView(data: PermissionAdminData | null, view: ViewKey) {
  const permissionKey = getRoutePermission(data, view);
  return !permissionKey || hasPermission(data, permissionKey);
}
