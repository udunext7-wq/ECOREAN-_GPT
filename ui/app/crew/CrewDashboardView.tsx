import { useEffect, useState } from 'react';
import { CrewAllocationBoard } from './CrewAllocationBoard';
import { CrewMemberDetailView } from './CrewMemberDetailView';
import { LaborCostView } from './LaborCostView';
import {
  formatWon,
  loadCrewDashboardData,
  type CrewDashboardData
} from '../../services/crew-service/crewService';

export function CrewDashboardView() {
  const [data, setData] = useState<CrewDashboardData | null>(null);
  const [messageKo, setMessageKo] = useState('Crew 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadCrewDashboardData();
    setData(next);
    setMessageKo(next ? `기준일 ${next.snapshotDate} / 등록 인력 ${next.kpis.totalCrewCount}명` : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CREW / HR CONTROL</span>
          <h4>Crew & Labor Management</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>오늘 / 내일 투입</h5>
          <div className="case-row"><strong>오늘 투입 인력</strong><span>{data?.kpis.todayCrewCount || 0}명</span></div>
          <div className="case-row"><strong>내일 필요한 인력</strong><span>{data?.kpis.tomorrowCrewCount || 0}명</span></div>
          <div className="case-row"><strong>활성 배정</strong><span>{data?.kpis.activeAllocationCount || 0}건</span></div>
          <div className={(data?.kpis.crewRiskCount || 0) > 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>인력 리스크</strong>
            <span>{data?.kpis.crewRiskCount || 0}건</span>
          </div>
        </div>

        <div className="estimate-preview-card">
          <h5>인건비 관리</h5>
          <div className="case-row"><strong>계획 인건비</strong><span>{formatWon(data?.kpis.plannedLaborCost)}</span></div>
          <div className="case-row"><strong>실제 인건비</strong><span>{formatWon(data?.kpis.actualLaborCost)}</span></div>
          <div className={(data?.kpis.missingLaborCostCount || 0) > 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>미입력 품수/인건비</strong>
            <span>{data?.kpis.missingLaborCostCount || 0}건</span>
          </div>
          <div className={(data?.kpis.laborOverrunCount || 0) > 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>인건비 초과</strong>
            <span>{data?.kpis.laborOverrunCount || 0}건</span>
          </div>
        </div>
      </div>

      <CrewAllocationBoard allocations={data?.allocations || []} risks={data?.risks || []} />
      <LaborCostView laborCosts={data?.laborCosts || []} costCaptureLinks={data?.costCaptureLinks || []} />
      <CrewMemberDetailView members={data?.members || []} />

      <div className="estimate-preview-card">
        <h5>팀별 생산성</h5>
        {(data?.performance || []).map((performance) => (
          <div className="case-row" key={String(performance.performanceId)}>
            <strong>{String(performance.projectId)} / {String(performance.processId)}</strong>
            <span>생산성 {String(performance.productivityScore)}</span>
            <p>
              계획 품수 {String(performance.plannedLaborDay)} / 실제 품수 {String(performance.actualLaborDay)} /
              하자 {String(performance.defectCount)}건
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
