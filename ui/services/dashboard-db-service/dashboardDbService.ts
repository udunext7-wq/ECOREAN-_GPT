import { emptyDashboardData } from '../../src/data/emptyDashboardData';
import type { DashboardData } from '../../src/types/dashboard';

export type ApprovalDecisionPayload = {
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  actor?: string;
  reasonKo?: string;
};

export type ActionRecordPayload = {
  actionType: 'BLOCK' | 'ORDER' | 'CLAIM' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  actor?: string;
  projectId?: string;
  approvalId?: string | null;
  reasonKo?: string;
  payload?: Record<string, unknown>;
};

export async function loadDashboardData(): Promise<DashboardData> {
  if (window.ecorean?.bocDb) {
    return window.ecorean.bocDb.getDashboardData();
  }

  return emptyDashboardData;
}

export async function decideApproval(payload: ApprovalDecisionPayload): Promise<DashboardData> {
  if (window.ecorean?.bocDb) {
    return window.ecorean.bocDb.decideApproval(payload);
  }

  return emptyDashboardData;
}

export async function recordDashboardAction(payload: ActionRecordPayload): Promise<DashboardData> {
  if (window.ecorean?.bocDb) {
    return window.ecorean.bocDb.recordAction(payload);
  }

  return emptyDashboardData;
}
