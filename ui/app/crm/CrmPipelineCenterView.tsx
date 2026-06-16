import { useEffect, useMemo, useState } from 'react';
import { crmPipelineService } from '../../services/crm-service/crmPipelineService';
import type { ViewKey } from '../../src/types/dashboard';

const STAGES = [
  ['LEAD', '신규 문의'],
  ['CONTACTED', '연락 완료'],
  ['CONSULTING', '상담 중'],
  ['SITE_SURVEY_SCHEDULED', '현장조사 예정'],
  ['SITE_SURVEY_DONE', '현장조사 완료'],
  ['ESTIMATE_REQUESTED', '견적 요청'],
  ['ESTIMATE_SENT', '견적 발송'],
  ['NEGOTIATION', '협의 중'],
  ['CONTRACT_PENDING', '계약 대기'],
  ['CONTRACTED', '계약 완료'],
  ['ON_HOLD', '보류'],
  ['LOST', '실패']
] as const;

type LeadForm = {
  customerName: string;
  customerType: string;
  customerPhone: string;
  customerEmail: string;
  addressSummary: string;
  addressDetailInternal: string;
  projectType: string;
  projectScope: string;
  expectedBudgetRange: string;
  preferredSchedule: string;
  source: string;
  priority: string;
  assignedTo: string;
  nextAction: string;
  nextActionDueAt: string;
  memoInternal: string;
  addressNormalizedStatus: string;
  customerPortalStatus: string;
  portalInviteStatus: string;
  scheduleLinkStatus: string;
  calendarSyncStatus: string;
};

const initialForm: LeadForm = {
  customerName: 'RC-0.4.0 테스트 고객',
  customerType: 'TEST',
  customerPhone: '01000000000',
  customerEmail: 'crm-test@example.invalid',
  addressSummary: '서울 / 테스트 현장',
  addressDetailInternal: '테스트 전용 상세 위치',
  projectType: 'FULL_REMODELING',
  projectScope: '전체 리모델링 상담',
  expectedBudgetRange: '4,000만~6,000만원',
  preferredSchedule: '협의 필요',
  source: 'DIRECT',
  priority: 'NORMAL',
  assignedTo: '대표',
  nextAction: '초기 상담 일정 확정',
  nextActionDueAt: '',
  memoInternal: 'RC-0.4.0 테스트용 내부 메모',
  addressNormalizedStatus: 'READY_TO_CONNECT',
  customerPortalStatus: 'NOT_READY',
  portalInviteStatus: 'NOT_READY',
  scheduleLinkStatus: 'READY_TO_CONNECT',
  calendarSyncStatus: 'READY_TO_CONNECT'
};

const stageLabel = (stage: unknown) => STAGES.find(([key]) => key === stage)?.[1] || String(stage || '미정');
const value = (row: Record<string, unknown> | null, key: string) => String(row?.[key] || '');

type Props = { onNavigate?: (view: ViewKey) => void };

export function CrmPipelineCenterView({ onNavigate }: Props) {
  const [form, setForm] = useState<LeadForm>(initialForm);
  const [leads, setLeads] = useState<Array<Record<string, unknown>>>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [stageFilter, setStageFilter] = useState('');
  const [nextStage, setNextStage] = useState('CONTACTED');
  const [consultationSummary, setConsultationSummary] = useState('고객 요구사항과 공사 범위를 확인했습니다.');
  const [publicSummary, setPublicSummary] = useState('상담 내용을 확인했으며 다음 일정을 조율 중입니다.');
  const [surveyDate, setSurveyDate] = useState('');
  const [linkedEstimateId, setLinkedEstimateId] = useState('');
  const [linkedProjectId, setLinkedProjectId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const selectedLeadId = value(selected, 'lead_id');
  const kpis = (summary.kpis || {}) as Record<string, unknown>;
  const customerPayload = (selected?.customerPayload || {}) as Record<string, unknown>;

  async function refresh(selectLeadId?: string) {
    const [rows, nextSummary] = await Promise.all([
      crmPipelineService.listCrmLeads(stageFilter ? { stage: stageFilter } : {}),
      crmPipelineService.getCrmDashboardSummary()
    ]);
    setLeads(rows);
    setSummary(nextSummary);
    const targetId = selectLeadId || selectedLeadId;
    if (targetId) setSelected(await crmPipelineService.getCrmLeadDetail({ leadId: targetId }));
  }

  useEffect(() => {
    refresh();
  }, [stageFilter]);

  function updateField<K extends keyof LeadForm>(key: K, next: LeadForm[K]) {
    setForm((previous) => ({ ...previous, [key]: next }));
  }

  async function run(action: () => Promise<Record<string, unknown>>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      setMessage(success);
      const lead = result.lead as Record<string, unknown> | undefined;
      const leadId = String(result.leadId || lead?.lead_id || selectedLeadId);
      await refresh(leadId);
      return result;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CRM 처리 중 오류가 발생했습니다.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createLead() {
    await run(() => crmPipelineService.createCrmLead({ ...form }), '신규 고객이 CRM 파이프라인에 등록되었습니다.');
  }

  async function saveLead() {
    if (!selectedLeadId) return setMessage('수정할 고객을 선택하세요.');
    await run(() => crmPipelineService.updateCrmLead({ leadId: selectedLeadId, ...form }), 'CRM 고객 정보가 저장되었습니다.');
  }

  async function openLead(leadId: string) {
    setSelected(await crmPipelineService.getCrmLeadDetail({ leadId }));
    setMessage('');
  }

  async function moveStage(stage = nextStage, reason = '') {
    if (!selectedLeadId) return setMessage('단계를 이동할 고객을 선택하세요.');
    await run(
      () => crmPipelineService.moveCrmStage({ leadId: selectedLeadId, nextStage: stage, reason, nextAction: form.nextAction }),
      `${stageLabel(stage)} 단계로 이동했습니다.`
    );
  }

  async function addConsultation() {
    if (!selectedLeadId) return setMessage('상담을 기록할 고객을 선택하세요.');
    await run(() => crmPipelineService.createConsultationLog({
      leadId: selectedLeadId,
      contactChannel: 'PHONE',
      consultationType: 'FOLLOW_UP',
      summary: consultationSummary,
      publicSummary,
      nextAction: form.nextAction,
      nextActionDueAt: form.nextActionDueAt,
      createdBy: form.assignedTo
    }), '상담 기록이 추가되었습니다.');
  }

  async function createSurvey() {
    if (!selectedLeadId) return setMessage('현장조사를 요청할 고객을 선택하세요.');
    await run(() => crmPipelineService.createSiteSurveyRequest({
      leadId: selectedLeadId,
      requestedDate: surveyDate,
      preferredTime: '협의',
      addressSummary: value(selected, 'address_summary'),
      assignedTo: form.assignedTo,
      noteInternal: '현장 접근 조건 확인 필요'
    }), '현장조사 요청이 생성되었습니다.');
  }

  async function linkEstimate() {
    if (!selectedLeadId || !linkedEstimateId) return setMessage('고객과 견적 ID를 확인하세요.');
    await run(() => crmPipelineService.linkLeadToEstimate({ leadId: selectedLeadId, estimateId: linkedEstimateId }), '견적이 CRM 고객과 연결되었습니다.');
  }

  async function linkProject() {
    if (!selectedLeadId || !linkedProjectId) return setMessage('고객과 프로젝트 ID를 확인하세요.');
    await run(() => crmPipelineService.linkLeadToProject({ leadId: selectedLeadId, projectId: linkedProjectId }), '프로젝트가 CRM 고객과 연결되었습니다.');
  }

  async function createReport() {
    const result = await crmPipelineService.createCrmPipelineReport(selectedLeadId ? { leadId: selectedLeadId } : {});
    setMessage(result.ok ? 'CRM 리포트가 생성되었습니다.' : 'CRM 리포트 생성에 실패했습니다.');
  }

  const renderInput = (label: string, field: keyof LeadForm, type = 'text') => (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={form[field]} onChange={(event) => updateField(field, event.target.value)} />
    </label>
  );

  const cards = useMemo(() => [
    ['신규 문의 수', kpis.newLeads],
    ['상담 중', kpis.consulting],
    ['현장조사 예정', kpis.siteSurveyScheduled],
    ['견적 요청', kpis.estimateRequested],
    ['견적 발송', kpis.estimateSent],
    ['계약 대기', kpis.contractPending],
    ['계약 완료', kpis.contracted],
    ['보류/실패', kpis.heldOrLost]
  ], [summary]);

  return (
    <section className="cost-capture-view">
      <div className="section-header">
        <div>
          <span className="eyebrow">RC-0.4.0 CRM</span>
          <h2>고객 CRM 파이프라인 센터</h2>
          <p>신규 문의부터 계약 전환까지 상담, 현장조사, 견적과 프로젝트 연결 상태를 관리합니다.</p>
        </div>
        <div className="button-row">
          <button onClick={() => onNavigate ? onNavigate('crmNextActions') : window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'crmNextActions' }))}>CRM 다음 액션 / 알림</button>
          <button onClick={() => onNavigate ? onNavigate('addressNormalization') : window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'addressNormalization' }))}>주소 정규화 센터</button>
          <button onClick={() => onNavigate ? onNavigate('customerPortalDraft') : window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'customerPortalDraft' }))}>고객 포털 내부 초안</button>
          <button className="command" disabled={busy} onClick={createLead}>신규 고객 등록</button>
          <button disabled={busy} onClick={createReport}>CRM 리포트 생성</button>
        </div>
      </div>

      {message ? <div className="drawer-block">{message}</div> : null}

      <div className="kpi-grid">
        {cards.map(([label, count]) => (
          <div className="kpi-card" key={String(label)}>
            <span>{String(label)}</span>
            <strong>{Number(count || 0)}건</strong>
          </div>
        ))}
      </div>

      <div className="drawer-block">
        <div className="section-header">
          <div>
            <h3>중앙 파이프라인</h3>
            <p>우선순위와 다음 액션 기준으로 고객을 확인합니다.</p>
          </div>
          <label className="field">
            <span>단계 필터</span>
            <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}>
              <option value="">전체</option>
              {STAGES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>고객명</th><th>프로젝트 유형</th><th>예상 범위</th><th>우선순위</th>
                <th>다음 액션</th><th>담당자</th><th>최근 상담일</th><th>상태</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={String(lead.lead_id)}>
                  <td><button onClick={() => openLead(String(lead.lead_id))}>{String(lead.customer_name || '고객')}</button></td>
                  <td>{String(lead.project_type || '-')}</td>
                  <td>{String(lead.expected_budget_range || '-')}</td>
                  <td>{String(lead.priority || 'NORMAL')}</td>
                  <td>{String(lead.next_action || '미정')}</td>
                  <td>{String(lead.assigned_to || '미지정')}</td>
                  <td>{String(lead.last_consultation_at || '-').slice(0, 10)}</td>
                  <td>{stageLabel(lead.stage)}</td>
                </tr>
              ))}
              {!leads.length ? <tr><td colSpan={8}>등록된 CRM 고객이 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cost-capture-layout">
        <div className="drawer-block">
          <h3>고객 기본 정보</h3>
          {renderInput('고객명', 'customerName')}
          {renderInput('고객 유형', 'customerType')}
          {renderInput('전화번호', 'customerPhone')}
          {renderInput('이메일', 'customerEmail', 'email')}
          {renderInput('주소 요약', 'addressSummary')}
          {renderInput('상세주소(내부)', 'addressDetailInternal')}
          <p>전화번호와 이메일은 마스킹 저장하며 상세주소는 내부 전용입니다.</p>
        </div>

        <div className="drawer-block">
          <h3>프로젝트 정보</h3>
          {renderInput('프로젝트 유형', 'projectType')}
          {renderInput('예상 범위', 'projectScope')}
          {renderInput('예상 예산 범위', 'expectedBudgetRange')}
          {renderInput('희망 일정', 'preferredSchedule')}
          {renderInput('유입 경로', 'source')}
          {renderInput('담당자', 'assignedTo')}
          {renderInput('다음 액션', 'nextAction')}
          {renderInput('다음 액션 기한', 'nextActionDueAt', 'date')}
          <button disabled={!selectedLeadId || busy} onClick={saveLead}>선택 고객 저장</button>
        </div>

        <div className="drawer-block">
          <h3>단계 이동</h3>
          <label className="field">
            <span>다음 단계</span>
            <select value={nextStage} onChange={(event) => setNextStage(event.target.value)}>
              {STAGES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <button disabled={!selectedLeadId || busy} onClick={() => moveStage()}>단계 이동</button>
          <div className="button-row">
            <button disabled={!selectedLeadId || busy} onClick={() => moveStage('ON_HOLD', '추후 재상담')}>보류 처리</button>
            <button disabled={!selectedLeadId || busy} onClick={() => moveStage('LOST', '고객 의사로 종료')}>실패 처리</button>
          </div>
          <p>현재 상태: <strong>{stageLabel(selected?.stage)}</strong></p>
        </div>

        <div className="drawer-block">
          <h3>상담 이력</h3>
          <label className="field"><span>내부 상담 요약</span><textarea value={consultationSummary} onChange={(event) => setConsultationSummary(event.target.value)} /></label>
          <label className="field"><span>고객 공개 가능 요약</span><textarea value={publicSummary} onChange={(event) => setPublicSummary(event.target.value)} /></label>
          <button disabled={!selectedLeadId || busy} onClick={addConsultation}>상담 기록 추가</button>
          {((selected?.consultationLogs || []) as Array<Record<string, unknown>>).slice(0, 4).map((log) => (
            <div className="case-row" key={String(log.log_id)}>
              <strong>{String(log.consultation_type || '상담')}</strong>
              <span>{String(log.created_at || '').slice(0, 10)}</span>
              <p>{String(log.summary || '')}</p>
            </div>
          ))}
        </div>

        <div className="drawer-block">
          <h3>현장조사 요청</h3>
          <button onClick={() => onNavigate ? onNavigate('addressNormalization') : window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'addressNormalization' }))}>현장 주소 정규화</button>
          <label className="field"><span>요청일</span><input type="date" value={surveyDate} onChange={(event) => setSurveyDate(event.target.value)} /></label>
          <button disabled={!selectedLeadId || busy} onClick={createSurvey}>현장조사 요청 생성</button>
          {((selected?.siteSurveyRequests || []) as Array<Record<string, unknown>>).slice(0, 3).map((survey) => (
            <div className="case-row" key={String(survey.survey_id)}>
              <strong>{String(survey.survey_status)}</strong>
              <span>{String(survey.requested_date || '일정 협의')}</span>
              <p>{String(survey.address_summary || '')}</p>
            </div>
          ))}
        </div>

        <div className="drawer-block">
          <h3>견적 / 프로젝트 연결</h3>
          <label className="field"><span>견적 ID</span><input value={linkedEstimateId} onChange={(event) => setLinkedEstimateId(event.target.value)} /></label>
          <button disabled={!selectedLeadId || busy} onClick={linkEstimate}>견적 요청으로 연결</button>
          <label className="field"><span>프로젝트 ID</span><input value={linkedProjectId} onChange={(event) => setLinkedProjectId(event.target.value)} /></label>
          <button disabled={!selectedLeadId || busy} onClick={linkProject}>기존 프로젝트와 연결</button>
          <button disabled={!selectedLeadId} onClick={() => onNavigate ? onNavigate('customerPortalDraft') : window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'customerPortalDraft' }))}>선택 고객 포털 초안 검토</button>
          <p>견적: {value(selected, 'linked_estimate_id') || '미연결'}</p>
          <p>프로젝트: {value(selected, 'linked_project_id') || '미연결'}</p>
          <p>계약: {value(selected, 'linked_contract_id') || '미연결'}</p>
        </div>

        <div className="drawer-block">
          <h3>주소 / 포털 / 캘린더 준비</h3>
          {renderInput('주소 정규화', 'addressNormalizedStatus')}
          {renderInput('고객 포털', 'customerPortalStatus')}
          {renderInput('포털 초대', 'portalInviteStatus')}
          {renderInput('일정 연결', 'scheduleLinkStatus')}
          {renderInput('캘린더 동기화', 'calendarSyncStatus')}
          <p>외부 API 호출과 API key 저장은 비활성 상태입니다.</p>
        </div>

        <div className="drawer-block">
          <h3>고객용 출력 가능 정보 미리보기</h3>
          {customerPayload.customer_safe ? (
            <>
              <p>표시명: {String(customerPayload.display_name || '고객')}</p>
              <p>프로젝트: {String(customerPayload.project_type || '-')}</p>
              <p>상태: {stageLabel(customerPayload.stage)}</p>
              <p>견적 상태: {String(customerPayload.estimate_status || '-')}</p>
              <p>계약 상태: {String(customerPayload.contract_status || '-')}</p>
              <strong>내부 메모, 원문 연락처, 상세주소, 원가/마진/PCE/Queue/Scoring 제외</strong>
            </>
          ) : <p>고객을 선택하면 안전한 공개 정보만 표시됩니다.</p>}
        </div>
      </div>
    </section>
  );
}
