import { useMemo, useState } from 'react';
import type {
  PermissionAdminData,
  RoleId,
  RoleVisibilityPreviewRecord
} from '../../services/permission-service/permissionService';

type Props = {
  data: PermissionAdminData | null;
};

const forbiddenPreviewTerms = [
  'customer_phone',
  'customer_email',
  'detailed_address',
  'memo',
  'internal_cost',
  'margin',
  'pce',
  'vendor_price',
  'approval_queue',
  'access_token',
  'risk_score'
];

function serializePreview(preview?: RoleVisibilityPreviewRecord) {
  return JSON.stringify(preview?.previewPayload || {}, null, 2);
}

export function RoleVisibilityPreview({ data }: Props) {
  const [roleId, setRoleId] = useState<RoleId>('CLIENT_VIEWER');
  const preview = useMemo(() => (
    (data?.visibilityPreview || []).find((item) => item.roleId === roleId)
  ), [data, roleId]);
  const serialized = serializePreview(preview);
  const blockedTerms = forbiddenPreviewTerms.filter((term) => serialized.toLowerCase().includes(term));

  return (
    <section className="estimate-preview-card role-visibility-preview">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CUSTOMER / INTERNAL VISIBILITY PREVIEW</span>
          <h5>역할별 데이터 노출 미리보기</h5>
        </div>
        <label>
          <span>역할</span>
          <select value={roleId} onChange={(event) => setRoleId(event.target.value as RoleId)}>
            {(data?.roles || []).map((role) => (
              <option key={role.roleId} value={role.roleId}>{role.displayNameKo}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="permission-summary-grid">
        <div className="permission-group">
          <h5>표시 필드</h5>
          {(preview?.visibleFieldKeys || []).map((field) => (
            <div className="permission-row permission-allow" key={field}>
              <span>{field}</span>
              <em>표시</em>
            </div>
          ))}
        </div>
        <div className="permission-group">
          <h5>숨김 기준</h5>
          {(preview?.hiddenFieldLabels || []).map((field) => (
            <div className="permission-row permission-deny" key={field}>
              <span>{field}</span>
              <em>차단</em>
            </div>
          ))}
        </div>
      </div>

      <div className={blockedTerms.length ? 'case-row warning-row' : 'case-row'}>
        <strong>{preview?.roleDisplayNameKo || roleId}</strong>
        <span>{blockedTerms.length ? '확인 필요' : '고객 안전'}</span>
        <p>
          {blockedTerms.length
            ? `미리보기 payload에서 금지 키워드가 감지되었습니다: ${blockedTerms.join(', ')}`
            : '현재 미리보기 payload는 고객/내부 분리 sanitizer를 통과했습니다.'}
        </p>
        <code>{serialized}</code>
      </div>
    </section>
  );
}
