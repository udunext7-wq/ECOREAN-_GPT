import type { ReactNode } from 'react';
import {
  hasPermission,
  type PermissionAdminData
} from '../services/permission-service/permissionService';

type Props = {
  data: PermissionAdminData | null;
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({ data, permission, children, fallback = null }: Props) {
  return hasPermission(data, permission) ? <>{children}</> : <>{fallback}</>;
}
