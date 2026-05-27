import { useEffect, useMemo, useState } from 'react';
import {
  completeUserTestRun,
  createUserTestRun,
  getUserTestCenterData,
  updateUserTestStep,
  type UserTestCenterData,
  type UserTestStep,
  type UserTestStepStatus
} from '../../services/release-service/userTestService';

type StepEdit = {
  actualResult: string;
  bugSeverity: string;
  evidencePath: string;
};

function statusLabel(status: string) {
  if (status === 'PASSED') return '통과';
  if (status === 'FAILED') return '실패';
  if (status === 'BLOCKED') return '차단';
  if (status === 'IN_PROGRESS') return '진행 중';
  return '대기';
}

function statusClass(status: string) {
  if (status === 'PASSED') return 'complete';
  if (status === 'FAILED' || status === 'BLOCKED') return 'supplement';
  if (status === 'IN_PROGRESS') return 'active';
  return 'planned';
}

function toEdit(step: UserTestStep): StepEdit {
  return {
    actualResult: step.actualResult || '',
    bugSeverity: step.bugSeverity || '',
    evidencePath: step.evidencePath || ''
  };
}

export function UserTestCenterView() {
  const [data, setData] = useState<UserTestCenterData | null>(null);
  const [message, setMessage] = useState('');
  const [testerName, setTesterName] = useState('');
  const [testEnvironment, setTestEnvironment] = useState('Windows Desktop / Local DB');
  const [runNotes, setRunNotes] = useState('');
  const [conclusion, setConclusion] = useState('');
  const [edits, setEdits] = useState<Record<string, StepEdit>>({});

  async function refresh(runId = '') {
    try {
      const result = await getUserTestCenterData(runId ? { runId } : {});
      setData(result);
      setEdits(Object.fromEntries(result.steps.map((step) => [step.id, toEdit(step)])));
      setMessage(result.emptyMessageKo || '');
    } catch (error) {
      console.error('[User Test Center] load failed', error);
      setMessage('사용자 테스트 데이터를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const summary = data?.summary || { totalCount: 12, passedCount: 0, failedCount: 0, blockedCount: 0, pendingCount: 12, progressRate: 0 };
  const activeRun = data?.activeRun;
  const isClosed = Boolean(activeRun && activeRun.status !== 'IN_PROGRESS');
  const completionMessage = useMemo(() => {
    if (!activeRun || !isClosed) return '';
    return activeRun.status === 'PASSED' ? 'RC-0.3.0 사용자 테스트가 통과되었습니다.' : '조치가 필요한 테스트 결과가 있습니다.';
  }, [activeRun, isClosed]);

  async function startRun() {
    if (!testerName.trim()) {
      setMessage('테스터 이름을 입력해 주세요.');
      return;
    }
    try {
      const result = await createUserTestRun({ testerName: testerName.trim(), testEnvironment, notes: runNotes });
      setData(result);
      setEdits(Object.fromEntries(result.steps.map((step) => [step.id, toEdit(step)])));
      setMessage('새 RC-0.3.0 사용자 테스트 회차가 시작되었습니다.');
    } catch (error) {
      console.error('[User Test Center] create run failed', error);
      setMessage('테스트 회차를 생성하지 못했습니다.');
    }
  }

  function changeEdit(stepId: string, field: keyof StepEdit, value: string) {
    setEdits((current) => ({
      ...current,
      [stepId]: { ...(current[stepId] || { actualResult: '', bugSeverity: '', evidencePath: '' }), [field]: value }
    }));
  }

  async function recordStep(step: UserTestStep, status: UserTestStepStatus) {
    const edit = edits[step.id] || toEdit(step);
    try {
      const result = await updateUserTestStep({ stepId: step.id, status, ...edit });
      if (result.errorMessage) {
        setMessage(result.errorMessage);
        return;
      }
      setData(result);
      setMessage(`${step.stepCode} ${statusLabel(status)} 결과를 저장했습니다.`);
    } catch (error) {
      console.error('[User Test Center] update step failed', error);
      setMessage('테스트 단계 결과를 저장하지 못했습니다.');
    }
  }

  async function finishRun() {
    if (!activeRun) return;
    try {
      const result = await completeUserTestRun({ runId: activeRun.id, conclusion, notes: runNotes });
      setData(result);
      setMessage(result.errorMessage || '사용자 테스트 최종 판정을 저장했습니다.');
    } catch (error) {
      console.error('[User Test Center] complete run failed', error);
      setMessage('사용자 테스트 최종 판정을 저장하지 못했습니다.');
    }
  }

  return (
    <section className="view-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">RC-0.3.0 RELEASE VALIDATION</span>
            <h2>사용자 테스트 센터</h2>
            <p>LightBIM 도면부터 고객 제안 출력까지 실제 업무 흐름을 단계별로 실행하고 결과를 기록합니다.</p>
          </div>
          <span className={`status-pill ${statusClass(activeRun?.status || 'NOT_STARTED')}`}>{activeRun ? statusLabel(activeRun.status) : '회차 미시작'}</span>
        </div>
        <div className="form-grid">
          <label>테스터<input value={testerName} onChange={(event) => setTesterName(event.target.value)} placeholder="테스터 이름" /></label>
          <label>테스트 환경<input value={testEnvironment} onChange={(event) => setTestEnvironment(event.target.value)} /></label>
          <label>회차 메모<input value={runNotes} onChange={(event) => setRunNotes(event.target.value)} placeholder="기기, 빌드, 특이사항" /></label>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={() => void startRun()}>새 테스트 회차 시작</button>
          <button onClick={() => void refresh(activeRun?.id || '')}>새로고침</button>
        </div>
        {message ? <p className="assistant-message">{message}</p> : null}
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">PROGRESS</span>
            <h3>검증 현황</h3>
          </div>
          <strong>{Math.round(summary.progressRate * 100)}% 완료</strong>
        </div>
        <div className="internal-kpi-grid">
          <article><span>전체 단계</span><strong>{summary.totalCount}</strong></article>
          <article><span>통과</span><strong>{summary.passedCount}</strong></article>
          <article><span>실패</span><strong>{summary.failedCount}</strong></article>
          <article><span>차단</span><strong>{summary.blockedCount}</strong></article>
          <article><span>미완료</span><strong>{summary.pendingCount}</strong></article>
        </div>
        {data?.runs.length ? (
          <div className="button-row">
            {data.runs.slice(0, 5).map((run) => (
              <button key={run.id} onClick={() => void refresh(run.id)}>
                {run.testerName} / {statusLabel(run.status)}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">CHECKLIST</span>
            <h3>실행 체크리스트</h3>
          </div>
          <span className="small-note">실제 결과, 증빙 경로와 결함 심각도를 함께 기록합니다.</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>단계</th>
                <th>모듈 / 검증 항목</th>
                <th>기대 결과</th>
                <th>결과 기록</th>
                <th>상태 / 작업</th>
              </tr>
            </thead>
            <tbody>
              {data?.steps.map((step) => {
                const edit = edits[step.id] || toEdit(step);
                return (
                  <tr key={step.id}>
                    <td>{step.stepCode}</td>
                    <td><strong>{step.moduleName}</strong><br />{step.taskName}</td>
                    <td>{step.expectedResult}</td>
                    <td>
                      <input value={edit.actualResult} onChange={(event) => changeEdit(step.id, 'actualResult', event.target.value)} placeholder="실제 결과" disabled={!activeRun || isClosed} />
                      <select value={edit.bugSeverity} onChange={(event) => changeEdit(step.id, 'bugSeverity', event.target.value)} disabled={!activeRun || isClosed}>
                        <option value="">심각도 없음</option>
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                      <input value={edit.evidencePath} onChange={(event) => changeEdit(step.id, 'evidencePath', event.target.value)} placeholder="스크린샷 / 파일 경로" disabled={!activeRun || isClosed} />
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(step.status)}`}>{statusLabel(step.status)}</span>
                      <div className="button-row">
                        <button disabled={!activeRun || isClosed} onClick={() => void recordStep(step, 'PASSED')}>통과</button>
                        <button disabled={!activeRun || isClosed} onClick={() => void recordStep(step, 'FAILED')}>실패</button>
                        <button disabled={!activeRun || isClosed} onClick={() => void recordStep(step, 'BLOCKED')}>차단</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">TEST ASSETS</span>
            <h3>문서 및 샘플 데이터</h3>
          </div>
        </div>
        <ul>
          {(data?.documents || []).map((document) => <li key={document}>{document}</li>)}
          <li>{data?.sampleDataPath || 'tests/user-test-data/rc-0.3.0'}</li>
        </ul>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">SIGN-OFF</span>
            <h3>최종 판정</h3>
          </div>
          {completionMessage ? <strong>{completionMessage}</strong> : null}
        </div>
        <div className="form-grid">
          <label>판정 메모<input value={conclusion} onChange={(event) => setConclusion(event.target.value)} placeholder="승인 의견 또는 보완 요구" disabled={!activeRun || isClosed} /></label>
        </div>
        <div className="button-row">
          <button className="primary-action" disabled={!activeRun || isClosed} onClick={() => void finishRun()}>테스트 판정 완료</button>
        </div>
        {!activeRun ? <p className="empty-state">시작된 사용자 테스트 회차가 없습니다.</p> : null}
      </section>
    </section>
  );
}
