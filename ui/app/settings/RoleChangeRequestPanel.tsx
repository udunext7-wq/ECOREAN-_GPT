import { useState } from 'react';
import type { PermissionAdminData, RoleId } from '../../services/permission-service/permissionService';

type Props = {
  data: PermissionAdminData | null;
  onRequest: (roleId: RoleId, reasonKo: string, submit: boolean) => Promise<void>;
};

export function RoleChangeRequestPanel({ data, onRequest }: Props) {
  const [requestedRole, setRequestedRole] = useState<RoleId>('MANAGER');
  const [reasonKo, setReasonKo] = useState('업무 범위 변경에 따른 역할 조정 요청');
  const [busy, setBusy] = useState(false);

  async function request(submit: boolean) {
    setBusy(true);
    try {
      await onRequest(requestedRole, reasonKo, submit);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="estimate-preview-card role-change-request-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">ROLE CHANGE REQUEST</span>
          <h5>역할 변경 요청</h5>
        </div>
        <span>직접 변경 차단</span>
      </div>
      <div className="role-control-row">
        <label>
          <span>현재 역할</span>
          <input value={data?.currentUser.roleDisplayNameKo || '확인 중'} disabled />
        </label>
        <label>
          <span>요청 역할</span>
          <select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value as RoleId)}>
            {(data?.roles || [])
              .filter((role) => role.roleId !== data?.currentUser.roleId)
              .map((role) => (
                <option key={role.roleId} value={role.roleId}>{role.displayNameKo} ({role.roleId})</option>
              ))}
          </select>
        </label>
        <label>
          <span>요청 사유</span>
          <input value={reasonKo} onChange={(event) => setReasonKo(event.target.value)} />
        </label>
      </div>
      <div className="role-control-row">
        <button disabled={busy || !reasonKo.trim()} onClick={() => request(false)}>초안 저장</button>
        <button disabled={busy || !reasonKo.trim()} onClick={() => request(true)}>승인 요청</button>
      </div>
      <p className="small-note">
        요청 생성만으로 역할은 바뀌지 않습니다. 권한 있는 다른 승인자가 승인한 뒤 적용해야 합니다.
      </p>
    </section>
  );
}
