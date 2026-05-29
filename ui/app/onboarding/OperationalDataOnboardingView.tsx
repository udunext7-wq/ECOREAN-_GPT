import { useEffect, useMemo, useState } from 'react';
import {
  completeOperationalOnboardingRun,
  createOperationalOnboardingIssue,
  createOperationalOnboardingRun,
  generateOperationalOnboardingReport,
  getOperationalOnboardingRun,
  getOperationalOnboardingRuns,
  updateOperationalOnboardingStep,
  type OnboardingIssueSeverity,
  type OnboardingStepStatus,
  type OperationalOnboardingRun
} from '../../services/onboarding-service/operationalOnboardingService';

const decisionLabels = ['운영 시작 가능', '조건부 운영 가능', '수정 후 재검토', '운영 보류'];

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

export function OperationalDataOnboardingView() {
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [activeRun, setActiveRun] = useState<OperationalOnboardingRun | null>(null);
  const [messageKo, setMessageKo] = useState('');
  const [busy, setBusy] = useState(false);
  const [issueForm, setIssueForm] = useState({
    stepKey: 'issue_backlog',
    severity: 'S3' as OnboardingIssueSeverity,
    screen: '운영 데이터 입력',
    description: '',
    reproductionSteps: '',
    decision: 'RC-0.3.1 수정 후보'
  });

  async function refreshRuns() {
    setRuns(await getOperationalOnboardingRuns());
  }

  useEffect(() => {
    refreshRuns();
  }, []);

  const steps = useMemo(() => activeRun?.steps || [], [activeRun]);
  const issues = useMemo(() => activeRun?.issues || [], [activeRun]);
  const summary = useMemo(() => activeRun?.summary || {}, [activeRun]);

  async function startRun() {
    setBusy(true);
    try {
      const run = await createOperationalOnboardingRun({ version: 'RC-0.3.1', runName: '전체 운영 데이터 입력' });
      setActiveRun(run as OperationalOnboardingRun);
      setMessageKo('RC-0.3.1 운영 데이터 입력 실행을 시작했습니다.');
      await refreshRuns();
    } finally {
      setBusy(false);
    }
  }

  async function markStep(stepKey: string, status: OnboardingStepStatus) {
    if (!activeRun) return;
    const result = await updateOperationalOnboardingStep({
      runId: activeRun.id,
      stepKey,
      status,
      actualResult: status === 'PASSED' ? '기대 결과 확인' : status === 'FAILED' ? '문제 확인' : status === 'BLOCKED' ? '진행 차단' : '',
      note: status === 'PASSED' ? '운영 입력 흐름 통과' : ''
    });
    setActiveRun(result as OperationalOnboardingRun);
  }

  async function addIssue() {
    if (!activeRun || !issueForm.description.trim()) {
      setMessageKo('이슈 설명을 입력하세요.');
      return;
    }
    const result = await createOperationalOnboardingIssue({
      runId: activeRun.id,
      stepKey: issueForm.stepKey,
      severity: issueForm.severity,
      screen: issueForm.screen,
      description: issueForm.description,
      reproductionSteps: issueForm.reproductionSteps,
      decision: issueForm.decision,
      targetVersion: 'RC-0.3.1'
    });
    setActiveRun((result as { run?: OperationalOnboardingRun })?.run || activeRun);
    setIssueForm((current) => ({ ...current, description: '', reproductionSteps: '' }));
    setMessageKo('운영 이슈가 기록되었습니다.');
  }

  async function finishRun() {
    if (!activeRun) return;
    const result = await completeOperationalOnboardingRun(activeRun.id);
    const run = (result as { run?: OperationalOnboardingRun })?.run;
    if (run) setActiveRun(run);
    setMessageKo(String((result as Record<string, unknown>)?.messageKo || (result as Record<string, unknown>)?.decisionKo || '완료 판정이 갱신되었습니다.'));
    await refreshRuns();
  }

  async function createReport() {
    if (!activeRun) return;
    const result = await generateOperationalOnboardingReport(activeRun.id);
    setMessageKo(`리포트 생성: ${String((result as Record<string, unknown>)?.reportPath || '-')}`);
  }

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">RC-0.3.1</span>
          <h2>RC-0.3.1 운영 데이터 입력</h2>
          <p>실제 업체, 실제 단가, 첫 프로젝트, 첫 출력까지 운영 시작 순서를 기록합니다.</p>
        </div>
        <strong className={String(summary.decisionKo || '').includes('가능') ? 'green-kpi' : 'red-kpi'}>
          {String(summary.decisionKo || '시작 전')}
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">START</span>
            <h3>운영 시작 체크리스트</h3>
          </div>
          <div className="button-row">
            <button className="command command-approve" disabled={busy} onClick={() => void startRun()}>새 운영 데이터 입력 시작</button>
            <button disabled={!activeRun} onClick={() => void finishRun()}>리포트 판정</button>
            <button disabled={!activeRun} onClick={() => void createReport()}>리포트 생성</button>
          </div>
        </div>
        <p>S1/S2 이슈가 남아 있으면 “운영 시작 가능”으로 완료하지 않습니다. S3/S4는 수정 후보로 분리할 수 있습니다.</p>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>전체 단계</span><strong>{String(summary.totalSteps || 0)}개</strong></div>
        <div><span>통과</span><strong>{String(summary.passedCount || 0)}개</strong></div>
        <div><span>실패</span><strong>{String(summary.failedCount || 0)}개</strong></div>
        <div><span>차단</span><strong>{String(summary.blockedCount || 0)}개</strong></div>
        <div><span>이슈</span><strong>{String(summary.issueCount || 0)}건</strong></div>
        <div><span>S1/S2 미해결</span><strong>{String(Number(summary.s1OpenCount || 0) + Number(summary.s2OpenCount || 0))}건</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">SHORTCUTS</span>
            <h3>업체 정보 입력 / 단가표 가져오기 / 노무 단가 입력</h3>
          </div>
        </div>
        <div className="action-command-grid">
          <button className="command" onClick={() => navigate('backupRestore')}>백업 센터 열기</button>
          <button className="command" onClick={() => navigate('masterDb')}>업체 정보 입력</button>
          <button className="command" onClick={() => navigate('priceWorkbookImport')}>단가표 가져오기 열기</button>
          <button className="command" onClick={() => navigate('realPriceCalibration')}>노무 단가 / 승인 반영</button>
          <button className="command" onClick={() => navigate('project')}>첫 프로젝트 생성</button>
          <button className="command" onClick={() => navigate('lightbimImport')}>LightBIM 가져오기 열기</button>
          <button className="command" onClick={() => navigate('fullRemodelingEstimate')}>견적 화면 열기</button>
          <button className="command" onClick={() => navigate('clientPortal')}>고객용 출력 확인</button>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">CHECKLIST</span>
            <h3>LightBIM 도면 가져오기 / 견적/PCE 확인 / 출력 확인</h3>
          </div>
        </div>
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>단계</th>
                <th>기대 결과</th>
                <th>상태</th>
                <th>실제 결과</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={String(step.step_key)}>
                  <td>{String(step.step_name)}</td>
                  <td>{String(step.expected_result || '-')}</td>
                  <td>{String(step.status)}</td>
                  <td>{String(step.actual_result || step.note || '-')}</td>
                  <td>
                    <div className="button-row">
                      <button onClick={() => void markStep(String(step.step_key), 'PASSED')}>단계 통과</button>
                      <button onClick={() => void markStep(String(step.step_key), 'FAILED')}>단계 실패</button>
                      <button onClick={() => void markStep(String(step.step_key), 'BLOCKED')}>차단 기록</button>
                    </div>
                  </td>
                </tr>
              ))}
              {steps.length === 0 ? <tr><td colSpan={5}>진행 중인 운영 데이터 입력 실행이 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ISSUES</span>
            <h3>문제 기록 / 다음 수정 후보</h3>
          </div>
          <div className="button-row">
            {decisionLabels.map((label) => <span key={label} className="status-chip">{label}</span>)}
          </div>
        </div>
        <div className="estimate-form-grid">
          <label>
            단계
            <select value={issueForm.stepKey} onChange={(event) => setIssueForm((current) => ({ ...current, stepKey: event.target.value }))}>
              {steps.map((step) => <option key={String(step.step_key)} value={String(step.step_key)}>{String(step.step_name)}</option>)}
            </select>
          </label>
          <label>
            심각도
            <select value={issueForm.severity} onChange={(event) => setIssueForm((current) => ({ ...current, severity: event.target.value as OnboardingIssueSeverity }))}>
              <option value="S1">S1 치명</option>
              <option value="S2">S2 높음</option>
              <option value="S3">S3 보통</option>
              <option value="S4">S4 낮음</option>
            </select>
          </label>
          <label>
            화면
            <input value={issueForm.screen} onChange={(event) => setIssueForm((current) => ({ ...current, screen: event.target.value }))} />
          </label>
          <label>
            결정
            <input value={issueForm.decision} onChange={(event) => setIssueForm((current) => ({ ...current, decision: event.target.value }))} />
          </label>
        </div>
        <textarea value={issueForm.description} onChange={(event) => setIssueForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="이슈 설명" />
        <textarea value={issueForm.reproductionSteps} onChange={(event) => setIssueForm((current) => ({ ...current, reproductionSteps: event.target.value }))} rows={3} placeholder="재현 순서" />
        <button disabled={!activeRun} className="command command-block" onClick={() => void addIssue()}>이슈 추가</button>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">RUN HISTORY</span>
            <h3>운영 데이터 입력 이력</h3>
          </div>
          <button onClick={() => void refreshRuns()}>새로고침</button>
        </div>
        <div className="today-action-list">
          {runs.map((run) => (
            <button
              key={String(run.id)}
              className="action-row"
              onClick={async () => setActiveRun(await getOperationalOnboardingRun(String(run.id)) as OperationalOnboardingRun)}
            >
              <span>{String(run.status)}</span>
              <div>
                <strong>{String(run.run_name)}</strong>
                <p>{String(run.version)} / {String(run.created_at)}</p>
              </div>
              <em>열기</em>
            </button>
          ))}
          {runs.length === 0 ? <p className="empty-state">운영 데이터 입력 이력이 없습니다.</p> : null}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">RECORDED ISSUES</span>
            <h3>기록된 문제</h3>
          </div>
        </div>
        {issues.length === 0 ? <p className="empty-state">기록된 문제가 없습니다.</p> : (
          <div className="today-action-list">
            {issues.map((issue) => (
              <div key={String(issue.id)} className={`action-row ${String(issue.severity) === 'S1' || String(issue.severity) === 'S2' ? 'warning-row' : ''}`}>
                <span>{String(issue.severity)}</span>
                <div>
                  <strong>{String(issue.screen || '화면 미지정')}</strong>
                  <p>{String(issue.description)}</p>
                </div>
                <em>{String(issue.status)}</em>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
