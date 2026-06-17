import { useEffect, useMemo, useState } from 'react';
import { customerPortalDraftService } from '../../services/customer-portal-draft-service/customerPortalDraftService';

type Row = Record<string, unknown>;

const statusLabels: Record<string, string> = {
  DRAFT: '초안',
  REVIEW_REQUIRED: '검토 필요',
  INTERNAL_APPROVED: '내부 승인',
  REJECTED: '반려',
  ARCHIVED: '아카이브',
  PUBLISH_BLOCKED: '공개 차단'
};

const reviewLabels: Record<string, string> = {
  NOT_REVIEWED: '미검토',
  IN_REVIEW: '검토 중',
  APPROVED: '승인',
  REJECTED: '반려',
  REVISION_REQUIRED: '수정 필요'
};

const initialSource = {
  portalTitle: 'RC-0.4.3 고객 포털 내부 초안',
  customerDisplayName: '테스트 고객',
  projectDisplayName: '고객 공개용 프로젝트명',
  projectType: 'FULL_REMODELING',
  customerSafeAddressSummary: '서울 / 승인된 주소 요약',
  projectStatusDisplayLabel: '견적 검토 중',
  projectStartDate: '2026-07-01',
  expectedCompletionDate: '2026-08-15',
  customerVisibleProgressPercentage: 35,
  approvedCustomerEstimateTitle: '고객용 견적 요약',
  approvedCustomerTotal: 55000000,
  approvedVatDisplay: 'VAT 포함',
  estimateValidityDate: '2026-07-15',
  contractTitle: '고객 계약 요약',
  customerContractTotal: 55000000,
  paymentReceivedStatus: '계약금 확인 전',
  remainingCustomerPaymentAmount: 55000000,
  companyName: 'ECOREAN',
  publicBusinessPhone: '02-0000-0000',
  publicBusinessEmail: 'hello@example.invalid',
  assignedCustomerContactDisplayName: '고객 담당자',
  milestones: [
    { title: '현장 실측', plannedDate: '2026-07-02', status: '예정', customer_visible: true, progressNote: '방문 일정을 조율 중입니다.' },
    { title: '내부 발주 검토', plannedDate: '2026-07-03', status: '내부', customer_visible: false, progressNote: '고객 비공개' }
  ],
  documents: [
    { documentType: 'CUSTOMER_ESTIMATE', documentStatus: 'APPROVED', customer_approved: true, title: '고객용 견적서', documentId: 'DOC-CUSTOMER-ESTIMATE' },
    { documentType: 'INTERNAL_COST', documentStatus: 'APPROVED', customer_approved: true, title: '내부 원가표', documentId: 'DOC-INTERNAL-COST' }
  ],
  paymentSchedule: [
    { title: '계약금', dueDate: '2026-07-01', customerAmount: 10000000, receivedStatus: '대기', customer_visible: true }
  ],
  internalCost: 39000000,
  margin: 0.29,
  pce: 'GO',
  address_detail_internal: '101동 1203호',
  raw_phone: '010-1234-5678',
  raw_email: 'customer@example.com',
  internal_action: '대표 후속 연락'
};

function text(value: unknown, fallback = '-') {
  return value ? String(value) : fallback;
}

function asArray(value: unknown): Row[] {
  return Array.isArray(value) ? value as Row[] : [];
}

function asObject(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

export function CustomerPortalDraftCenterView() {
  const [drafts, setDrafts] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [selected, setSelected] = useState<Row | null>(null);
  const [filter, setFilter] = useState('');
  const [message, setMessage] = useState('고객 포털 내부 초안을 불러오는 중입니다.');
  const [busy, setBusy] = useState(false);
  const [sourceJson, setSourceJson] = useState(JSON.stringify(initialSource, null, 2));
  const [linkForm, setLinkForm] = useState({ leadId: 'LEAD-RC043', projectId: 'PROJECT-RC043', estimateId: 'EST-RC043', contractId: 'CON-RC043' });
  const selectedId = text(selected?.portal_draft_id, '');
  const safePayload = asObject(selected?.customer_safe_payload);
  const project = asObject(safePayload.project);
  const portal = asObject(safePayload.portal);
  const safety = asObject(safePayload.safety);
  const excluded = asObject(safety.excludedInternalFieldSummary);
  const categories = asObject(excluded.categories);
  const snapshots = asArray(selected?.snapshots);
  const history = asArray(selected?.audit_history);

  async function refresh(nextId = selectedId) {
    const [rows, nextSummary] = await Promise.all([
      customerPortalDraftService.list(filter ? { portalStatus: filter } : {}),
      customerPortalDraftService.summary()
    ]);
    setDrafts(rows);
    setSummary(nextSummary);
    const target = nextId || text(rows[0]?.portal_draft_id, '');
    if (target) setSelected(await customerPortalDraftService.detail({ draftId: target }));
    else setSelected(null);
    setMessage('고객 포털 내부 초안이 최신화되었습니다.');
  }

  useEffect(() => {
    refresh();
  }, [filter]);

  async function run(action: () => Promise<Row>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      const draftId = text(result.portal_draft_id || result.portalDraftId || selectedId, '');
      setMessage(success);
      await refresh(draftId);
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '고객 포털 초안 처리 중 오류가 발생했습니다.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  function parseSource() {
    try {
      return JSON.parse(sourceJson);
    } catch (_error) {
      setMessage('JSON 형식을 확인하세요.');
      return null;
    }
  }

  async function createDraft() {
    const sourcePayload = parseSource();
    if (!sourcePayload) return;
    await run(() => customerPortalDraftService.create({ sourcePayload, createdBy: 'CEO' }), '고객 포털 내부 초안이 생성되었습니다.');
  }

  async function updateDraft() {
    const sourcePayload = parseSource();
    if (!sourcePayload || !selectedId) return setMessage('수정할 초안을 선택하세요.');
    await run(() => customerPortalDraftService.update({ draftId: selectedId, sourcePayload, changedBy: 'CEO' }), '고객 포털 내부 초안이 수정되었습니다.');
  }

  const kpis = useMemo(() => [
    ['전체 초안', summary.totalDrafts],
    ['검토 필요', summary.reviewRequired],
    ['내부 승인', summary.internalApproved],
    ['수정 필요', summary.revisionRequired],
    ['공개 차단', summary.publishBlocked],
    ['아카이브', summary.archived],
    ['고객 안전성 실패', summary.customerSafetyFailed],
    ['외부 공개 비활성', summary.externalPublicDisabled ? 'YES' : 'NO']
  ], [summary]);

  const actionButton = (label: string, action: () => Promise<Row | null>) => (
    <button disabled={!selectedId || busy} onClick={action}>{label}</button>
  );

  return (
    <section className="cost-capture-view">
      <div className="section-header">
        <div>
          <span className="eyebrow">RC-0.4.3 INTERNAL PREVIEW ONLY</span>
          <h2>고객 포털 내부 초안</h2>
          <p>고객에게 공개 가능한 정보만 allowlist payload로 새로 구성하고 내부 승인 전 검토합니다.</p>
        </div>
        <div className="button-row">
          <button disabled={busy} onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'calendarSiteSurveySync' }))}>캘린더 / 현장조사 Sync</button>
          <button className="command" disabled={busy} onClick={createDraft}>초안 생성</button>
          <button disabled={!selectedId || busy} onClick={updateDraft}>초안 저장</button>
          <button disabled={busy} onClick={() => run(() => customerPortalDraftService.report({ finalDecision: 'IN_PROGRESS' }), '감사 리포트가 생성되었습니다.')}>감사 리포트</button>
        </div>
      </div>

      {message ? <div className="drawer-block">{message}</div> : null}

      <div className="kpi-grid">
        {kpis.map(([label, value]) => (
          <div className="kpi-card" key={String(label)}>
            <span>{String(label)}</span>
            <strong>{String(value ?? 0)}</strong>
          </div>
        ))}
      </div>

      <div className="cost-capture-layout">
        <div className="drawer-block">
          <div className="section-header">
            <div>
              <h3>초안 목록</h3>
              <p>외부 공개 상태는 이번 RC에서 생성하지 않습니다.</p>
            </div>
            <label className="field">
              <span>상태 필터</span>
              <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                <option value="">전체</option>
                <option value="DRAFT">DRAFT</option>
                <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                <option value="INTERNAL_APPROVED">INTERNAL_APPROVED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="PUBLISH_BLOCKED">PUBLISH_BLOCKED</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>포털 제목</th><th>고객 표시명</th><th>프로젝트</th><th>Lead</th><th>프로젝트 ID</th><th>상태</th><th>검토</th><th>Snapshot</th></tr></thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={text(draft.portal_draft_id)}>
                    <td><button onClick={async () => setSelected(await customerPortalDraftService.detail({ draftId: draft.portal_draft_id }))}>{text(draft.portal_title)}</button></td>
                    <td>{text(draft.customer_display_name)}</td>
                    <td>{text(draft.project_display_name)}</td>
                    <td>{text(draft.lead_id)}</td>
                    <td>{text(draft.project_id)}</td>
                    <td>{statusLabels[text(draft.portal_status)] || text(draft.portal_status)}</td>
                    <td>{reviewLabels[text(draft.review_status)] || text(draft.review_status)}</td>
                    <td>{asArray(draft.snapshots).length}</td>
                  </tr>
                ))}
                {!drafts.length ? <tr><td colSpan={8}>등록된 고객 포털 초안이 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="drawer-block">
          <h3>초안 소스 입력</h3>
          <label className="field">
            <span>내부 소스 JSON</span>
            <textarea value={sourceJson} onChange={(event) => setSourceJson(event.target.value)} />
          </label>
          <p>내부 필드는 값이 공개되지 않고 제외 분류/개수만 기록됩니다.</p>
        </div>

        <div className="drawer-block">
          <h3>고객에게 표시될 프로젝트 정보</h3>
          <p>제목: {text(portal.title)}</p>
          <p>고객 표시명: {text(project.customerDisplayName)}</p>
          <p>프로젝트명: {text(project.projectDisplayName)}</p>
          <p>유형: {text(project.projectType)}</p>
          <p>주소 요약: {text(project.siteLocationSummary, '승인된 주소 요약 없음')}</p>
          <p>진행률: {Number(project.progressPercentage || 0)}%</p>
          <strong>외부 공개: {text(portal.publicPortalStatus)} / 인증: {text(portal.authenticationStatus)}</strong>
        </div>

        <div className="drawer-block">
          <h3>제외된 내부 필드 요약</h3>
          <p>총 제외 후보: {Number(excluded.total || 0)}개</p>
          <p>재무/수익: {Number(categories.finance || 0)}개</p>
          <p>견적 내부: {Number(categories.estimate || 0)}개</p>
          <p>CRM 내부: {Number(categories.crm || 0)}개</p>
          <p>주소 내부: {Number(categories.address || 0)}개</p>
          <p>현장/운영: {Number(categories.operation || 0)}개</p>
          <p>개인정보/인증정보: {Number(categories.privacy || 0) + Number(categories.credential || 0)}개</p>
        </div>

        <div className="drawer-block">
          <h3>연결</h3>
          <label className="field"><span>Lead ID</span><input value={linkForm.leadId} onChange={(event) => setLinkForm({ ...linkForm, leadId: event.target.value })} /></label>
          <button disabled={!selectedId || busy} onClick={() => run(() => customerPortalDraftService.linkLead({ draftId: selectedId, leadId: linkForm.leadId }), 'Lead와 연결했습니다.')}>Lead 연결</button>
          <label className="field"><span>프로젝트 ID</span><input value={linkForm.projectId} onChange={(event) => setLinkForm({ ...linkForm, projectId: event.target.value })} /></label>
          <button disabled={!selectedId || busy} onClick={() => run(() => customerPortalDraftService.linkProject({ draftId: selectedId, projectId: linkForm.projectId }), '프로젝트와 연결했습니다.')}>프로젝트 연결</button>
          <label className="field"><span>견적 ID</span><input value={linkForm.estimateId} onChange={(event) => setLinkForm({ ...linkForm, estimateId: event.target.value })} /></label>
          <button disabled={!selectedId || busy} onClick={() => run(() => customerPortalDraftService.linkEstimate({ draftId: selectedId, estimateId: linkForm.estimateId }), '견적과 연결했습니다.')}>견적 연결</button>
          <label className="field"><span>계약 ID</span><input value={linkForm.contractId} onChange={(event) => setLinkForm({ ...linkForm, contractId: event.target.value })} /></label>
          <button disabled={!selectedId || busy} onClick={() => run(() => customerPortalDraftService.linkContract({ draftId: selectedId, contractId: linkForm.contractId }), '계약과 연결했습니다.')}>계약 연결</button>
        </div>

        <div className="drawer-block">
          <h3>내부 승인 / 반려 / 차단</h3>
          <div className="button-row">
            {actionButton('검토 요청', () => run(() => customerPortalDraftService.requestReview({ draftId: selectedId, changedBy: 'CEO' }), '검토 요청 상태로 변경했습니다.'))}
            {actionButton('내부 승인', () => run(() => customerPortalDraftService.approve({ draftId: selectedId, approvedBy: 'CEO' }), '내부 승인했습니다.'))}
            {actionButton('반려', () => run(() => customerPortalDraftService.reject({ draftId: selectedId, reason: '고객 공개 문구 수정 필요' }), '반려했습니다.'))}
            {actionButton('승인 취소', () => run(() => customerPortalDraftService.revokeApproval({ draftId: selectedId, reason: '재검토 필요' }), '승인을 취소했습니다.'))}
          </div>
          <div className="button-row">
            {actionButton('아카이브', () => run(() => customerPortalDraftService.archive({ draftId: selectedId, reason: '보관' }), '아카이브했습니다.'))}
            {actionButton('복원', () => run(() => customerPortalDraftService.restore({ draftId: selectedId, reason: '복원' }), '복원했습니다.'))}
          </div>
          <p>INTERNAL_APPROVED는 내부 승인일 뿐 외부 공개가 아닙니다.</p>
        </div>

        <div className="drawer-block">
          <h3>스냅샷 / 내부 미리보기</h3>
          <div className="button-row">
            {actionButton('스냅샷 생성', () => run(() => customerPortalDraftService.snapshot({ draftId: selectedId, createdBy: 'CEO' }), '스냅샷을 생성했습니다.'))}
            {actionButton('내부 미리보기 생성', () => run(() => customerPortalDraftService.preview({ draftId: selectedId, createdBy: 'CEO' }), '내부 미리보기 세션을 생성했습니다.'))}
          </div>
          <p>미리보기 token 원문은 저장/표시하지 않고 hash만 저장합니다.</p>
          {snapshots.slice(0, 3).map((snapshot) => (
            <div className="case-row" key={text(snapshot.snapshot_id)}>
              <strong>Revision {text(snapshot.revision)}</strong>
              <span>{text(snapshot.validation_status)}</span>
              <p>{text(snapshot.snapshot_hash).slice(0, 16)}...</p>
            </div>
          ))}
          {!snapshots.length ? <p className="small-note">생성된 스냅샷이 없습니다.</p> : null}
        </div>

        <div className="drawer-block">
          <h3>고객 공개 문서 / 공정</h3>
          <p>고객 승인 문서: {asArray(safePayload.documents).length}건</p>
          <p>고객 공개 공정: {asArray(asObject(safePayload.schedule).milestones).length}건</p>
          <p>내부 원가표, 발주서, 업체 견적, PCE 리포트는 포함되지 않습니다.</p>
        </div>

        <div className="drawer-block">
          <h3>변경 이력</h3>
          {history.slice(0, 8).map((item) => (
            <div className="case-row" key={text(item.history_id)}>
              <strong>{text(item.action)}</strong>
              <span>{text(item.old_status)} → {text(item.new_status)}</span>
              <p>{text(item.changed_at)}</p>
            </div>
          ))}
          {!history.length ? <p className="small-note">이력이 없습니다.</p> : null}
        </div>
      </div>
    </section>
  );
}
