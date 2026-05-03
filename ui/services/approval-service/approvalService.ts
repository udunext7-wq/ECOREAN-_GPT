import type { ApprovalItem } from '../../src/types/dashboard';

export function approveItem(item: ApprovalItem): ApprovalItem {
  return { ...item, status: 'APPROVED' };
}

export function rejectItem(item: ApprovalItem): ApprovalItem {
  return { ...item, status: 'REJECTED' };
}

export function requestRevision(item: ApprovalItem): ApprovalItem {
  return { ...item, status: 'REVISION_REQUESTED' };
}

export function canApproveMasterDbChange(item: ApprovalItem): boolean {
  if (item.approvalType !== 'MasterDbUpdateRequest') {
    return true;
  }

  return item.rollbackRequired && item.rollbackStatus === 'READY';
}
