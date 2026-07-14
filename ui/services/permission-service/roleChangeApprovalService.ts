import type { RoleId } from './permissionService';

export type RoleChangeStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'APPLIED'
  | 'FAILED';

export type RoleChangeRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RolePermissionDiff = {
  currentRole: RoleId;
  requestedRole: RoleId;
  addedPermissions: string[];
  removedPermissions: string[];
  unchangedPermissionCount: number;
  dangerousAddedPermissions: string[];
  riskReasons?: string[];
};

export type RoleChangeRequestRecord = {
  requestId: string;
  requesterId: string;
  requesterRole: RoleId;
  targetUserId: string;
  currentRole: RoleId;
  requestedRole: RoleId;
  reasonKo: string;
  status: RoleChangeStatus;
  riskLevel: RoleChangeRiskLevel;
  permissionDiff: RolePermissionDiff;
  approvedBy: string;
  approvedAt: string;
  rejectedBy: string;
  rejectedAt: string;
  cancelledBy: string;
  cancelledAt: string;
  expiredAt: string;
  appliedAt: string;
  failedAt: string;
  failureReasonKo: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  events: Array<{
    eventId: string;
    action: string;
    actorId: string;
    actorRole: string;
    beforeStatus: string;
    afterStatus: string;
    noteKo: string;
    createdAt: string;
  }>;
};

export type RoleChangeApprovalSummary = {
  total: number;
  byStatus: Record<RoleChangeStatus, number>;
  highRiskPending: number;
  externalAuthentication: 'DISABLED';
  directRoleChange: 'BLOCKED';
  workflowVersion: string;
};

function api() {
  return window.ecorean?.bocDb;
}

export async function createRoleChangeRequest(payload: Record<string, unknown>) {
  if (!api()?.createRoleChangeRequest) throw new Error('역할 변경 요청 API를 사용할 수 없습니다.');
  return api()!.createRoleChangeRequest(payload) as Promise<RoleChangeRequestRecord>;
}

export async function submitRoleChangeRequest(requestId: string, payload: Record<string, unknown> = {}) {
  return api()?.submitRoleChangeRequest?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function getRoleChangeRequest(requestId: string) {
  return api()?.getRoleChangeRequest?.({ requestId }) as Promise<RoleChangeRequestRecord>;
}

export async function listRoleChangeRequests(payload: Record<string, unknown> = {}) {
  return (api()?.listRoleChangeRequests?.(payload) || Promise.resolve([])) as Promise<RoleChangeRequestRecord[]>;
}

export async function approveRoleChangeRequest(requestId: string, payload: Record<string, unknown>) {
  return api()?.approveRoleChangeRequest?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function rejectRoleChangeRequest(requestId: string, payload: Record<string, unknown>) {
  return api()?.rejectRoleChangeRequest?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function cancelRoleChangeRequest(requestId: string, payload: Record<string, unknown>) {
  return api()?.cancelRoleChangeRequest?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function expireRoleChangeRequest(requestId: string, payload: Record<string, unknown> = {}) {
  return api()?.expireRoleChangeRequest?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function applyApprovedRoleChange(requestId: string, payload: Record<string, unknown>) {
  return api()?.applyApprovedRoleChange?.({ requestId, ...payload }) as Promise<RoleChangeRequestRecord>;
}

export async function getRoleChangeApprovalSummary() {
  return api()?.getRoleChangeApprovalSummary?.() as Promise<RoleChangeApprovalSummary>;
}
