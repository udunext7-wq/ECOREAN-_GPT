import { useEffect, useState } from 'react';
import {
  formatWon,
  loadPortfolioDashboardData,
  type PortfolioDashboardData
} from '../../services/portfolio-service/portfolioService';

export function PortfolioDashboardView() {
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [messageKo, setMessageKo] = useState('Portfolio 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadPortfolioDashboardData();
    setData(next);
    setMessageKo(next ? `기준일 ${next.snapshotDate} / 진행 프로젝트 ${next.kpis.activeProjectCount}개` : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PORTFOLIO CONTROL</span>
          <h4>Portfolio & Resource Management</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>전체 KPI</h5>
          <div className="case-row"><strong>총 매출</strong><span>{formatWon(data?.kpis.totalRevenue)}</span></div>
          <div className="case-row"><strong>총 원가</strong><span>{formatWon(data?.kpis.totalCost)}</span></div>
          <div className="case-row"><strong>총 예상 마진</strong><span>{formatWon(data?.kpis.totalExpectedMargin)}</span></div>
          <div className="case-row"><strong>진행 프로젝트</strong><span>{data?.kpis.activeProjectCount || 0}개</span></div>
          <div className="case-row"><strong>RED ALERT 프로젝트</strong><span>{data?.kpis.redAlertProjectCount || 0}개</span></div>
        </div>

        <div className="estimate-preview-card">
          <h5>통합 현금흐름</h5>
          <div className="case-row"><strong>예정 입금</strong><span>{formatWon(data?.kpis.totalInflow)}</span></div>
          <div className="case-row"><strong>예정 지출</strong><span>{formatWon(data?.kpis.totalOutflow)}</span></div>
          <div className={data?.kpis.futureCashShortageRisk ? 'case-row warning-row' : 'case-row'}>
            <strong>순현금흐름</strong>
            <span>{formatWon(data?.kpis.netCashflow)}</span>
            <p>{data?.kpis.futureCashShortageRisk ? '미수금 또는 현금 부족 위험이 있습니다.' : '현금흐름 위험 없음'}</p>
          </div>
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>상태별 프로젝트</h5>
        <div className="tag-list">
          {(data?.statusGroups || []).map((group) => (
            <span key={group.status}>{group.status}: {group.count}개</span>
          ))}
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>전체 프로젝트 리스트</h5>
        {(data?.projects || []).map((project) => (
          <div className="case-row" key={String(project.projectId)}>
            <strong>{String(project.projectNameKo)}</strong>
            <span>{String(project.projectStatus)} / {String(project.riskLevel)}</span>
            <p>
              매출 {formatWon(project.revenueAmount)} / 마진 {formatWon(project.expectedMargin)} / 다음 액션 {String(project.nextActionKo)}
            </p>
          </div>
        ))}
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>Resource Board</h5>
          {(data?.resourceAllocations || []).map((allocation) => (
            <div className="case-row" key={String(allocation.allocationId)}>
              <strong>{String(allocation.resourceNameKo)}</strong>
              <span>{String(allocation.startDate)} ~ {String(allocation.endDate)}</span>
              <p>{String(allocation.projectId)} / {String(allocation.resourceRole)} / 투입률 {Number(allocation.allocationRate || 0) * 100}%</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>리소스 충돌</h5>
          {(data?.resourceConflicts || []).length ? data?.resourceConflicts.map((conflict) => (
            <div className="case-row warning-row" key={String(conflict.conflictId)}>
              <strong>{String(conflict.resourceNameKo)}</strong>
              <span>{String(conflict.severity)}</span>
              <p>{String(conflict.messageKo)}</p>
            </div>
          )) : <p className="small-note">현재 리소스 충돌 없음</p>}
        </div>
      </div>

      <div className="estimate-preview-card">
        <h5>Portfolio Risk 순위</h5>
        {(data?.portfolioRisks || []).map((risk) => (
          <div className="case-row" key={String(risk.projectId)}>
            <strong>{String(risk.projectNameKo)}</strong>
            <span>{String(risk.riskLevel)} / RED {String(risk.redAlertCount)}</span>
            <p>{String(risk.nextActionKo)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
