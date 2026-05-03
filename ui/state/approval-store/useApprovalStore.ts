import { useState } from 'react';
import { emptyDashboardData } from '../../src/data/emptyDashboardData';
import type { ApprovalItem, DashboardData } from '../../src/types/dashboard';
import { canApproveMasterDbChange } from '../../services/approval-service/approvalService';
import { decideApproval } from '../../services/dashboard-db-service/dashboardDbService';

export function useApprovalStore(onDashboardDataChanged?: (data: DashboardData) => void) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(emptyDashboardData.approvals);
  const [approvalMessageKo, setApprovalMessageKo] = useState('승인 대기 항목을 SQLite에서 불러오는 중입니다.');

  async function approve(approvalId: string) {
    const target = approvals.find((item) => item.approvalId === approvalId);
    if (!target) return;

    if (!canApproveMasterDbChange(target)) {
      setApprovalMessageKo('rollbackData가 없어서 Master DB 변경을 승인할 수 없습니다.');
      return;
    }

    const data = await decideApproval({ approvalId, decision: 'APPROVED', actor: 'CEO', reasonKo: '대표 승인' });
    setApprovals(data.approvals);
    onDashboardDataChanged?.(data);
    setApprovalMessageKo(`${target.titleKo} 승인 완료`);
  }

  async function reject(approvalId: string) {
    const target = approvals.find((item) => item.approvalId === approvalId);
    if (!target) return;

    const data = await decideApproval({ approvalId, decision: 'REJECTED', actor: 'CEO', reasonKo: '대표 반려' });
    setApprovals(data.approvals);
    onDashboardDataChanged?.(data);
    setApprovalMessageKo(`${target.titleKo} 반려 완료`);
  }

  async function revise(approvalId: string) {
    const target = approvals.find((item) => item.approvalId === approvalId);
    if (!target) return;

    const data = await decideApproval({ approvalId, decision: 'REVISION_REQUESTED', actor: 'CEO', reasonKo: '대표 수정 요청' });
    setApprovals(data.approvals);
    onDashboardDataChanged?.(data);
    setApprovalMessageKo(`${target.titleKo} 수정 요청 완료`);
  }

  function syncApprovals(nextData: DashboardData) {
    setApprovals(nextData.approvals);
  }

  return { approvals, approvalMessageKo, approve, reject, revise, syncApprovals };
}
