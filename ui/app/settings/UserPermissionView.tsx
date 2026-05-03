import { useEffect, useMemo, useState } from 'react';
import {
  loadPermissionAdminData,
  type PermissionAdminData
} from '../../services/permission-service/permissionService';

const corePermissions = [
  'MASTER_DB_APPROVE',
  'FINAL_ESTIMATE_APPROVE',
  'EXECUTION_TRANSITION',
  'COMPLETION_APPROVE',
  'COST_CAPTURE_INPUT',
  'VENDOR_PRICE_INPUT',
  'BACKUP_CREATE',
  'RESTORE_EXECUTE',
  'EXPORT_DATA'
];

export function UserPermissionView() {
  const [data, setData] = useState<PermissionAdminData | null>(null);
  const [messageKo, setMessageKo] = useState('권한 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadPermissionAdminData();
    setData(next);
    setMessageKo(`현재 local mock user: ${next.currentUser.userNameKo} / ${next.currentUser.roleId}`);
  }

  useEffect(() => {
    refresh();
  }, []);

  const permissionMatrix = useMemo(() => {
    if (!data) return [];
    return data.roles.map((role) => ({
      role,
      permissions: corePermissions.map((permissionKey) => {
        const permission = data.permissions.find((item) => item.roleId === role.roleId && item.permissionKey === permissionKey);
        return {
          permissionKey,
          descriptionKo: permission?.descriptionKo || permissionKey,
          allowed: Boolean(permission?.allowed)
        };
      })
    }));
  }, [data]);

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">USER / PERMISSION</span>
          <h4>사용자 역할 및 권한</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>현재 사용자</h5>
          <div className="case-row">
            <strong>{data?.currentUser.userNameKo || '대표'}</strong>
            <span>{data?.currentUser.roleId || 'CEO'}</span>
            <p>현재는 local mock user 기반입니다. 향후 로그인 계정의 roleId와 연결됩니다.</p>
          </div>
        </div>

        <div className="estimate-preview-card">
          <h5>CEO 전용 권한</h5>
          <div className="tag-list">
            <span>Master DB 승인</span>
            <span>FINAL_ESTIMATE 승인</span>
            <span>Execution 전환</span>
            <span>Completion 승인</span>
            <span>Restore 실행</span>
            <span>공급가 승인</span>
          </div>
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>역할별 권한 매트릭스</h5>
        <div className="permission-grid">
          {permissionMatrix.map(({ role, permissions }) => (
            <div className="permission-column" key={role.roleId}>
              <strong>{role.displayNameKo}</strong>
              <p>{role.descriptionKo}</p>
              {permissions.map((permission) => (
                <div className={`permission-row ${permission.allowed ? 'permission-allow' : 'permission-deny'}`} key={permission.permissionKey}>
                  <span>{permission.descriptionKo}</span>
                  <em>{permission.allowed ? '허용' : '차단'}</em>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>권한 체크 로그</h5>
        {(data?.recentLogs || []).slice(0, 12).map((log) => (
          <div className="case-row" key={log.permissionLogId}>
            <strong>{log.roleId}</strong>
            <span>{log.allowed ? '허용' : '차단'}</span>
            <p>{log.reasonKo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
