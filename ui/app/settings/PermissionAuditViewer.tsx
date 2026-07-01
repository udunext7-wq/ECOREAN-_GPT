import { useMemo, useState } from 'react';
import {
  loadPermissionAuditEvents,
  type PermissionAdminData,
  type PermissionAuditRecord,
  type RoleId
} from '../../services/permission-service/permissionService';

type Props = {
  data: PermissionAdminData | null;
  onMessage?: (messageKo: string) => void;
};

const watchedEventTypes = [
  'PERMISSION_DENIED',
  'ACTIVE_ROLE_CHANGED',
  'INTERNAL_COST_ACCESSED',
  'MARGIN_VIEWED',
  'CUSTOMER_OUTPUT_GENERATED',
  'INTERNAL_OUTPUT_GENERATED'
];

function safeJson(value: unknown) {
  return JSON.stringify(value || {}, null, 2)
    .replace(/010-\d{4}-\d{4}/g, '[REDACTED_PHONE]')
    .replace(/[A-Z]:\\[^\s"]+/gi, '[REDACTED_PATH]')
    .replace(/token|secret|api[_-]?key|provider_payload/gi, '[REDACTED]');
}

export function PermissionAuditViewer({ data, onMessage }: Props) {
  const [eventType, setEventType] = useState('PERMISSION_DENIED');
  const [roleId, setRoleId] = useState<RoleId | ''>('');
  const [events, setEvents] = useState<PermissionAuditRecord[]>(data?.recentAudit || []);

  const filteredRecent = useMemo(() => (
    (events || []).filter((event) => (
      (!eventType || event.eventType === eventType)
      && (!roleId || event.roleId === roleId)
    ))
  ), [events, eventType, roleId]);

  async function loadFilteredEvents() {
    const next = await loadPermissionAuditEvents({
      eventType,
      roleId,
      limit: 80
    });
    setEvents(next || []);
    onMessage?.('권한 감사 로그를 안전하게 조회했습니다.');
  }

  return (
    <section className="estimate-preview-card permission-audit-viewer">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PERMISSION AUDIT VIEWER</span>
          <h5>권한 감사 로그 조회</h5>
        </div>
        <button onClick={loadFilteredEvents}>조회</button>
      </div>

      <div className="role-control-row">
        <label>
          <span>이벤트 유형</span>
          <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            {watchedEventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span>역할 필터</span>
          <select value={roleId} onChange={(event) => setRoleId(event.target.value as RoleId | '')}>
            <option value="">전체 역할</option>
            {(data?.roles || []).map((role) => (
              <option key={role.roleId} value={role.roleId}>{role.displayNameKo}</option>
            ))}
          </select>
        </label>
      </div>

      {filteredRecent.length === 0 ? (
        <p className="small-note">조건에 맞는 권한 감사 로그가 없습니다.</p>
      ) : filteredRecent.slice(0, 20).map((event) => (
        <div className={event.decision === 'DENIED' ? 'case-row warning-row' : 'case-row'} key={event.auditEventId}>
          <strong>{event.eventType}</strong>
          <span>{event.roleId} / {event.decision}</span>
          <p>{event.reasonKo}</p>
          <code>{safeJson(event.payload)}</code>
        </div>
      ))}

      <p className="small-note">
        원문 전화번호, 이메일, 상세주소, token, provider payload는 감사 로그 조회 화면에 표시하지 않습니다.
      </p>
    </section>
  );
}
