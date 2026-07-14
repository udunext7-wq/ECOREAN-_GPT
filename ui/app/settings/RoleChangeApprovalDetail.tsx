import { useState } from 'react';
import type { PermissionAdminData } from '../../services/permission-service/permissionService';
import {
  applyApprovedRoleChange,
  approveRoleChangeRequest,
  cancelRoleChangeRequest,
  expireRoleChangeRequest,
  rejectRoleChangeRequest,
  type RoleChangeRequestRecord
} from '../../services/permission-service/roleChangeApprovalService';

type Props = {
  request: RoleChangeRequestRecord;
  currentUser: PermissionAdminData['currentUser'];
  onUpdated: (messageKo: string, roleApplied?: boolean) => Promise<void>;
};

export function RoleChangeApprovalDetail({ request, currentUser, onUpdated }: Props) {
  const [approverId, setApproverId] = useState('USER-LOCAL-APPROVER');
  const [noteKo, setNoteKo] = useState('권한 범위와 위험 권한 검토 완료');
  const [busy, setBusy] = useState(false);

  async function run(action: 'APPROVE' | 'REJECT' | 'CANCEL' | 'EXPIRE' | 'APPLY') {
    setBusy(true);
    try {
      const approver = {
        approverId,
        approverRole: currentUser.roleId,
        actorId: approverId,
        actorRole: currentUser.roleId,
        noteKo,
        reasonKo: noteKo
      };
      if (action === 'APPROVE') await approveRoleChangeRequest(request.requestId, approver);
      if (action === 'REJECT') await rejectRoleChangeRequest(request.requestId, approver);
      if (action === 'CANCEL') {
        await cancelRoleChangeRequest(request.requestId, {
          actorId: currentUser.userId,
          actorRole: currentUser.roleId,
          reasonKo: noteKo
        });
      }
      if (action === 'EXPIRE') await expireRoleChangeRequest(request.requestId, approver);
      if (action === 'APPLY') await applyApprovedRoleChange(request.requestId, approver);
      await onUpdated(`${action} 처리가 완료되었습니다.`, action === 'APPLY');
    } catch (error) {
      await onUpdated(error instanceof Error ? error.message : '역할 변경 요청 처리에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={request.riskLevel === 'HIGH' ? 'estimate-preview-card warning-row' : 'estimate-preview-card'}>
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">{request.requestId}</span>
          <h5>{request.currentRole} → {request.requestedRole}</h5>
        </div>
        <strong>{request.status} / {request.riskLevel}</strong>
      </div>
      <p>{request.reasonKo}</p>
      <div className="permission-summary-grid">
        <div className="permission-group">
          <h5>추가 권한</h5>
          {request.permissionDiff.addedPermissions.length
            ? request.permissionDiff.addedPermissions.map((key) => <p className="small-note" key={key}>{key}</p>)
            : <p className="small-note">추가 권한 없음</p>}
        </div>
        <div className="permission-group">
          <h5>제거 권한</h5>
          {request.permissionDiff.removedPermissions.length
            ? request.permissionDiff.removedPermissions.map((key) => <p className="small-note" key={key}>{key}</p>)
            : <p className="small-note">제거 권한 없음</p>}
        </div>
        <div className="permission-group">
          <h5>고위험 추가 권한</h5>
          {request.permissionDiff.dangerousAddedPermissions.length
            ? request.permissionDiff.dangerousAddedPermissions.map((key) => <p className="small-note" key={key}>{key}</p>)
            : <p className="small-note">고위험 추가 권한 없음</p>}
        </div>
      </div>
      <div className="role-control-row">
        <label>
          <span>승인자 ID</span>
          <input value={approverId} onChange={(event) => setApproverId(event.target.value)} />
        </label>
        <label>
          <span>검토 메모</span>
          <input value={noteKo} onChange={(event) => setNoteKo(event.target.value)} />
        </label>
      </div>
      <div className="role-control-row">
        {request.status === 'PENDING' ? <button disabled={busy} onClick={() => run('APPROVE')}>승인</button> : null}
        {request.status === 'PENDING' ? <button disabled={busy} onClick={() => run('REJECT')}>반려</button> : null}
        {request.status === 'DRAFT' || request.status === 'PENDING'
          ? <button disabled={busy} onClick={() => run('CANCEL')}>취소</button>
          : null}
        {request.status === 'PENDING' ? <button disabled={busy} onClick={() => run('EXPIRE')}>만료 처리</button> : null}
        {request.status === 'APPROVED' ? <button disabled={busy} onClick={() => run('APPLY')}>승인 역할 적용</button> : null}
      </div>
      {request.failureReasonKo ? <p className="small-note">실패 사유: {request.failureReasonKo}</p> : null}
      <p className="small-note">요청자와 같은 승인자 ID는 자기 승인으로 차단됩니다.</p>
    </section>
  );
}
