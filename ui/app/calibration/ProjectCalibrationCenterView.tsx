import { useEffect, useMemo, useState } from 'react';
import {
  createCalibrationSnapshot,
  decideCalibrationRule,
  loadProjectCalibrationCenterData,
  type ProjectCalibrationData
} from '../../services/calibration-service/projectCalibrationService';

function money(value: unknown) {
  const number = Number(value || 0);
  return number === 0 ? '0원' : `${number.toLocaleString('ko-KR')}원`;
}

function rate(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function statusClass(status: unknown) {
  if (status === 'PENDING_APPROVAL') return 'warning-row';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

export function ProjectCalibrationCenterView() {
  const [data, setData] = useState<ProjectCalibrationData | null>(null);
  const [projectId, setProjectId] = useState('');
  const [messageKo, setMessageKo] = useState('실제 프로젝트 보정 데이터를 불러오는 중입니다.');

  const selectedComparison = useMemo(() => {
    if (!data?.comparisons?.length) return null;
    return data.comparisons.find((item) => item.projectId === projectId) || data.comparisons[0];
  }, [data, projectId]);

  async function refresh(nextProjectId = projectId) {
    const next = await loadProjectCalibrationCenterData(nextProjectId || undefined);
    setData(next);
    const firstProjectId = String(next.comparisons?.[0]?.projectId || nextProjectId || '');
    if (!projectId && firstProjectId) setProjectId(firstProjectId);
    setMessageKo(next.emptyState ? next.emptyMessageKo : '실제 프로젝트 보정 센터가 최신화되었습니다.');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runCalibration() {
    if (!projectId) {
      setMessageKo('보정할 프로젝트 ID를 먼저 입력하세요.');
      return;
    }
    await createCalibrationSnapshot(projectId);
    setMessageKo('예상 vs 실제 비교와 자동 보정 룰을 생성했습니다.');
    await refresh(projectId);
  }

  async function decide(ruleId: string, decision: 'APPROVED' | 'REJECTED' | 'TESTING') {
    await decideCalibrationRule(ruleId, decision);
    setMessageKo(decision === 'APPROVED' ? '보정 룰이 승인되어 다음 견적에 반영됩니다.' : decision === 'REJECTED' ? '보정 룰을 반려했습니다.' : '보정 룰을 테스트 적용 상태로 변경했습니다.');
    await refresh(projectId);
  }

  const summary = data?.summary || {};
  const costLeaks = data?.costLeaks || [];
  const rules = data?.calibrationRules || [];
  const patterns = data?.riskPatterns || [];

  return (
    <section className="execution-panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">REAL PROJECT CALIBRATION</span>
          <h2>실제 프로젝트 보정</h2>
          <p>완료 프로젝트의 실제 원가, 실제 공기, 실제 마진을 다음 견적의 보정 룰로 연결합니다.</p>
        </div>
      </div>

      <div className="drawer-block">
        <div className="form-grid">
          <label>
            프로젝트 ID
            <input value={projectId} onChange={(event) => setProjectId(event.target.value)} placeholder="예: PRJ-PROD-BATH-0001" />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={runCalibration}>실제 보정 분석 실행</button>
          <button onClick={() => refresh(projectId)}>새로고침</button>
        </div>
        <p>{messageKo}</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>분석 프로젝트</span>
          <strong>{String(summary.projectCount || 0)}건</strong>
          <small>예상 vs 실제 비교 대상</small>
        </div>
        <div className="kpi-card warning-row">
          <span>원가 누수</span>
          <strong>{money(summary.totalLeakAmount)}</strong>
          <small>{String(summary.costLeakCount || 0)}건 감지</small>
        </div>
        <div className="kpi-card">
          <span>승인 대기 보정</span>
          <strong>{String(summary.pendingApprovalCount || 0)}건</strong>
          <small>대표 승인 후 다음 견적 반영</small>
        </div>
        <div className="kpi-card">
          <span>반복 위험 패턴</span>
          <strong>{String(summary.repeatedPatternCount || 0)}건</strong>
          <small>2회 이상 반복 시 추천 강화</small>
        </div>
      </div>

      <div className="dashboard-grid three">
        <section className="drawer-block">
          <h3>예상 vs 실제 비교</h3>
          {selectedComparison ? (
            <>
              <p>예상 매출: {money(selectedComparison.expectedRevenue)}</p>
              <p>실제 입금: {money(selectedComparison.actualRevenue)}</p>
              <p>예상 마진율: {rate(selectedComparison.expectedMarginRate)}</p>
              <p>실제 마진율: {rate(selectedComparison.actualMarginRate)}</p>
              <p>보정 우선순위: {String(selectedComparison.calibrationPriority)}</p>
            </>
          ) : <p>아직 비교할 프로젝트가 없습니다.</p>}
        </section>
        <section className="drawer-block">
          <h3>공정별 보정</h3>
          <p>자재 초과: {selectedComparison ? money((selectedComparison.material as Record<string, unknown>)?.varianceAmount) : '0원'}</p>
          <p>노무 초과: {selectedComparison ? money((selectedComparison.labor as Record<string, unknown>)?.varianceAmount) : '0원'}</p>
          <p>외주 초과: {selectedComparison ? money((selectedComparison.subcontract as Record<string, unknown>)?.varianceAmount) : '0원'}</p>
        </section>
        <section className="drawer-block">
          <h3>AI 보정 추천</h3>
          <p>반복 누수와 마감 리포트 기준으로 자동 보정 룰을 생성합니다.</p>
          <p>승인된 룰만 Estimate Wizard, AI 견적 추천, PCE 리스크 버퍼에 반영됩니다.</p>
        </section>
      </div>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">COST LEAK</span>
            <h3>원가 누수 분석</h3>
          </div>
        </div>
        <div className="data-table">
          <div className="table-row table-head">
            <span>분류</span>
            <span>예상</span>
            <span>실제</span>
            <span>초과</span>
            <span>예방 룰</span>
          </div>
          {costLeaks.length ? costLeaks.map((leak) => (
            <div className="table-row" key={String(leak.id)}>
              <span>{String(leak.category_ko || leak.category)}</span>
              <span>{money(leak.expected_amount)}</span>
              <span>{money(leak.actual_amount)}</span>
              <span>{money(leak.variance_amount)}</span>
              <span>{String(leak.prevention_rule)}</span>
            </div>
          )) : <p>원가 누수 데이터가 없습니다.</p>}
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">APPROVAL</span>
            <h3>보정 승인</h3>
          </div>
        </div>
        <div className="today-action-list">
          {rules.length ? rules.map((rule) => (
            <div key={String(rule.id)} className={`action-row ${statusClass(rule.status)}`}>
              <span>{String(rule.status)}</span>
              <div>
                <strong>{String(rule.adjustment_type || rule.rule_type)}</strong>
                <p>{String(rule.reason)} / 보정값 {rate(rule.adjustment_value)}</p>
              </div>
              {rule.status === 'PENDING_APPROVAL' ? (
                <div className="approval-actions-strong">
                  <button className="approve-button" onClick={() => decide(String(rule.id), 'APPROVED')}>승인</button>
                  <button className="request-button" onClick={() => decide(String(rule.id), 'TESTING')}>테스트 적용</button>
                  <button className="reject-button" onClick={() => decide(String(rule.id), 'REJECTED')}>반려</button>
                </div>
              ) : <em>{String(rule.status)}</em>}
            </div>
          )) : <p className="small-note">승인 대기 보정 룰이 없습니다.</p>}
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">RISK PATTERN</span>
            <h3>반복 위험 패턴</h3>
          </div>
        </div>
        <div className="today-action-list">
          {patterns.length ? patterns.map((pattern) => (
            <div key={String(pattern.id)} className={pattern.severity === 'RED' ? 'action-row warning-row' : 'action-row'}>
              <span>{String(pattern.severity)}</span>
              <div>
                <strong>{String(pattern.pattern_key)}</strong>
                <p>{String(pattern.recommendation)}</p>
              </div>
              <em>{String(pattern.occurrence_count)}회</em>
            </div>
          )) : <p className="small-note">반복 위험 패턴이 없습니다.</p>}
        </div>
      </section>
    </section>
  );
}
