import { useEffect, useMemo, useState } from 'react';
import { getLightBIMSpaceMapData, getLightBIMSpaceMapDataByEstimate } from '../../services/lightbim-space-map-service/lightBIMSpaceMapService';
import { getSpaceRiskColor, normalizeMapGeometry, scaleToViewBox, type NormalizedMapSpace } from './lightBimMapUtils';

type Props = {
  estimateId?: string;
};

type TraceItem = {
  id: string;
  sourceQuantityKey: string;
  sourceQuantity: number;
  sourceUnit: string;
  estimateItemName: string;
  scheduleProcessName: string;
  purchaseOrderItemId?: string;
  purchaseItemName: string;
  purchaseQuantity: number;
  receivedQuantity: number;
  actualUsedQuantity: number;
  varianceRate: number;
  traceStatus: string;
};

type SpaceTraceSummary = {
  spaceId: string;
  spaceName: string;
  spaceType: string;
  areaM2: number;
  perimeterM: number;
  traceStatus: string;
  traces: TraceItem[];
  warnings: Array<Record<string, unknown>>;
};

type SpaceMapData = {
  importId?: string;
  estimateId?: string;
  project?: Record<string, unknown> | null;
  traceSummaries?: SpaceTraceSummary[];
  warnings?: Array<Record<string, unknown>>;
  statusKo?: string;
};

function value(number: unknown, unit = '') {
  return `${Number(number || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
}

function statusKo(status: string) {
  const labels: Record<string, string> = {
    LINKED: '정상',
    PARTIAL: '일부 연결',
    MISSING: '연결 누락',
    REVIEW_REQUIRED: '검토 필요'
  };
  return labels[status] || '일부 연결';
}

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

export function LightBIMSpaceMapView({ estimateId = '' }: Props) {
  const [activeEstimateId, setActiveEstimateId] = useState(estimateId);
  const [data, setData] = useState<SpaceMapData>({});
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const [messageKo, setMessageKo] = useState('도면 정보를 불러오는 중입니다.');
  const geometry = useMemo(() => normalizeMapGeometry(data.project), [data.project]);
  const summaries = data.traceSummaries || [];
  const summaryById = useMemo(() => new Map(summaries.map((summary) => [summary.spaceId, summary])), [summaries]);
  const selectedGeometry = geometry.spaces.find((space) => space.id === selectedSpaceId) || geometry.spaces[0] || null;
  const selectedSummary = selectedGeometry ? summaryById.get(selectedGeometry.id) : undefined;
  const selectedTraces = selectedSummary?.traces || [];
  const kpis = [
    ['전체 공간', summaries.length || geometry.spaces.length],
    ['정상', summaries.filter((summary) => summary.traceStatus === 'LINKED').length],
    ['일부 연결', summaries.filter((summary) => summary.traceStatus === 'PARTIAL').length],
    ['연결 누락', summaries.filter((summary) => summary.traceStatus === 'MISSING').length],
    ['검토 필요', summaries.filter((summary) => summary.traceStatus === 'REVIEW_REQUIRED').length]
  ];

  async function refresh(id = activeEstimateId) {
    try {
      const next = id
        ? await getLightBIMSpaceMapDataByEstimate({ estimateId: id })
        : await getLightBIMSpaceMapData();
      setData(next as SpaceMapData);
      const firstSpaceId = String((next as SpaceMapData).traceSummaries?.[0]?.spaceId || ((next as SpaceMapData).project?.spaces as Array<{ id?: string }> | undefined)?.[0]?.id || '');
      setSelectedSpaceId((current) => current || firstSpaceId);
      setMessageKo(String((next as SpaceMapData).statusKo || '도면 공간 정보를 불러왔습니다.'));
    } catch (error) {
      console.error('[LightBIM Space Map] load failed', error);
      setMessageKo('도면 정보를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh(estimateId);
  }, [estimateId]);

  function selectSpace(space: NormalizedMapSpace) {
    setSelectedSpaceId(space.id);
  }

  return (
    <section className="drawer-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">LIGHTBIM READ-ONLY MAP</span>
            <h2>LightBIM 공간 맵</h2>
            <p>도면의 공간을 선택하여 견적, 공정, 발주, 입고와 현장 사용량 연결을 확인합니다.</p>
          </div>
        </div>
        <div className="form-grid">
          <label>
            견적 ID
            <input value={activeEstimateId} onChange={(event) => setActiveEstimateId(event.target.value)} placeholder="최근 도면 또는 견적 ID 조회" />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => refresh()}>도면 불러오기</button>
          <button onClick={() => navigate('lightbimTraceability')}>추적 상세 보기</button>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="internal-kpi-grid space-map-kpis">
        {kpis.map(([label, count]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{value(count)}건</strong>
          </div>
        ))}
      </div>

      <section className="drawer-block">
        <div className="space-map-legend">
          {['LINKED', 'PARTIAL', 'MISSING', 'REVIEW_REQUIRED'].map((status) => (
            <span key={status} className={`space-map-chip ${getSpaceRiskColor(status)}`}>{statusKo(status)}</span>
          ))}
        </div>
        <div className="space-map-layout">
          <div className="space-map-canvas">
            <h3>도면 미리보기</h3>
            {geometry.spaces.length ? (
              <svg className="space-map-svg" viewBox={`${geometry.viewBox.x} ${geometry.viewBox.y} ${geometry.viewBox.width} ${geometry.viewBox.height}`} aria-label="LightBIM 공간 도면">
                {geometry.spaces.map((space) => {
                  const status = summaryById.get(space.id)?.traceStatus || 'PARTIAL';
                  return (
                    <g key={space.id} onClick={() => selectSpace(space)} className="space-map-space" role="button" aria-label={`${space.name} 선택`}>
                      <polygon
                        className={`space-map-polygon ${getSpaceRiskColor(status)}${space.id === selectedGeometry?.id ? ' selected' : ''}`}
                        points={scaleToViewBox(space.points)}
                      />
                      <text x={space.center.x} y={space.center.y} className="space-map-label">
                        <tspan x={space.center.x}>{space.name}</tspan>
                        <tspan x={space.center.x} dy="180">{value(space.areaM2, '㎡')}</tspan>
                      </text>
                    </g>
                  );
                })}
                {geometry.walls.map((wall) => (
                  <line key={wall.id} className="space-map-wall" x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} />
                ))}
                {geometry.openings.map((opening) => (
                  <circle key={opening.id} className={`space-map-opening ${opening.type.toLowerCase()}`} cx={opening.point.x} cy={opening.point.y} r="85" />
                ))}
              </svg>
            ) : <p className="empty-state">표시할 도면 공간 정보가 없습니다.</p>}
          </div>

          <div className="space-map-side">
            <h3>공간 목록</h3>
            <div className="space-map-list">
              {geometry.spaces.map((space) => {
                const status = summaryById.get(space.id)?.traceStatus || 'PARTIAL';
                return (
                  <button key={space.id} className={space.id === selectedGeometry?.id ? 'selected' : ''} onClick={() => selectSpace(space)}>
                    <span>{space.name}</span>
                    <em className={`space-map-chip ${getSpaceRiskColor(status)}`}>{statusKo(status)}</em>
                  </button>
                );
              })}
            </div>
            {!geometry.spaces.length ? <p className="empty-state">표시할 공간 정보가 없습니다.</p> : null}
          </div>
        </div>
      </section>

      <section className="drawer-block">
        <h3>선택 공간</h3>
        {selectedGeometry ? (
          <>
            <div className="document-info-grid">
              <div><span>공간명</span><strong>{selectedGeometry.name}</strong></div>
              <div><span>공간 유형</span><strong>{selectedGeometry.type}</strong></div>
              <div><span>면적</span><strong>{value(selectedGeometry.areaM2, '㎡')}</strong></div>
              <div><span>둘레</span><strong>{value(selectedGeometry.perimeterM, 'm')}</strong></div>
            </div>
            <div className="button-row">
              <button onClick={() => navigate('lightbimTraceability')}>추적 상세 보기</button>
              <button onClick={() => navigate('lightbimQuantityReview')}>수량 검토 열기</button>
              <button onClick={() => navigate('lightbimExecutionFeedback')}>실행 피드백 열기</button>
              <button onClick={() => navigate('fullRemodelingEstimate')}>견적 항목 보기</button>
            </div>
          </>
        ) : <p className="empty-state">선택한 공간의 추적 데이터가 없습니다.</p>}
      </section>

      <section className="drawer-block">
        <h3>연결 견적 / 연결 공정 / 연결 발주 / 입고 / 사용량 / 수량 차이</h3>
        <div className="table-scroll space-map-trace-scroll">
          <table className="data-table space-map-trace-table">
            <thead>
              <tr>
                <th>수량</th>
                <th>견적 항목</th>
                <th>공정</th>
                <th>발주</th>
                <th>입고 수량</th>
                <th>실제 사용량</th>
                <th>차이율</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {selectedTraces.map((trace) => (
                <tr key={trace.id}>
                  <td>{value(trace.sourceQuantity, trace.sourceUnit)}</td>
                  <td>{trace.estimateItemName || '-'}</td>
                  <td>{trace.scheduleProcessName || '-'}</td>
                  <td>{trace.purchaseItemName || '-'}</td>
                  <td>{value(trace.receivedQuantity, trace.sourceUnit)}</td>
                  <td>{value(trace.actualUsedQuantity, trace.sourceUnit)}</td>
                  <td>{(Number(trace.varianceRate || 0) * 100).toFixed(1)}%</td>
                  <td>{statusKo(trace.traceStatus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!selectedTraces.length ? <p className="empty-state">선택한 공간의 추적 데이터가 없습니다.</p> : null}
      </section>

      <section className="drawer-block">
        <h3>경고</h3>
        {[...geometry.warnings, ...(selectedSummary?.warnings || []).map((warning) => String(warning.message || '공간 수량을 검토하세요.'))].length
          ? [...geometry.warnings, ...(selectedSummary?.warnings || []).map((warning) => String(warning.message || '공간 수량을 검토하세요.'))].map((warning) => <p key={warning}>{warning}</p>)
          : <p className="empty-state">선택 공간에 등록된 경고가 없습니다.</p>}
      </section>
    </section>
  );
}
