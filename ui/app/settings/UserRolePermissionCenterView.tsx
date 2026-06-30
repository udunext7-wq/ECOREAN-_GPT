import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePermission,
  loadPermissionAdminData,
  setActiveRole,
  type PermissionAdminData,
  type RoleId
} from '../../services/permission-service/permissionService';

const permissionGroups = [
  { label: '프로젝트', prefix: ['dashboard.', 'project.', 'crm.'] },
  { label: '견적 / 출력', prefix: ['estimate.', 'customer_output.', 'internal_output.'] },
  { label: '계약 / 실행', prefix: ['contract.', 'schedule.', 'order.', 'survey.'] },
  { label: '거래처 / 일정', prefix: ['vendor.', 'calendar.', 'client_portal.'] },
  { label: '관리', prefix: ['audit.', 'system.'] }
];

export function UserRolePermissionCenterView() {
  const [data, setData] = useState<PermissionAdminData | null>(null);
  const [messageKo, setMessageKo] = useState('역할과 권한을 불러오는 중입니다.');

  async function refresh() {
    const next = await loadPermissionAdminData();
    setData(next);
    setMessageKo(`${next.currentUser.roleDisplayNameKo} 역할로 로컬 권한을 평가합니다.`);
  }

  useEffect(() => {
    refresh();
  }, []);

  const groupedPermissions = useMemo(() => {
    if (!data) return [];
    return permissionGroups.map((group) => ({
      ...group,
      permissions: data.permissions.filter((permission) => (
        permission.roleId === data.currentUser.roleId
        && group.prefix.some((prefix) => permission.permissionKey.startsWith(prefix))
      ))
    }));
  }, [data]);

  async function changeRole(roleId: RoleId) {
    await setActiveRole(roleId);
    await refresh();
    window.dispatchEvent(new CustomEvent('ecorean:role-changed', { detail: roleId }));
  }

  async function checkAuditPermission() {
    const result = await evaluatePermission('audit.view', data?.currentUser.roleId);
    setMessageKo(result?.reasonKo || '권한 평가 결과를 확인할 수 없습니다.');
    await refresh();
  }

  return (
    <section className="estimate-panel role-permission-center">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">LOCAL INTERNAL RBAC</span>
          <h4>사용자 역할 및 권한 센터</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>

      <div className="role-status-strip">
        <span className="role-badge">{data?.currentUser.roleDisplayNameKo || '로딩 중'}</span>
        <strong>{data?.currentUser.roleId || 'UNKNOWN'}</strong>
        <p>{messageKo}</p>
      </div>

      <div className="role-control-row">
        <label>
          <span>로컬 테스트 역할</span>
          <select
            value={data?.currentUser.roleId || 'CEO'}
            onChange={(event) => changeRole(event.target.value as RoleId)}
          >
            {(data?.roles || []).map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.displayNameKo} ({role.roleId})
              </option>
            ))}
          </select>
        </label>
        <button onClick={checkAuditPermission}>감사 권한 확인</button>
      </div>

      <p className="small-note">
        외부 로그인과 공개 인증은 비활성화되어 있습니다. 이 화면은 로컬 운영 역할과 권한 경계를 검증합니다.
      </p>

      <div className="permission-summary-grid">
        {groupedPermissions.map((group) => (
          <section className="permission-group" key={group.label}>
            <h5>{group.label}</h5>
            {group.permissions.map((permission) => (
              <div
                className={`permission-row ${permission.allowed ? 'permission-allow' : 'permission-deny'}`}
                key={permission.permissionKey}
              >
                <span>{permission.descriptionKo}</span>
                <em>{permission.allowed ? '허용' : '차단'}</em>
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>역할 정의</h5>
        <div className="role-definition-list">
          {(data?.roles || []).map((role) => (
            <div className="case-row" key={role.roleId}>
              <strong>{role.displayNameKo}</strong>
              <span>{role.roleId}</span>
              <p>{role.descriptionKo}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>최근 권한 감사 로그</h5>
        {(data?.recentAudit || []).length === 0 ? (
          <p className="small-note">기록된 권한 평가가 없습니다.</p>
        ) : (data?.recentAudit || []).slice(0, 16).map((event) => (
          <div className="case-row" key={event.auditEventId}>
            <strong>{event.roleId}</strong>
            <span>{event.decision === 'ALLOWED' ? '허용' : '차단'}</span>
            <p>{event.reasonKo}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
