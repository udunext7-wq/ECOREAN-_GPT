import { useEffect, useMemo, useState } from 'react';
import { getLightBIMCustomerProposalMapByEstimate, getLightBIMCustomerProposalMapByProject, getLightBIMCustomerProposalMapData } from '../../services/lightbim-customer-map-service/lightBIMCustomerMapService';
import { emptyCustomerProposalMapData, type CustomerProposalMapData } from './customerSafeMapFilter';
import { normalizeMapGeometry, scaleToViewBox } from './lightBimMapUtils';

type Props = {
  estimateId?: string;
  projectId?: string;
};

function displayArea(value: number) {
  return `${Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}㎡`;
}

function publicStatusClass(status: string) {
  if (status === '완료') return 'complete';
  if (status === '공사 중' || status === '검수 중') return 'active';
  if (status === '보완 예정') return 'supplement';
  return 'planned';
}

export function LightBIMCustomerProposalMapView({ estimateId = '', projectId = '' }: Props) {
  const [activeId, setActiveId] = useState(projectId || estimateId);
  const [data, setData] = useState<CustomerProposalMapData>(emptyCustomerProposalMapData());
  const [selectedSpaceId, setSelectedSpaceId] = useState('');
  const geometryProject = useMemo(() => ({
    ...data.geometry,
    spaces: data.spaces.map((space) => ({
      id: space.id,
      name: space.name,
      type: space.type,
      vertexIds: space.vertexIds,
      area_m2: space.areaM2,
      perimeter_m: 0
    }))
  }), [data]);
  const geometry = useMemo(() => normalizeMapGeometry(geometryProject), [geometryProject]);
  const selected = data.spaces.find((space) => space.id === selectedSpaceId) || data.spaces[0];

  async function refresh(id = activeId) {
    try {
      const result = projectId
        ? await getLightBIMCustomerProposalMapByProject({ projectId: id || projectId })
        : estimateId
          ? await getLightBIMCustomerProposalMapByEstimate({ estimateId: id || estimateId })
          : id
            ? await getLightBIMCustomerProposalMapByProject({ projectId: id })
            : await getLightBIMCustomerProposalMapData();
      setData(result);
      setSelectedSpaceId((current) => current || result.spaces[0]?.id || '');
    } catch (error) {
      console.error('[Customer Proposal Map] load failed', error);
      setData(emptyCustomerProposalMapData('고객용 공간 맵을 불러오지 못했습니다.'));
    }
  }

  useEffect(() => {
    void refresh(projectId || estimateId);
  }, [projectId, estimateId]);

  const hasDesign = Boolean(data.designDirection.style || data.designDirection.colorTone || data.designDirection.primaryMaterials || data.designDirection.lightingMood);

  return (
    <section className="customer-proposal-map">
      <section className="estimate-preview-card customer-map-hero">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">LIGHTBIM PROPOSAL MAP</span>
            <h2>고객용 공간 제안 맵</h2>
            <p>공간 구성과 공사 범위, 디자인 방향을 한눈에 확인하실 수 있습니다.</p>
          </div>
          <strong className={`customer-map-status ${publicStatusClass(data.publicScheduleStatus.statusKo)}`}>{data.publicScheduleStatus.statusKo}</strong>
        </div>
        <div className="form-grid">
          <label>프로젝트 ID<input value={activeId} onChange={(event) => setActiveId(event.target.value)} placeholder="프로젝트 또는 견적 ID" /></label>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={() => refresh()}>공간 맵 보기</button>
        </div>
        <p className="small-note">{data.statusKo}</p>
      </section>

      <div className="customer-map-layout">
        <section className="estimate-preview-card customer-map-canvas">
          <h3>공간 구성</h3>
          {geometry.spaces.length ? (
            <svg className="customer-map-svg" viewBox={`${geometry.viewBox.x} ${geometry.viewBox.y} ${geometry.viewBox.width} ${geometry.viewBox.height}`} aria-label="고객용 공간 제안 도면">
              {geometry.spaces.map((space) => (
                <g key={space.id} className="customer-map-space" role="button" aria-label={`${space.name} 보기`} onClick={() => setSelectedSpaceId(space.id)}>
                  <polygon className={`customer-map-polygon${selected?.id === space.id ? ' selected' : ''}`} points={scaleToViewBox(space.points)} />
                  <text className="customer-map-label" x={space.center.x} y={space.center.y}>
                    <tspan x={space.center.x}>{space.name}</tspan>
                    <tspan x={space.center.x} dy="180">{displayArea(space.areaM2)}</tspan>
                  </text>
                </g>
              ))}
              {geometry.walls.map((wall) => <line key={wall.id} className="customer-map-wall" x1={wall.start.x} y1={wall.start.y} x2={wall.end.x} y2={wall.end.y} />)}
              {geometry.openings.map((opening) => <circle key={opening.id} className="customer-map-opening" cx={opening.point.x} cy={opening.point.y} r="72" />)}
            </svg>
          ) : <p className="empty-state">표시할 공간 정보가 없습니다.</p>}
        </section>

        <section className="estimate-preview-card">
          <h3>선택 공간</h3>
          {selected ? (
            <>
              <strong>{selected.name}</strong>
              <p>{selected.type} / {displayArea(selected.areaM2)}</p>
              <span className={`customer-map-status ${publicStatusClass(selected.progressStatusKo)}`}>{selected.progressStatusKo}</span>
              <h4>공사 범위</h4>
              <div className="tag-row">{selected.constructionScope.map((scope) => <span key={scope} className="status-pill">{scope}</span>)}</div>
              <h4>주요 마감 방향</h4>
              {selected.finishDirectionKo.length ? selected.finishDirectionKo.map((finish) => <p key={finish}>{finish}</p>) : <p className="empty-state">공사 범위 정보가 없습니다.</p>}
              <p className="small-note">{selected.customerNoteKo}</p>
            </>
          ) : <p className="empty-state">표시할 공간 정보가 없습니다.</p>}
        </section>
      </div>

      <div className="dashboard-grid three">
        <section className="estimate-preview-card">
          <h3>공사 범위</h3>
          {data.publicScopeSummary.length ? (
            <div className="tag-row">{data.publicScopeSummary.map((scope) => <span className="status-pill" key={scope}>{scope}</span>)}</div>
          ) : <p className="empty-state">공사 범위 정보가 없습니다.</p>}
        </section>
        <section className="estimate-preview-card">
          <h3>디자인 방향</h3>
          {hasDesign ? (
            <>
              <p>스타일: {data.designDirection.style || '-'}</p>
              <p>컬러 톤: {data.designDirection.colorTone || '-'}</p>
              <p>주요 자재: {data.designDirection.primaryMaterials || '-'}</p>
              <p>조명 분위기: {data.designDirection.lightingMood || '-'}</p>
            </>
          ) : <p className="empty-state">등록된 디자인 방향이 없습니다.</p>}
        </section>
        <section className="estimate-preview-card">
          <h3>진행 상태</h3>
          <strong>{data.publicScheduleStatus.progressRate}%</strong>
          <p>{data.publicScheduleStatus.statusKo}</p>
          <p>다음 예정: {data.publicScheduleStatus.nextProcessKo}</p>
        </section>
      </div>

      <section className="estimate-preview-card">
        <h3>제안 이미지</h3>
        {data.approvedImages.length ? (
          <div className="customer-map-gallery">
            {data.approvedImages.map((image) => (
              <figure key={image.id}>
                <img src={image.imagePath} alt={`${image.spaceName || '공간'} 제안 이미지`} />
                <figcaption>{image.spaceName || '공간 제안'}</figcaption>
              </figure>
            ))}
          </div>
        ) : <p className="empty-state">등록된 제안 이미지가 없습니다.</p>}
      </section>

      <section className="estimate-preview-card">
        <h3>고객 안내</h3>
        {(data.customerNotes.length ? data.customerNotes : ['고객에게 표시할 수 없는 내부 정보는 제외되었습니다.']).map((note) => <p key={note}>{note}</p>)}
      </section>
    </section>
  );
}
