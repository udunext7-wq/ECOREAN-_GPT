export type RoleRecord = {
  roleId: string;
  roleName: string;
  displayNameKo: string;
  descriptionKo: string;
};

export type PermissionRecord = {
  permissionId: string;
  permissionKey: string;
  roleId: string;
  allowed: boolean;
  descriptionKo: string;
};

export type PermissionLogRecord = {
  permissionLogId: string;
  userId: string;
  roleId: string;
  permissionKey: string;
  actionType: string;
  allowed: boolean;
  reasonKo: string;
  createdAt: string;
};

export type PermissionAdminData = {
  currentUser: {
    userId: string;
    userNameKo: string;
    roleId: string;
    userStatus: string;
    isLocalMock: boolean;
  };
  roles: RoleRecord[];
  permissions: PermissionRecord[];
  recentLogs: PermissionLogRecord[];
};

const fallback: PermissionAdminData = {
  currentUser: {
    userId: 'USER-LOCAL-CEO',
    userNameKo: '대표',
    roleId: 'CEO',
    userStatus: 'ACTIVE',
    isLocalMock: true
  },
  roles: [],
  permissions: [],
  recentLogs: []
};

export async function loadPermissionAdminData(): Promise<PermissionAdminData> {
  if (!window.ecorean?.bocDb?.getPermissionAdminData) return fallback;
  return window.ecorean.bocDb.getPermissionAdminData() as Promise<PermissionAdminData>;
}
