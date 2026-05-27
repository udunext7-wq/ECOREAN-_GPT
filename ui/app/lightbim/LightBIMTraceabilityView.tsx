import { useEffect, useState } from 'react';
import { getLightBIMTraceabilitySummary, updateLightBIMTraceabilityFromFeedback } from '../../services/lightbim-traceability-service/lightBIMTraceabilityService';

type Props = {
  estimateId?: string;
};

type TraceItem = {
  id: string;
  sourceEntityType: string;
  sourceEntityId: string;
  sourceEntityName: string;
  sourceQuantityKey: string;
  sourceQuantity: number;
  sourceUnit: string;
  estimateItemName?: string;
  estimateQuantity?: number;
  estimateUnit?: string;
  scheduleProcessName?: string;
  scheduleQuantity?: number;
  scheduleUnit?: string;
  purchaseItemName?: string;
  purchaseQuantity?: number;
  purchaseUnit?: string;
  receivedQuantity?: number;
  actualUsedQuantity?: number;
  varianceQuantity?: number;
  varianceRate?: number;
  feedbackStatus?: string;
  calibrationRuleId?: string;
  calibrationStatus?: string;
  traceStatus: string;
};

type SpaceTrace = {
  spaceId: string;
  spaceName: string;
  items: TraceItem[];
};

type TraceData = {
  items?: TraceItem[];
  spaces?: SpaceTrace[];
  summary?: Record<string, number>;
};

function quantity(value: unknown, unit = '') {
  return `${Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
}

function statusKo(status: string) {
  const labels: Record<string, string> = {
    LINKED: '완전 연결',
    PARTIAL: '부분 연결',
    MISSING: '연결 누락',
    REVIEW_REQUIRED: '검토 필요'
  };
  return labels[status] || status;
}

function sourceKo(type: string) {
  const labels: Record<string, string> = {
    SPACE: '공간',
    WALL: '벽체',
    OPENING: '개구부',
    PROJECT_QUANTITY: '프로젝트 수량',
    PROCESS_QUANTITY: '공정 수량',
    ESTIMATE_ITEM: '견적 항목'
  };
  return labels[type] || type;
}

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

export function LightBIMTraceabilityView({ estimateId = '' }: Props) {
  const [activeEstimateId, setActiveEstimateId] = useState(estimateId);
  const [data, setData] = useState<TraceData>({});
  const [selected, setSelected] = useState<TraceItem | null>(null);
  const [messageKo, setMessageKo] = useState('추적 데이터를 불러오는 중입니다.');
  const items = data.items || [];
  const summary = data.summary || {};
  const spaces = data.spaces || [];
  const kpis = [
    ['전체 추적 항목', summary.totalCount],
    ['완전 연결', summary.linkedCount],
    ['부분 연결', summary.partialCount],
    ['누락 연결', summary.missingCount],
    ['검토 필요', summary.reviewRequiredCount],
    ['차이 발생', summary.varianceCount]
  ];

  async function refresh(id = activeEstimateId) {
    try {
      const result = await getLightBIMTraceabilitySummary(id ? { estimateId: id } : {});
      setData(result as TraceData);
      setSelected((result as TraceData).items?.[0] || null);
      setMessageKo((result as TraceData).items?.length ? '추적 연결 정보가 최신화되었습니다.' : '연결된 견적 항목이 없습니다.');
    } catch (error) {
      console.error('[LightBIM Traceability] load failed', error);
      setMessageKo('추적 데이터를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh(estimateId);
  }, [estimateId]);

  async function syncFeedback() {
    await updateLightBIMTraceabilityFromFeedback(activeEstimateId ? { estimateId: activeEstimateId } : {});
    await refresh();
  }

  return (
    <section className="drawer-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">LIGHTBIM AUDIT CHAIN</span>
            <h2>LightBIM 추적 보기</h2>
            <p>도면 수량이 견적, 공정표, 발주, 입고, 실제 사용과 보정 후보로 연결되는 흐름을 확인합니다.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            견적 ID
            <input value={activeEstimateId} onChange={(event) => setActiveEstimateId(event.target.value)} placeholder="전체 조회 또는 견적 ID 입력" />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => refresh()}>조회</button>
          <button onClick={syncFeedback}>실제 사용 연결 새로고침</button>
          <button onClick={() => navigate('lightbimSpaceMap')}>공간 맵</button>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="internal-kpi-grid">
        {kpis.map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{quantity(value)}건</strong>
          </div>
        ))}
      </div>

      <section className="drawer-block">
        <h3>수량 출처 / 견적 연결 / 공정표 연결 / 발주 연결 / 입고 연결 / 실제 사용량</h3>
        <div className="table-scroll">
          <table className="data-table traceability-table">
            <thead>
              <tr>
                <th>출처</th>
                <th>수량 키</th>
                <th>도면 수량</th>
                <th>견적 항목</th>
                <th>공정</th>
                <th>발주 품목</th>
                <th>입고 수량</th>
                <th>실제 사용량</th>
                <th>차이율</th>
                <th>상태</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{sourceKo(item.sourceEntityType)} / {item.sourceEntityName}</td>
                  <td>{item.sourceQuantityKey}</td>
                  <td>{quantity(item.sourceQuantity, item.sourceUnit)}</td>
                  <td>{item.estimateItemName || '연결된 견적 항목이 없습니다.'}</td>
                  <td>{item.scheduleProcessName || '-'}</td>
                  <td>{item.purchaseItemName || '아직 발주 항목이 연결되지 않았습니다.'}</td>
                  <td>{quantity(item.receivedQuantity, item.purchaseUnit || item.sourceUnit)}</td>
                  <td>{quantity(item.actualUsedQuantity, item.purchaseUnit || item.sourceUnit)}</td>
                  <td>{(Number(item.varianceRate || 0) * 100).toFixed(1)}%</td>
                  <td>{statusKo(item.traceStatus)}</td>
                  <td><button onClick={() => setSelected(item)}>상세</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length ? <p className="empty-state">일부 연결 정보가 누락되었거나 아직 생성된 추적 데이터가 없습니다.</p> : null}
      </section>

      <section className="drawer-block">
        <h3>공간별 추적</h3>
        {spaces.length ? spaces.map((space) => (
          <div className="estimate-save-bar" key={space.spaceId}>
            <div>
              <strong>{space.spaceName}</strong>
              {space.items.map((item) => (
                <span key={item.id}>{item.estimateItemName || item.sourceQuantityKey} / 도면 {quantity(item.sourceQuantity, item.sourceUnit)} / 발주 {quantity(item.purchaseQuantity, item.purchaseUnit)} / 차이 {(Number(item.varianceRate || 0) * 100).toFixed(1)}%</span>
              ))}
            </div>
          </div>
        )) : <p className="empty-state">공간 기준으로 연결된 수량이 없습니다.</p>}
      </section>

      <section className="drawer-block">
        <h3>차이 분석 / 보정 후보</h3>
        {selected ? (
          <div className="estimate-save-bar">
            <div>
              <strong>{selected.sourceEntityName} - {selected.estimateItemName || selected.sourceQuantityKey}</strong>
              <span>도면 수량 {quantity(selected.sourceQuantity, selected.sourceUnit)} / 견적 수량 {quantity(selected.estimateQuantity, selected.estimateUnit)}</span>
              <span>발주 수량 {quantity(selected.purchaseQuantity, selected.purchaseUnit)} / 입고 수량 {quantity(selected.receivedQuantity, selected.purchaseUnit)}</span>
              <span>실제 사용 수량 {quantity(selected.actualUsedQuantity, selected.purchaseUnit)} / 차이율 {(Number(selected.varianceRate || 0) * 100).toFixed(1)}%</span>
              <span>보정 연결 {selected.calibrationRuleId ? `${selected.calibrationRuleId} (${selected.calibrationStatus || '승인 대기'})` : '등록된 보정 후보가 없습니다.'}</span>
            </div>
            <div className="button-row">
              <button onClick={() => navigate('fullRemodelingEstimate')}>견적 항목 열기</button>
              <button onClick={() => navigate('constructionSchedule')}>공정표 열기</button>
              <button onClick={() => navigate('purchaseOrders')}>발주서 열기</button>
              <button onClick={() => navigate('executionManagement')}>입고 기록 열기</button>
              <button onClick={() => navigate('lightbimExecutionFeedback')}>실행 피드백 열기</button>
              <button onClick={() => navigate('calibration')}>보정 룰 열기</button>
            </div>
          </div>
        ) : <p className="empty-state">실제 사용량 피드백이 없습니다.</p>}
      </section>
    </section>
  );
}
