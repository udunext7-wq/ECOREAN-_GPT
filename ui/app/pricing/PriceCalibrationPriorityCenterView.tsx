import { useEffect, useMemo, useState } from 'react';
import {
  createCalibrationTaskFromImpact,
  createPriceCalibrationPriorityReport,
  formatRate,
  formatWon,
  getPriceCalibrationPrioritySummary,
  linkCalibrationTaskToPriceQueue,
  markCalibrationTaskReviewed,
  type PriceCalibrationPriorityData
} from '../../services/pricing-service/priceCalibrationPriorityService';

const estimateTypes = [
  { value: 'ALL', label: '전체' },
  { value: 'BATHROOM', label: '욕실' },
  { value: 'KITCHEN', label: '주방' },
  { value: 'FULL_REMODELING', label: '전체 리모델링' }
];

const riskLevels = [
  { value: 'ALL', label: '전체' },
  { value: 'BLOCKING', label: 'BLOCKING' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'LOW', label: 'LOW' }
];

const readinessStatuses = [
  { value: 'ALL', label: '전체' },
  { value: 'NEEDS_UPDATE', label: 'NEEDS_UPDATE' },
  { value: 'PARTIAL', label: 'PARTIAL' },
  { value: 'READY', label: 'READY' }
];

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

function riskClass(risk: unknown) {
  const value = String(risk || '');
  if (value === 'BLOCKING' || value === 'HIGH') return 'red';
  if (value === 'MEDIUM') return 'yellow';
  return 'green';
}

export function PriceCalibrationPriorityCenterView() {
  const [data, setData] = useState<PriceCalibrationPriorityData | null>(null);
  const [estimateType, setEstimateType] = useState('ALL');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [priceStatus, setPriceStatus] = useState('ALL');
  const [queueId, setQueueId] = useState('');
  const [messageKo, setMessageKo] = useState('');

  async function refresh() {
    setData(await getPriceCalibrationPrioritySummary());
  }

  useEffect(() => {
    refresh();
  }, []);

  const filteredItems = useMemo(() => {
    const rows = data?.priorityItems || [];
    return rows.filter((item) => {
      const estimateMatch = estimateType === 'ALL' || String(item.estimate_type) === estimateType;
      const riskMatch = riskLevel === 'ALL' || String(item.risk_level) === riskLevel;
      const statusMatch = priceStatus === 'ALL' || String(item.price_status) === priceStatus;
      return estimateMatch && riskMatch && statusMatch;
    });
  }, [data, estimateType, riskLevel, priceStatus]);

  const filteredImpacts = useMemo(() => {
    const rows = data?.impacts || [];
    return rows.filter((item) => estimateType === 'ALL' || String(item.estimate_type) === estimateType);
  }, [data, estimateType]);

  async function createTask(item?: Record<string, unknown>) {
    const source = item || filteredItems[0];
    if (!source) {
      setMessageKo('생성할 우선순위 항목이 없습니다.');
      return;
    }
    const result = await createCalibrationTaskFromImpact({
      estimateType: source.estimate_type,
      priceReadinessStatus: source.price_status,
      itemName: source.item_name,
      itemId: source.item_id,
      currentPrice: source.current_price,
      suggestedPrice: source.suggested_price,
      note: 'RC-0.3.6 단가 보정 우선순위에서 생성'
    });
    setMessageKo(`보정 작업 생성: ${String(result?.taskId || '-')}`);
    await refresh();
  }

  async function reviewTask(item?: Record<string, unknown>) {
    const taskEstimateType = String(item?.estimate_type || (estimateType === 'ALL' ? 'FULL_REMODELING' : estimateType));
    const result = await createCalibrationTaskFromImpact({
      estimateType: taskEstimateType,
      priceReadinessStatus: item?.price_status || 'PARTIAL',
      itemName: item?.item_name || '단가 보정 우선순위 항목',
      currentPrice: item?.current_price || 0
    });
    const taskId = String(result?.taskId || '');
    if (taskId) {
      await markCalibrationTaskReviewed(taskId, { reviewedBy: 'CEO', note: '우선순위 검토 완료' });
      setMessageKo('검토 완료 처리되었습니다.');
      await refresh();
    }
  }

  async function linkQueue(item?: Record<string, unknown>) {
    if (!queueId.trim()) {
      setMessageKo('연결할 Queue ID를 입력하세요.');
      return;
    }
    const result = await createCalibrationTaskFromImpact({
      estimateType: item?.estimate_type || 'FULL_REMODELING',
      priceReadinessStatus: item?.price_status || 'PARTIAL',
      itemName: item?.item_name || '단가 보정 Queue 연결 항목',
      currentPrice: item?.current_price || 0
    });
    const taskId = String(result?.taskId || '');
    if (taskId) {
      await linkCalibrationTaskToPriceQueue(taskId, queueId.trim());
      setMessageKo(`보정 작업이 Queue ${queueId.trim()}에 연결되었습니다.`);
      setQueueId('');
      await refresh();
    }
  }

  async function createReport() {
    const result = await createPriceCalibrationPriorityReport(data || {});
    setMessageKo(`우선순위 리포트 생성: ${String(result?.reportPath || '-')}`);
  }

  if (!data) return <div className="drawer-block">단가 보정 우선순위 로딩 중...</div>;

  const summary = data.summary || {};

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">PRICE CALIBRATION PRIORITY</span>
          <h2>단가 보정 우선순위 센터</h2>
          <p>단가 준비 상태 리스크를 실제 단가 보정 작업으로 연결합니다. 마스터 단가는 승인/백업/반영 흐름 전에는 변경하지 않습니다.</p>
        </div>
        <strong className={Number(summary.immediateCalibrationCount || 0) > 0 ? 'red-kpi' : 'green-kpi'}>
          즉시 보정 {String(summary.immediateCalibrationCount || 0)}건
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>운영 원칙</strong>
        <p>이 화면은 우선순위를 정하고 보정 작업을 연결하는 내부 화면입니다. 승인 없이 마스터 단가를 직접 변경하지 않으며 고객용 출력에는 리스크, 마진, 내부 단가를 노출하지 않습니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>즉시 보정 필요</span><strong>{String(summary.immediateCalibrationCount || 0)}건</strong></div>
        <div><span>견적 전 보정 권장</span><strong>{String(summary.preEstimateCalibrationCount || 0)}건</strong></div>
        <div><span>대표 검토 필요</span><strong>{String(summary.ceoReviewCount || 0)}건</strong></div>
        <div><span>확인 완료</span><strong>{String(summary.readyCheckCount || 0)}건</strong></div>
        <div><span>대기 task</span><strong>{String(summary.pendingTaskCount || 0)}건</strong></div>
        <div><span>고객 안전성</span><strong>{String(summary.customerSafety || 'PASSED')}</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">FILTER</span>
            <h3>견적 유형 / 리스크 / 상태 필터</h3>
          </div>
          <button onClick={() => void refresh()}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>견적 유형
            <select value={estimateType} onChange={(event) => setEstimateType(event.target.value)}>
              {estimateTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>리스크
            <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
              {riskLevels.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>단가 준비 상태
            <select value={priceStatus} onChange={(event) => setPriceStatus(event.target.value)}>
              {readinessStatuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>연결 Queue ID
            <input value={queueId} onChange={(event) => setQueueId(event.target.value)} placeholder="RPUQ-..." />
          </label>
        </div>
        <div className="button-row">
          <button className="command command-approve" onClick={() => void createTask()}>보정 작업 생성</button>
          <button onClick={() => void createReport()}>리포트 생성</button>
          <button onClick={() => navigate('priceWorkbookImport')}>단가표 가져오기</button>
          <button onClick={() => navigate('realPriceCalibration')}>실제 단가 보정</button>
          <button onClick={() => navigate('realPriceWorkbench')}>실제 단가 보정 워크벤치</button>
          <button onClick={() => navigate('unmatchedPriceRecommendation')}>단가 미매칭 추천</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">IMPACT</span>
            <h3>견적 유형별 단가 준비 영향</h3>
          </div>
        </div>
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>견적 유형</th>
                <th>상태</th>
                <th>Risk</th>
                <th>추천 조치</th>
                <th>HIGH NEEDS_UPDATE</th>
                <th>Fallback</th>
                <th>Confirmed</th>
                <th>Margin</th>
                <th>PCE</th>
                <th>대표 승인</th>
              </tr>
            </thead>
            <tbody>
              {filteredImpacts.map((item) => (
                <tr key={`${String(item.estimate_type)}-${String(item.price_readiness_status)}`}>
                  <td>{String(item.estimate_type)}</td>
                  <td>{String(item.price_readiness_status)}</td>
                  <td>{String(item.risk_level)}</td>
                  <td>{String(item.recommended_action)}</td>
                  <td>{String(item.high_priority_needs_update_count || 0)}</td>
                  <td>{String(item.fallback_line_item_count || 0)}</td>
                  <td>{String(item.confirmed_line_item_count || 0)}</td>
                  <td>{formatWon(item.margin_amount)} / {formatRate(item.margin_rate)}</td>
                  <td>{String(item.pce_decision)}</td>
                  <td>{item.ceo_action_required ? '필요' : '불필요'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PRIORITY</span>
            <h3>보정 우선순위 목록</h3>
          </div>
        </div>
        {filteredItems.length === 0 ? <p>조건에 맞는 보정 우선순위 항목이 없습니다.</p> : null}
        <div className="cost-leak-list">
          {filteredItems.slice(0, 36).map((item, index) => (
            <article key={`${String(item.estimate_type)}-${String(item.price_status)}-${String(item.item_id)}-${index}`} className={`cost-leak ${riskClass(item.risk_level)}`}>
              <strong>{String(item.item_name)}</strong>
              <p>
                {String(item.estimate_type)} / {String(item.price_status)} / {String(item.priority_label_ko)}
              </p>
              <p>
                현재 {formatWon(item.current_price)} / Fallback {String(item.fallback_line_item_count || 0)} / Confirmed {String(item.confirmed_line_item_count || 0)}
              </p>
              <em>{String(item.risk_level)} / {String(item.recommended_action)}</em>
              <div className="button-row">
                <button onClick={() => void reviewTask(item)}>검토 완료</button>
                <button onClick={() => void linkQueue(item)}>보정 대기열로 연결</button>
                <button onClick={() => setMessageKo('보류 처리되었습니다. 실제 단가 반영은 수행하지 않았습니다.')}>보류 처리</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
