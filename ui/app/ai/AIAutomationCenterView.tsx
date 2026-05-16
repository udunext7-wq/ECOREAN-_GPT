import { useEffect, useMemo, useState } from 'react';
import {
  decideAIAgentTask,
  getAIAutomationCenterData,
  runAIAgentAutomation,
  type AIAutomationCenterData
} from '../../services/ai-automation-service/aiAutomationService';

function text(value: unknown, fallback = '데이터 없음') {
  return value == null || value === '' ? fallback : String(value);
}

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

function statusKo(value: unknown) {
  if (value === 'PENDING') return '승인 필요';
  if (value === 'APPROVED') return '승인됨';
  if (value === 'REJECTED') return '반려됨';
  if (value === 'EXECUTED') return '실행 완료';
  if (value === 'FAILED') return '실패';
  return text(value);
}

function priorityKo(value: unknown) {
  if (value === 'RED') return '위험 경고';
  if (value === 'ORANGE') return '주의';
  if (value === 'YELLOW') return '관찰';
  return '일반';
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function Metric({ title, value, note, tone = '' }: { title: string; value: string; note: string; tone?: string }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

export function AIAutomationCenterView() {
  const [data, setData] = useState<AIAutomationCenterData | null>(null);
  const [messageKo, setMessageKo] = useState('AI 운영 자동화 데이터를 불러오는 중입니다.');

  async function refresh(runAgents = true) {
    const next = await getAIAutomationCenterData(runAgents);
    setData(next);
    setMessageKo(next.emptyState ? text(next.emptyMessageKo) : 'AI 위험 감지와 작업 큐가 최신화되었습니다.');
  }

  useEffect(() => {
    refresh(true);
  }, []);

  async function handleRun() {
    const result = await runAIAgentAutomation();
    await refresh(false);
    setMessageKo(`AI 감지 실행 완료: ${Number((result as { taskCount?: number })?.taskCount || 0)}건 확인`);
  }

  async function handleDecision(taskId: string, decision: 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED') {
    const reasonKo = decision === 'APPROVED' ? '대표 승인' : decision === 'REJECTED' ? '대표 반려' : '테스트 실행';
    const result = await decideAIAgentTask(taskId, decision, reasonKo);
    const updated = (result as { aiAutomationData?: AIAutomationCenterData })?.aiAutomationData;
    setData(updated ?? await getAIAutomationCenterData(false));
    setMessageKo(`AI 작업이 ${statusKo(decision)} 처리되었습니다.`);
  }

  const tasks = useMemo(() => asRows(data?.tasks), [data]);
  const approvals = useMemo(() => asRows(data?.approvalQueue), [data]);
  const agents = useMemo(() => asRows(data?.agents), [data]);
  const logs = useMemo(() => asRows(data?.learningLogs), [data]);
  const rules = useMemo(() => asRows(data?.preventionRules), [data]);
  const summary = data?.summary || {};

  if (!data) return <div className="drawer-block">AI 운영 자동화 데이터를 불러오는 중입니다.</div>;

  return (
    <div className="execution-panel">
      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">AI OPERATING AGENTS</span>
            <h3>AI 운영 자동화</h3>
            <p>AI는 위험을 감지하고 추천과 Draft를 준비합니다. 재무/법무/최종 실행은 대표 승인 후에만 진행됩니다.</p>
          </div>
          <div className="button-row">
            <button className="primary-action" onClick={handleRun}>AI 감지 실행</button>
            <button onClick={() => refresh(false)}>새로고침</button>
          </div>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="kpi-grid">
        <Metric title="위험 감지" value={`${Number(summary.redTaskCount || 0)}건`} note="RED 우선 검토" tone={Number(summary.redTaskCount || 0) > 0 ? 'danger' : ''} />
        <Metric title="자동 추천" value={`${Number(summary.pendingTaskCount || 0)}건`} note="AI 작업 큐" />
        <Metric title="자동 Draft 생성" value={`${approvals.length}건`} note="승인 대기" tone={approvals.length ? 'warning-row' : ''} />
        <Metric title="AI 예방 규칙" value={`${Number(summary.activePreventionRuleCount || 0)} / ${Number(summary.preventionRuleCount || 0)}`} note="활성 / 전체" />
      </div>

      <div className="dashboard-grid three">
        <section className="drawer-block">
          <h3>AI Agent</h3>
          <div className="today-action-list">
            {agents.length === 0 ? <p className="empty-state">등록된 AI Agent가 없습니다.</p> : null}
            {agents.map((agent) => (
              <div className="action-row" key={String(agent.id)}>
                <span>{Number(agent.is_enabled || 0) ? 'ON' : 'OFF'}</span>
                <div>
                  <strong>{text(agent.agent_name)}</strong>
                  <p>{text(agent.agent_type)} / 기준 {text(agent.risk_threshold)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="drawer-block">
          <h3>승인 대기</h3>
          <div className="today-action-list">
            {approvals.length === 0 ? <p className="empty-state">승인 대기 AI 작업이 없습니다.</p> : null}
            {approvals.slice(0, 6).map((task) => (
              <div className={task.priority === 'RED' ? 'action-row warning-row' : 'action-row'} key={String(task.id)}>
                <span>{priorityKo(task.priority)}</span>
                <div>
                  <strong>{text(task.detected_risk)}</strong>
                  <p>{text(task.recommendation)}</p>
                  <em>{text(task.agent_type)} / {money(task.financialImpact || 0)}</em>
                </div>
                <div className="approval-actions-strong">
                  <button onClick={() => handleDecision(String(task.id), 'APPROVED')}>승인</button>
                  <button onClick={() => handleDecision(String(task.id), 'REJECTED')}>반려</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="drawer-block">
          <h3>AI 예방 규칙</h3>
          <div className="today-action-list">
            {rules.length === 0 ? <p className="empty-state">AI 예방 규칙이 없습니다.</p> : null}
            {rules.slice(0, 6).map((rule) => (
              <div className={rule.severity === 'RED' ? 'action-row warning-row' : 'action-row'} key={String(rule.id)}>
                <span>{text(rule.status)}</span>
                <div>
                  <strong>{text(rule.rule_name)}</strong>
                  <p>{text(rule.recommended_action)}</p>
                  <em>{text(rule.source_agent)}</em>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="drawer-block">
        <h3>AI 작업 큐</h3>
        <div className="data-table">
          <div className="table-row table-head">
            <span>상태</span>
            <span>Agent</span>
            <span>AI 감지</span>
            <span>AI 추천</span>
            <span>승인</span>
          </div>
          {tasks.length === 0 ? <p className="empty-state">대기 중인 AI 작업이 없습니다.</p> : null}
          {tasks.map((task) => (
            <div className="table-row" key={String(task.id)}>
              <span>{statusKo(task.status)} / {priorityKo(task.priority)}</span>
              <span>{text(task.agent_type)}</span>
              <span>{text(task.detected_risk)}</span>
              <span>{text(task.recommendation)}</span>
              <span>
                {task.status === 'PENDING' ? (
                  <>
                    <button onClick={() => handleDecision(String(task.id), 'APPROVED')}>승인</button>
                    <button onClick={() => handleDecision(String(task.id), 'REJECTED')}>반려</button>
                    <button onClick={() => handleDecision(String(task.id), 'EXECUTED')}>테스트 실행</button>
                  </>
                ) : statusKo(task.status)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="drawer-block">
        <h3>AI 학습 로그 / AI 실행 기록</h3>
        <div className="today-action-list">
          {logs.length === 0 ? <p className="empty-state">AI 학습 로그가 없습니다.</p> : null}
          {logs.slice(0, 12).map((log) => (
            <div className="action-row" key={String(log.id)}>
              <span>{text(log.event_type)}</span>
              <div>
                <strong>{text(log.detected_pattern)}</strong>
                <p>{text(log.generated_action)}</p>
                <em>{text(log.final_result)} / {text(log.created_at)}</em>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
