import { useEffect, useMemo, useState } from 'react';
import {
  evaluatePermission,
  loadPermissionAdminData,
  type PermissionAdminData,
  type PermissionMatrixRecord,
  type RoleId
} from '../../services/permission-service/permissionService';
import { createRoleChangeRequest } from '../../services/permission-service/roleChangeApprovalService';
import { PermissionAuditViewer } from './PermissionAuditViewer';
import { PermissionAuditExportPanel } from './PermissionAuditExportPanel';
import { RoleChangeApprovalQueue } from './RoleChangeApprovalQueue';
import { RoleChangeRequestPanel } from './RoleChangeRequestPanel';
import { RoleVisibilityPreview } from './RoleVisibilityPreview';

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
  const [permissionSearch, setPermissionSearch] = useState('');
  const [matrixRoleFilter, setMatrixRoleFilter] = useState<RoleId | 'ALL'>('ALL');
  const [roleRequestRefreshKey, setRoleRequestRefreshKey] = useState(0);

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

  async function changeRole(roleId: RoleId, reasonKo: string, submit: boolean) {
    const role = data?.roles.find((item) => item.roleId === roleId);
    const confirmed = window.confirm(
      `${role?.displayNameKo || roleId} 역할 변경 ${submit ? '승인 요청' : '초안'}을 생성합니다. 승인 전에는 현재 역할이 유지됩니다.`
    );
    if (!confirmed) return;
    try {
      const request = await createRoleChangeRequest({
        requesterId: data?.currentUser.userId,
        requesterRole: data?.currentUser.roleId,
        targetUserId: data?.currentUser.userId,
        currentRole: data?.currentUser.roleId,
        requestedRole: roleId,
        reasonKo,
        submit
      });
      setMessageKo(`${request.status} 역할 변경 요청 ${request.requestId}이 생성되었습니다.`);
      setRoleRequestRefreshKey((value) => value + 1);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '역할 변경 요청 생성에 실패했습니다.');
    }
  }

  async function handleRoleApplied() {
    await refresh();
    window.dispatchEvent(new CustomEvent('ecorean:role-changed', { detail: 'APPROVED_ROLE_APPLIED' }));
  }

  async function checkAuditPermission() {
    const result = await evaluatePermission('audit.view', data?.currentUser.roleId);
    setMessageKo(result?.reasonKo || '권한 평가 결과를 확인할 수 없습니다.');
    await refresh();
  }

  const matrixRows = useMemo(() => {
    const matrix = data?.permissionMatrix || [];
    const keyword = permissionSearch.trim().toLowerCase();
    return matrix.filter((row: PermissionMatrixRecord) => (
      (matrixRoleFilter === 'ALL' || row.roleId === matrixRoleFilter)
      && (!keyword
        || row.permissionKey.toLowerCase().includes(keyword)
        || row.descriptionKo.toLowerCase().includes(keyword)
        || row.roleDisplayNameKo.toLowerCase().includes(keyword))
    ));
  }, [data, permissionSearch, matrixRoleFilter]);

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

      <div className="permission-summary-grid">
        {(data?.roleSummaries || []).map((summary) => (
          <section
            className={summary.roleId === data?.currentUser.roleId ? 'permission-group warning-row' : 'permission-group'}
            key={summary.roleId}
          >
            <h5>{summary.displayNameKo}</h5>
            <div className="permission-row permission-allow"><span>허용</span><em>{summary.allowedCount}</em></div>
            <div className="permission-row permission-deny"><span>차단</span><em>{summary.deniedCount}</em></div>
            <div className="permission-row"><span>제한 표시</span><em>{summary.restrictedCount}</em></div>
            <p className="small-note">{summary.descriptionKo}</p>
          </section>
        ))}
      </div>

      <RoleChangeRequestPanel data={data} onRequest={changeRole} />

      {data ? (
        <RoleChangeApprovalQueue
          currentUser={data.currentUser}
          refreshKey={roleRequestRefreshKey}
          onMessage={setMessageKo}
          onRoleApplied={handleRoleApplied}
        />
      ) : null}

      <div className="role-control-row"><button onClick={checkAuditPermission}>감사 권한 확인</button></div>

      <p className="small-note">
        외부 로그인과 공개 인증은 비활성화되어 있습니다. 이 화면은 로컬 운영 역할과 권한 경계를 검증합니다.
      </p>

      <div className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">PERMISSION CENTER</span>
            <h5>7 roles / 28 permissions matrix</h5>
          </div>
          <span>{matrixRows.length}개 표시</span>
        </div>
        <div className="role-control-row">
          <label>
            <span>권한 검색</span>
            <input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="permission key 또는 설명"
            />
          </label>
          <label>
            <span>역할 필터</span>
            <select value={matrixRoleFilter} onChange={(event) => setMatrixRoleFilter(event.target.value as RoleId | 'ALL')}>
              <option value="ALL">전체 역할</option>
              {(data?.roles || []).map((role) => (
                <option key={role.roleId} value={role.roleId}>{role.displayNameKo}</option>
              ))}
            </select>
          </label>
        </div>
        {matrixRows.slice(0, 80).map((permission) => (
          <div
            className={permission.allowed ? 'permission-row permission-allow' : 'permission-row permission-deny'}
            key={`${permission.roleId}-${permission.permissionKey}`}
          >
            <span>
              {permission.roleDisplayNameKo} / {permission.descriptionKo}
              {permission.isDangerous ? ' / 위험 권한' : ''}
            </span>
            <em>{permission.status === 'RESTRICTED' ? '제한' : permission.allowed ? '허용' : '차단'}</em>
          </div>
        ))}
        <p className="small-note">
          위험 권한: estimate.internal_cost.view, estimate.margin.view, vendor.price.view,
          internal_output.generate, audit.view, system.settings.edit
        </p>
      </div>

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

      <RoleVisibilityPreview data={data} />
      <PermissionAuditViewer data={data} onMessage={setMessageKo} />
      <PermissionAuditExportPanel data={data} onMessage={setMessageKo} />

      <div className="estimate-preview-card">
        <h5>Access denied safe reason</h5>
        {(data?.accessDeniedSamples || []).map((sample) => (
          <div className="case-row" key={`${sample.roleId}-${sample.permissionKey}`}>
            <strong>{sample.roleDisplayNameKo}</strong>
            <span>{sample.permissionKey}</span>
            <p>{sample.reasonKo}</p>
            <p className="small-note">{sample.actionKo}</p>
          </div>
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
