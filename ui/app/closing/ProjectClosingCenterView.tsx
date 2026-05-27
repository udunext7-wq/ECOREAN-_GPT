import { useEffect, useMemo, useState } from 'react';
import {
  createClosingSnapshot,
  finalizeClosing,
  loadProjectClosingCenterData,
  saveHighMarginTemplate,
  type ProjectClosingData
} from '../../services/closing-service/projectClosingService';

function money(value: unknown) {
  const number = Number(value || 0);
  return number === 0 ? '0원' : `${number.toLocaleString('ko-KR')}원`;
}

function rate(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function statusClass(status: unknown) {
  const value = String(status || '');
  if (value.startsWith('BLOCKED') || value === 'CLOSED_LOSS') return 'danger';
  if (value === 'CLOSED_REVIEW_REQUIRED') return 'warning';
  if (value === 'CLOSED_PROFIT') return 'success';
  return 'neutral';
}

export function ProjectClosingCenterView() {
  const [data, setData] = useState<ProjectClosingData | null>(null);
  const [projectId, setProjectId] = useState('');
  const [messageKo, setMessageKo] = useState('프로젝트 마감 데이터를 불러오는 중입니다.');
  const selectedSnapshot = useMemo(() => {
    if (!data?.snapshots?.length) return null;
    return data.snapshots.find((item) => item.project_id === projectId) || data.snapshots[0];
  }, [data, projectId]);

  async function refresh(nextProjectId = projectId) {
    const next = await loadProjectClosingCenterData(nextProjectId || undefined);
    setData(next);
    const firstProjectId = String(next.snapshots?.[0]?.project_id || nextProjectId || '');
    if (!projectId && firstProjectId) setProjectId(firstProjectId);
    setMessageKo('프로젝트 마감 센터가 최신화되었습니다.');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function runSnapshot() {
    if (!projectId) {
      setMessageKo('마감 스냅샷을 생성할 프로젝트 ID를 입력하세요.');
      return;
    }
    await createClosingSnapshot(projectId);
    setMessageKo('마감 스냅샷과 원가 누수 분석이 생성되었습니다.');
    await refresh(projectId);
  }

  async function runFinalize(override = false) {
    if (!projectId) return;
    try {
      await finalizeClosing(projectId, override);
      setMessageKo(override ? '관리자 예외로 마감 확정되었습니다.' : '프로젝트 마감이 확정되었습니다.');
      await refresh(projectId);
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '마감 확정이 차단되었습니다.');
    }
  }

  async function runTemplateSave() {
    if (!projectId) return;
    const result = await saveHighMarginTemplate(projectId);
    setMessageKo(String(result.reasonKo || '고마진 템플릿 저장 조건을 검토했습니다.'));
    await refresh(projectId);
  }

  function openCalibrationCenter() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'calibration' }));
  }

  function openExecutionFeedback() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimExecutionFeedback' }));
  }

  if (!data) return <div className="drawer-block">Project Closing Center 로딩 중</div>;

  const labels = data.statusLabelsKo || {};
  const leaks = data.costLeaks || [];
  const rules = data.calibrationRules || [];
  const reports = data.reports || [];
  const feedback = data.executionFeedbackSummary?.summary || {};

  return (
    <div className="execution-panel">
      <div className="section-header">
        <div>
          <span className="eyebrow">PROFIT CLOSING</span>
          <h2>프로젝트 마감</h2>
          <p>완료 프로젝트의 실제 입금, 실제 원가, 최종 마진, 원가 누수, 다음 견적 보정까지 한 번에 확정합니다.</p>
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
          <button className="primary-action" onClick={runSnapshot}>마감 스냅샷 생성</button>
          <button onClick={() => runFinalize(false)}>마감 확정</button>
          <button onClick={() => runFinalize(true)}>관리자 예외 마감</button>
          <button onClick={runTemplateSave}>고마진 템플릿 저장</button>
          <button onClick={openCalibrationCenter}>실제 보정 센터</button>
          <button onClick={openExecutionFeedback}>LightBIM 실행 피드백</button>
        </div>
        <p>{messageKo}</p>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span>최종 마진율</span>
          <strong>{selectedSnapshot ? rate(selectedSnapshot.actual_margin_rate) : '데이터 없음'}</strong>
          <small>예상 {selectedSnapshot ? rate(selectedSnapshot.expected_margin_rate) : '-'}</small>
        </div>
        <div className="kpi-card">
          <span>최종 마진</span>
          <strong>{selectedSnapshot ? money(selectedSnapshot.actual_margin) : '데이터 없음'}</strong>
          <small>마진 차이 {selectedSnapshot ? money(selectedSnapshot.margin_variance) : '-'}</small>
        </div>
        <div className="kpi-card">
          <span>미수 / 미지급</span>
          <strong>{selectedSnapshot ? `${money(selectedSnapshot.unpaid_receivable)} / ${money(selectedSnapshot.unpaid_payable)}` : '데이터 없음'}</strong>
          <small>입금/지급 완료 확인</small>
        </div>
        <div className={`kpi-card ${statusClass(selectedSnapshot?.closing_status)}`}>
          <span>최종 판정</span>
          <strong>{selectedSnapshot ? labels[String(selectedSnapshot.closing_status)] || String(selectedSnapshot.closing_status) : '데이터 없음'}</strong>
          <small>차단 조건 없을 때만 마감 가능</small>
        </div>
      </div>

      <div className="dashboard-grid three">
        <section className="drawer-block">
          <h3>예상 vs 실제 수익</h3>
          <p>계약금액: {selectedSnapshot ? money(selectedSnapshot.estimated_revenue) : '데이터 없음'}</p>
          <p>실제 입금액: {selectedSnapshot ? money(selectedSnapshot.actual_received_revenue) : '데이터 없음'}</p>
          <p>추가공사 수익: {selectedSnapshot ? money(selectedSnapshot.change_order_revenue) : '데이터 없음'}</p>
        </section>
        <section className="drawer-block">
          <h3>예상 vs 실제 원가</h3>
          <p>예상 원가: {selectedSnapshot ? money(selectedSnapshot.estimated_cost) : '데이터 없음'}</p>
          <p>실제 원가: {selectedSnapshot ? money(selectedSnapshot.actual_cost) : '데이터 없음'}</p>
          <p>하자비용 반영: {selectedSnapshot ? money(selectedSnapshot.defect_cost) : '데이터 없음'}</p>
        </section>
        <section className="drawer-block">
          <h3>공기 / 현금흐름</h3>
          <p>공기 차이: {selectedSnapshot ? `${selectedSnapshot.schedule_variance_days}일` : '데이터 없음'}</p>
          <p>시작: {String(selectedSnapshot?.actual_start_date || '데이터 없음')}</p>
          <p>종료: {String(selectedSnapshot?.actual_end_date || '데이터 없음')}</p>
        </section>
      </div>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">QUANTITY FEEDBACK</span>
            <h3>도면 수량 대비 실제 사용량 차이</h3>
          </div>
          <button onClick={openExecutionFeedback}>상세 검토</button>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card"><span>검토 수량</span><strong>{String(feedback.totalCount || 0)}건</strong></div>
          <div className="kpi-card"><span>과다 사용</span><strong>{String(feedback.overUsedCount || 0)}건</strong></div>
          <div className="kpi-card"><span>입고 부족</span><strong>{String(feedback.shortageCount || 0)}건</strong></div>
          <div className="kpi-card"><span>손실/잔량 높음</span><strong>{String(feedback.wasteHighCount || 0)}건</strong></div>
        </div>
        <p>다음 견적 보정 후보와 다음 발주 보정 후보는 승인 후 반영됩니다.</p>
      </section>

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
            <span>예방 조치</span>
          </div>
          {leaks.length ? leaks.map((leak) => (
            <div className="table-row" key={String(leak.leak_id)}>
              <span>{String(leak.category)}</span>
              <span>{money(leak.estimated_amount)}</span>
              <span>{money(leak.actual_amount)}</span>
              <span>{money(leak.variance_amount)}</span>
              <span>{String(leak.recommended_prevention)}</span>
            </div>
          )) : <p>원가 누수 데이터 없음</p>}
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">CALIBRATION</span>
            <h3>다음 견적 보정</h3>
          </div>
          <button onClick={runSnapshot}>보정 룰 생성</button>
        </div>
        <div className="data-table">
          <div className="table-row table-head">
            <span>대상</span>
            <span>룰 타입</span>
            <span>보정값</span>
            <span>상태</span>
            <span>사유</span>
          </div>
          {rules.length ? rules.map((rule) => (
            <div className="table-row" key={String(rule.id)}>
              <span>{String(rule.source_category)}</span>
              <span>{String(rule.rule_type)}</span>
              <span>{String(rule.adjustment_value)}</span>
              <span>{String(rule.status)}</span>
              <span>{String(rule.reason)}</span>
            </div>
          )) : <p>보정 룰 데이터 없음</p>}
        </div>
      </section>

      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">REPORT</span>
            <h3>마감 리포트</h3>
          </div>
          <div className="button-row">
            <button>PDF 출력 준비</button>
            <button>Excel 출력 준비</button>
          </div>
        </div>
        <p>PDF/Excel은 저장된 마감 리포트 payload를 기준으로 출력 준비 상태를 관리합니다.</p>
        <p>리포트 수: {reports.length} / 고마진 템플릿 후보: {String(data.summary.highMarginTemplateCandidateCount || 0)}건</p>
      </section>
    </div>
  );
}
