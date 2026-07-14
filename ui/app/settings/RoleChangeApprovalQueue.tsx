import { useEffect, useState } from 'react';
import type { PermissionAdminData } from '../../services/permission-service/permissionService';
import {
  getRoleChangeApprovalSummary,
  listRoleChangeRequests,
  type RoleChangeApprovalSummary,
  type RoleChangeRequestRecord,
  type RoleChangeStatus
} from '../../services/permission-service/roleChangeApprovalService';
import { RoleChangeApprovalDetail } from './RoleChangeApprovalDetail';

type Props = {
  currentUser: PermissionAdminData['currentUser'];
  refreshKey: number;
  onMessage: (messageKo: string) => void;
  onRoleApplied: () => Promise<void>;
};

export function RoleChangeApprovalQueue({ currentUser, refreshKey, onMessage, onRoleApplied }: Props) {
  const [requests, setRequests] = useState<RoleChangeRequestRecord[]>([]);
  const [summary, setSummary] = useState<RoleChangeApprovalSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState<RoleChangeStatus | 'ALL'>('ALL');
  const [selectedId, setSelectedId] = useState('');

  async function refresh() {
    const [nextRequests, nextSummary] = await Promise.all([
      listRoleChangeRequests(statusFilter === 'ALL' ? {} : { status: statusFilter }),
      getRoleChangeApprovalSummary()
    ]);
    setRequests(nextRequests || []);
    setSummary(nextSummary || null);
    if (!selectedId && nextRequests?.length) setSelectedId(nextRequests[0].requestId);
  }

  useEffect(() => {
    refresh().catch((error) => onMessage(error instanceof Error ? error.message : '승인 Queue 조회 실패'));
  }, [refreshKey, statusFilter]);

  const selected = requests.find((request) => request.requestId === selectedId) || requests[0];

  async function handleUpdated(messageKo: string, roleApplied = false) {
    onMessage(messageKo);
    await refresh();
    if (roleApplied) await onRoleApplied();
  }

  return (
    <section className="estimate-preview-card role-change-approval-queue">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">APPROVAL QUEUE</span>
          <h5>역할 변경 승인 Queue</h5>
        </div>
        <button onClick={() => refresh()}>새로고침</button>
      </div>
      <div className="role-status-strip">
        <span>전체 {summary?.total || 0}</span>
        <span>대기 {summary?.byStatus?.PENDING || 0}</span>
        <span>고위험 대기 {summary?.highRiskPending || 0}</span>
        <strong>직접 역할 변경 {summary?.directRoleChange === 'BLOCKED' ? '차단' : '확인 필요'}</strong>
      </div>
      <div className="role-control-row">
        <label>
          <span>상태 필터</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as RoleChangeStatus | 'ALL')}>
            <option value="ALL">전체 상태</option>
            {['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'APPLIED', 'FAILED']
              .map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
        <label>
          <span>요청 선택</span>
          <select value={selected?.requestId || ''} onChange={(event) => setSelectedId(event.target.value)}>
            {requests.map((request) => (
              <option key={request.requestId} value={request.requestId}>
                {request.status} / {request.currentRole} → {request.requestedRole}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!selected ? (
        <p className="small-note">조건에 맞는 역할 변경 요청이 없습니다.</p>
      ) : (
        <RoleChangeApprovalDetail request={selected} currentUser={currentUser} onUpdated={handleUpdated} />
      )}
      <p className="small-note">외부 인증 provider는 비활성 상태이며 로컬 내부 승인 경계를 검증합니다.</p>
    </section>
  );
}
