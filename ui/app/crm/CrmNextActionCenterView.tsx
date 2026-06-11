import { useEffect, useMemo, useState } from 'react';
import { crmNextActionService } from '../../services/crm-service/crmNextActionService';
import { crmPipelineService } from '../../services/crm-service/crmPipelineService';
import type { ViewKey } from '../../src/types/dashboard';

type Props = { onNavigate?: (view: ViewKey) => void };
type Row = Record<string, unknown>;

const ACTION_TYPES = [
  ['FIRST_CONTACT', '첫 연락'], ['FOLLOW_UP', '후속 연락'], ['CONSULTATION_REVIEW', '상담 검토'],
  ['SITE_SURVEY_CONFIRM', '현장조사 확인'], ['ESTIMATE_PREPARE', '견적 준비'],
  ['ESTIMATE_SEND', '견적 발송'], ['NEGOTIATION_FOLLOW_UP', '협의 후속'],
  ['CONTRACT_FOLLOW_UP', '계약 후속'], ['PROJECT_HANDOFF', '프로젝트 인계'],
  ['CUSTOMER_CHECK', '고객 확인'], ['MANUAL', '수동 액션']
] as const;

const STATUS_LABELS: Record<string, string> = {
  OPEN: '진행 필요', IN_PROGRESS: '진행 중', SNOOZED: '보류',
  COMPLETED: '완료', CANCELLED: '취소', OVERDUE: '기한 초과'
};
const value = (row: Row | null, key: string) => String(row?.[key] || '');

export function CrmNextActionCenterView({ onNavigate }: Props) {
  const [actions, setActions] = useState<Row[]>([]);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [selected, setSelected] = useState<Row | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [quickFilter, setQuickFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    leadId: '', actionType: 'MANUAL', title: '고객 후속 연락',
    priority: 'NORMAL', dueAt: '', assignedTo: '대표', descriptionInternal: ''
  });

  const kpis = (summary.kpis || {}) as Row;
  const selectedActionId = value(selected, 'action_id');
  const cards = useMemo(() => [
    ['오늘 할 일', kpis.today], ['기한 초과', kpis.overdue], ['7일 이내', kpis.thisWeek],
    ['고위험 알림', kpis.highRiskNotifications], ['현장조사 확인', kpis.siteSurvey],
    ['견적 지연', kpis.estimateDelay], ['계약 후속', kpis.contractFollowUp]
  ], [summary]);

  async function refresh(actionId?: string) {
    const filters: Row = {};
    if (statusFilter) filters.status = statusFilter;
    if (quickFilter === 'today') filters.today = true;
    if (quickFilter === 'overdue') filters.overdue = true;
    if (stageFilter) filters.relatedStage = stageFilter;
    if (assignedFilter) filters.assignedTo = assignedFilter;
    if (priorityFilter) filters.priority = priorityFilter;
    if (typeFilter) filters.actionType = typeFilter;
    const [nextActions, nextNotifications, nextSummary, nextLeads] = await Promise.all([
      crmNextActionService.list(filters),
      crmNextActionService.listNotifications({}),
      crmNextActionService.summary(),
      crmPipelineService.listCrmLeads({})
    ]);
    setActions(nextActions);
    setNotifications(nextNotifications);
    setSummary(nextSummary);
    setLeads(nextLeads);
    const target = actionId || selectedActionId;
    if (target) setSelected(await crmNextActionService.detail({ actionId: target }));
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : '다음 액션을 불러오지 못했습니다.'));
  }, [statusFilter, quickFilter, stageFilter, assignedFilter, priorityFilter, typeFilter]);

  async function run(action: () => Promise<Row>, success: string) {
    setBusy(true);
    setMessage('');
    try {
      const result = await action();
      setMessage(success);
      await refresh(String(result.actionId || selectedActionId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'CRM 다음 액션 처리 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function navigate(view: ViewKey) {
    if (onNavigate) onNavigate(view);
    else window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
  }

  async function createAction() {
    if (!form.leadId) return setMessage('고객을 선택하세요.');
    await run(() => crmNextActionService.create(form), 'CRM 다음 액션이 생성되었습니다.');
  }

  async function updateNotification(notificationId: string, mode: 'read' | 'dismiss') {
    const action = mode === 'read' ? crmNextActionService.readNotification : crmNextActionService.dismissNotification;
    await run(() => action({ notificationId }), mode === 'read' ? '알림을 읽음 처리했습니다.' : '알림을 닫았습니다.');
  }

  return (
    <section className="cost-capture-view">
      <div className="section-header">
        <div>
          <span className="eyebrow">RC-0.4.1 INTERNAL CRM</span>
          <h2>CRM 다음 액션 / 내부 알림</h2>
          <p>CRM 단계별 후속 작업과 지연 알림을 내부 운영 화면에서 관리합니다.</p>
        </div>
        <div className="button-row">
          <button onClick={() => navigate('crmPipeline')}>CRM 파이프라인</button>
          <button onClick={() => navigate('realProjectIntake')}>실제 프로젝트 접수</button>
          <button disabled={busy} onClick={() => run(() => crmNextActionService.report({}), 'CRM 다음 액션 리포트가 생성되었습니다.')}>리포트 생성</button>
        </div>
      </div>

      {message ? <div className="drawer-block">{message}</div> : null}

      <div className="kpi-grid">
        {cards.map(([label, count]) => <div className="kpi-card" key={String(label)}><span>{String(label)}</span><strong>{Number(count || 0)}건</strong></div>)}
      </div>

      <div className="drawer-grid">
        <div className="drawer-block">
          <div className="section-header">
            <div><h3>다음 액션 목록</h3><p>문자·이메일·카카오·캘린더 외부 전송은 비활성입니다.</p></div>
          </div>
          <div className="field-grid">
            <label className="field"><span>빠른 필터</span><select value={quickFilter} onChange={(event) => setQuickFilter(event.target.value)}><option value="">전체</option><option value="today">오늘</option><option value="overdue">기한 초과</option></select></label>
            <label className="field"><span>상태</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">전체</option>{Object.entries(STATUS_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
            <label className="field"><span>Stage</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value)}><option value="">전체</option>{Array.from(new Set(actions.map((row) => String(row.related_stage)).filter(Boolean))).map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label className="field"><span>담당자</span><select value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value)}><option value="">전체</option>{Array.from(new Set(actions.map((row) => String(row.assigned_to)).filter(Boolean))).map((assigned) => <option key={assigned}>{assigned}</option>)}</select></label>
            <label className="field"><span>우선순위</span><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="">전체</option><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label>
            <label className="field"><span>액션 유형</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">전체</option>{ACTION_TYPES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>고객</th><th>액션</th><th>Stage</th><th>기한</th><th>우선순위</th><th>담당자</th><th>상태</th><th>Source</th><th>바로가기</th></tr></thead>
              <tbody>{actions.map((row) => <tr key={String(row.action_id)}>
                <td>{String(row.customer_name || '고객')}</td>
                <td><button onClick={async () => setSelected(await crmNextActionService.detail({ actionId: row.action_id }))}>{String(row.title)}</button></td>
                <td>{String(row.related_stage || '-')}</td>
                <td>{String(row.due_at || '-').slice(0, 16).replace('T', ' ')}</td>
                <td>{String(row.priority)}</td><td>{String(row.assigned_to || '-')}</td>
                <td>{STATUS_LABELS[String(row.status)] || String(row.status)}</td>
                <td>{String(row.source || '-')}</td>
                <td><button onClick={() => navigate('crmPipeline')}>CRM 열기</button></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!actions.length ? <p>조건에 맞는 다음 액션이 없습니다.</p> : null}
        </div>

        <div className="drawer-block">
          <h3>액션 상세</h3>
          {selected ? <>
            <strong>{value(selected, 'title')}</strong>
            <p>고객: {String((selected.lead as Row | undefined)?.customer_display_name || '고객')}</p>
            <p>유형: {value(selected, 'action_type')}</p>
            <p>단계: {value(selected, 'related_stage')}</p>
            <p>기한: {value(selected, 'due_at').slice(0, 16).replace('T', ' ') || '-'}</p>
            <p>내부 메모: {value(selected, 'description_internal') || '없음'}</p>
            <p>다음 추천 액션: {value(selected, 'status') === 'COMPLETED' ? 'CRM 단계와 상담 결과를 확인하세요.' : '현재 액션을 완료하거나 기한을 조정하세요.'}</p>
            <p>Stage history: {((selected.stageHistory || []) as Row[]).map((row) => String(row.to_stage)).join(' → ') || '기록 없음'}</p>
            <p>상담 요약: {String((((selected.consultationLogs || []) as Row[])[0] || {}).public_summary || '공개 가능 요약 없음')}</p>
            <p>Customer-safe preview: {String(((selected.customerSafePreview || {}) as Row).display_name || '고객')} / {String(((selected.customerSafePreview || {}) as Row).stage || '-')}</p>
            <div className="button-row">
              <button disabled={busy} onClick={() => run(() => crmNextActionService.complete({ actionId: selectedActionId, completionNote: '업무 완료' }), '다음 액션을 완료했습니다.')}>완료</button>
              <button disabled={busy} onClick={() => run(() => crmNextActionService.snooze({ actionId: selectedActionId }), '다음 액션을 24시간 보류했습니다.')}>24시간 보류</button>
              <button disabled={busy} onClick={() => run(() => crmNextActionService.snooze({ actionId: selectedActionId, snoozeUntil: new Date(Date.now() + 7 * 86400000).toISOString() }), '다음 액션을 7일 연기했습니다.')}>7일 연기</button>
              <button disabled={busy} onClick={() => run(() => crmNextActionService.cancel({ actionId: selectedActionId, reason: '운영자 취소' }), '다음 액션을 취소했습니다.')}>취소</button>
            </div>
          </> : <p>목록에서 액션을 선택하세요.</p>}
        </div>
      </div>

      <div className="drawer-grid">
        <div className="drawer-block">
          <h3>수동 다음 액션 생성</h3>
          <label className="field"><span>고객</span><select value={form.leadId} onChange={(event) => setForm({ ...form, leadId: event.target.value })}><option value="">고객 선택</option>{leads.map((lead) => <option key={String(lead.lead_id)} value={String(lead.lead_id)}>{String(lead.customer_name || '고객')} · {String(lead.stage)}</option>)}</select></label>
          <label className="field"><span>액션 유형</span><select value={form.actionType} onChange={(event) => setForm({ ...form, actionType: event.target.value })}>{ACTION_TYPES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <label className="field"><span>제목</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
          <label className="field"><span>기한</span><input type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} /></label>
          <label className="field"><span>우선순위</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option></select></label>
          <label className="field"><span>담당자</span><input value={form.assignedTo} onChange={(event) => setForm({ ...form, assignedTo: event.target.value })} /></label>
          <label className="field"><span>내부 메모</span><textarea value={form.descriptionInternal} onChange={(event) => setForm({ ...form, descriptionInternal: event.target.value })} /></label>
          <button className="command" disabled={busy} onClick={createAction}>다음 액션 생성</button>
        </div>

        <div className="drawer-block">
          <h3>내부 알림</h3>
          {notifications.slice(0, 12).map((notification) => <div className="case-row" key={String(notification.notification_id)}>
            <strong>{String(notification.title)}</strong><span>{String(notification.severity)} · {String(notification.status)}</span>
            <p>{String(notification.message_internal || '')}</p>
            <div className="button-row">
              <button disabled={notification.status !== 'UNREAD' || busy} onClick={() => updateNotification(String(notification.notification_id), 'read')}>읽음</button>
              <button disabled={notification.status === 'DISMISSED' || busy} onClick={() => updateNotification(String(notification.notification_id), 'dismiss')}>닫기</button>
            </div>
          </div>)}
          {!notifications.length ? <p>내부 알림이 없습니다.</p> : null}
          <strong>고객 화면에는 내부 알림, 담당자 메모, 지연 위험 정보가 노출되지 않습니다.</strong>
        </div>
      </div>
    </section>
  );
}
