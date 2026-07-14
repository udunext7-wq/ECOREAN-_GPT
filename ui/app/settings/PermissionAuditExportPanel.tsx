import { useEffect, useState } from 'react';
import type { PermissionAdminData, RoleId } from '../../services/permission-service/permissionService';
import {
  generatePermissionAuditExport,
  loadPermissionAuditExportOptions,
  type PermissionAuditExportFormat,
  type PermissionAuditExportOptions,
  type PermissionAuditExportResult
} from '../../services/permission-service/permissionAuditExportService';

type Props = {
  data: PermissionAdminData | null;
  onMessage: (messageKo: string) => void;
};

export function PermissionAuditExportPanel({ data, onMessage }: Props) {
  const [options, setOptions] = useState<PermissionAuditExportOptions | null>(null);
  const [format, setFormat] = useState<PermissionAuditExportFormat>('JSON');
  const [eventType, setEventType] = useState('');
  const [actorRole, setActorRole] = useState<RoleId | ''>('');
  const [targetRole, setTargetRole] = useState<RoleId | ''>('');
  const [status, setStatus] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [result, setResult] = useState<PermissionAuditExportResult | null>(null);

  useEffect(() => {
    loadPermissionAuditExportOptions().then(setOptions).catch((error) => {
      onMessage(error instanceof Error ? error.message : '내보내기 옵션 조회에 실패했습니다.');
    });
  }, []);

  async function generate() {
    try {
      const next = await generatePermissionAuditExport(format, {
        eventType,
        actorRole,
        targetRole,
        status,
        riskLevel,
        fromDate: fromDate ? `${fromDate}T00:00:00.000Z` : '',
        toDate: toDate ? `${toDate}T23:59:59.999Z` : ''
      }, data?.currentUser.userId || 'LOCAL_USER', data?.currentUser.roleId || 'CEO');
      setResult(next);
      onMessage(`${next.format} 감사 내보내기 ${next.recordCount}건을 생성했습니다.`);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '권한 감사 내보내기에 실패했습니다.');
    }
  }

  function saveResult() {
    if (!result) return;
    const blob = new Blob([result.content], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    onMessage(`${result.fileName} 저장을 요청했습니다.`);
  }

  return (
    <section className="estimate-preview-card permission-audit-export-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PERMISSION AUDIT EXPORT</span>
          <h5>권한 감사 내보내기</h5>
        </div>
        <span>{options?.redactionApplied ? '민감정보 제거 적용' : '옵션 확인 중'}</span>
      </div>
      <div className="role-control-row">
        <label>
          <span>형식</span>
          <select value={format} onChange={(event) => setFormat(event.target.value as PermissionAuditExportFormat)}>
            {(options?.formats || ['JSON', 'CSV', 'HTML']).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>이벤트 유형</span>
          <select value={eventType} onChange={(event) => setEventType(event.target.value)}>
            <option value="">전체 이벤트</option>
            {(options?.eventTypes || []).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span>행위 역할</span>
          <select value={actorRole} onChange={(event) => setActorRole(event.target.value as RoleId | '')}>
            <option value="">전체 역할</option>
            {(data?.roles || []).map((role) => <option key={role.roleId} value={role.roleId}>{role.displayNameKo}</option>)}
          </select>
        </label>
        <label>
          <span>대상 역할</span>
          <select value={targetRole} onChange={(event) => setTargetRole(event.target.value as RoleId | '')}>
            <option value="">전체 역할</option>
            {(data?.roles || []).map((role) => <option key={role.roleId} value={role.roleId}>{role.displayNameKo}</option>)}
          </select>
        </label>
      </div>
      <div className="role-control-row">
        <label><span>상태</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">전체 상태</option>{(options?.statuses || []).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>위험 수준</span><select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}><option value="">전체 위험</option>{(options?.riskLevels || []).map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>시작일</span><input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
        <label><span>종료일</span><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
        <button onClick={generate}>내보내기 생성</button>
      </div>
      {result ? (
        <div className="case-row">
          <strong>{result.fileName}</strong>
          <span>{result.recordCount}건 / {result.format}</span>
          <button onClick={saveResult}>내보내기 저장</button>
          <pre>{result.content.slice(0, 4000)}</pre>
        </div>
      ) : <p className="small-note">필터를 선택하고 redacted 내보내기를 생성하세요.</p>}
      <p className="small-note">
        원문 전화번호, 이메일, 상세주소, token, provider payload, 좌표, 절대 경로와 고객 메모는 내보내지 않습니다.
      </p>
    </section>
  );
}
