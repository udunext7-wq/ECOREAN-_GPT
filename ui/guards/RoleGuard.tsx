import type { ReactNode } from 'react';
import { AccessDeniedView } from '../app/shared/AccessDeniedView';
import {
  hasPermission,
  type PermissionAdminData,
  type RoleId
} from '../services/permission-service/permissionService';

type Props = {
  data: PermissionAdminData | null;
  permission?: string;
  roles?: RoleId[];
  children: ReactNode;
};

export function RoleGuard({ data, permission, roles, children }: Props) {
  const roleAllowed = !roles?.length || Boolean(data && roles.includes(data.currentUser.roleId));
  const permissionAllowed = hasPermission(data, permission);
  if (!roleAllowed || !permissionAllowed) {
    return (
      <AccessDeniedView
        permissionKey={permission}
        roleNameKo={data?.currentUser.roleDisplayNameKo}
      />
    );
  }
  return <>{children}</>;
}
