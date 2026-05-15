import { useEffect, useMemo, useState } from 'react';
import { exportAnalyticsReport, getAnalyticsCenterData, type AnalyticsCenterData } from '../../services/analytics-service/analyticsService';

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

function percent(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function asRows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function text(value: unknown, fallback = '데이터 없음') {
  return value == null || value === '' ? fallback : String(value);
}

function riskKo(level: unknown) {
  if (level === 'HIGH') return '높음';
  if (level === 'MEDIUM') return '주의';
  return '낮음';
}

function KpiCard({ title, value, note, tone = '' }: { title: string; value: string; note: string; tone?: string }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function RankingTable({ title, rows, columns, empty }: { title: string; rows: Array<Record<string, unknown>>; columns: Array<{ key: string; label: string; format?: (value: unknown, row: Record<string, unknown>) => string }>; empty: string }) {
  return (
    <section className="drawer-block">
      <h3>{title}</h3>
      <div className="data-table">
        <div className="table-row table-head">
          {columns.map((column) => <span key={column.key}>{column.label}</span>)}
        </div>
        {rows.length === 0 ? <p className="small-note">{empty}</p> : null}
        {rows.slice(0, 8).map((row, index) => (
          <div className="table-row" key={`${title}-${index}`}>
            {columns.map((column) => (
              <span key={column.key}>{column.format ? column.format(row[column.key], row) : text(row[column.key])}</span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

export function AnalyticsCenterView() {
  const [data, setData] = useState<AnalyticsCenterData | null>(null);
  const [messageKo, setMessageKo] = useState('경영 분석 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await getAnalyticsCenterData();
    setData(next);
    setMessageKo(next.emptyState ? text(next.emptyMessageKo) : '경영 분석 센터가 최신화되었습니다.');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleExport(exportType: 'PDF' | 'XLSX') {
    const result = await exportAnalyticsReport(exportType);
    setMessageKo(`${exportType === 'PDF' ? 'PDF' : 'Excel'} 요약 파일이 준비되었습니다: ${text(result?.filePath)}`);
  }

  const summary = data?.summary || {};
  const processRows = useMemo(() => asRows(data?.profitAnalytics?.processProfitability), [data]);
  const typeRows = useMemo(() => asRows(data?.profitAnalytics?.projectTypeProfitability), [data]);
  const monthlyRows = useMemo(() => asRows(data?.profitAnalytics?.monthlyTrend), [data]);
  const regionRows = useMemo(() => asRows(data?.profitAnalytics?.regionTrend), [data]);
  const topProjects = useMemo(() => asRows(data?.profitAnalytics?.topProfitProjects), [data]);
  const teamRows = useMemo(() => asRows(data?.teamProductivity?.teams), [data]);
  const vendorRows = useMemo(() => asRows(data?.vendorAnalytics?.vendors), [data]);
  const cashRows = useMemo(() => asRows(data?.cashflowAnalytics?.monthlyCash), [data]);
  const defectRows = useMemo(() => asRows(data?.defectAnalytics?.defectByProcess), [data]);
  const branchRows = useMemo(() => asRows(data?.branchComparison?.branches), [data]);

  if (!data) {
    return <div className="drawer-block">경영 분석 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="execution-panel">
      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">BUSINESS INTELLIGENCE</span>
            <h3>경영 분석 센터</h3>
            <p>수익, 생산성, 업체, 전환율, 현금흐름, 하자, 지점 성과를 CEO 의사결정 KPI로 집계합니다.</p>
          </div>
          <div className="button-row">
            <button onClick={() => handleExport('PDF')}>PDF 요약</button>
            <button onClick={() => handleExport('XLSX')}>Excel 요약</button>
            <button className="primary-action" onClick={refresh}>새로고침</button>
          </div>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="kpi-grid">
        <KpiCard title="총 매출" value={money(summary.totalRevenue)} note="견적/계약 기반 총 고객가" />
        <KpiCard title="총 마진" value={money(summary.totalMargin)} note={`평균 마진율 ${percent(summary.averageMarginRate)}`} tone={Number(summary.averageMarginRate || 0) < 0.25 ? 'warning-row' : ''} />
        <KpiCard title="현금흐름 위험" value={riskKo(summary.cashflowRiskLevel)} note="입금/지급 예정 기준" tone={summary.cashflowRiskLevel === 'HIGH' ? 'danger' : ''} />
        <KpiCard title="위험 지점" value={`${Number(summary.riskyBranchCount || 0)}곳`} note="본사 기준 미달 지점" />
      </div>

      <div className="dashboard-grid three">
        <section className="drawer-block">
          <h3>AI 예측 KPI</h3>
          <div className="today-action-list">
            {data.aiPredictions.map((prediction) => (
              <div className={prediction.riskLevel === 'HIGH' ? 'action-row warning-row' : 'action-row'} key={String(prediction.id)}>
                <span>{riskKo(prediction.riskLevel)}</span>
                <div>
                  <strong>{text(prediction.predictionType)}</strong>
                  <p>{text(prediction.recommendationKo)} / 신뢰도 {percent(prediction.confidenceScore)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="drawer-block">
          <h3>고객 전환 분석</h3>
          <p>리드 수: {Number(data.conversionAnalytics.totalLeads || 0).toLocaleString('ko-KR')}건</p>
          <p>방문 전환율: {percent(data.conversionAnalytics.visitConversionRate)}</p>
          <p>견적 전환율: {percent(data.conversionAnalytics.estimateConversionRate)}</p>
          <p>계약 전환율: {percent(data.conversionAnalytics.contractConversionRate)}</p>
          <p>평균 계약 금액: {money(data.conversionAnalytics.averageContractAmount)}</p>
        </section>

        <section className="drawer-block">
          <h3>현금흐름 분석</h3>
          <p>미수금: {money(data.cashflowAnalytics.receivableAmount)}</p>
          <p>미지급금: {money(data.cashflowAnalytics.payableAmount)}</p>
          <p>위험 판단: {text(data.cashflowAnalytics.riskKo)}</p>
          <p>연체 고객: {asRows(data.cashflowAnalytics.overdueCustomers).length}건</p>
        </section>
      </div>

      <RankingTable
        title="수익 분석"
        rows={topProjects}
        empty="수익 프로젝트 데이터가 없습니다."
        columns={[
          { key: 'siteName', label: '프로젝트' },
          { key: 'projectTypeKo', label: '유형' },
          { key: 'revenue', label: '매출', format: money },
          { key: 'margin', label: '마진', format: money },
          { key: 'marginRate', label: '마진율', format: percent }
        ]}
      />

      <div className="dashboard-grid two">
        <RankingTable
          title="공정별 수익률"
          rows={processRows}
          empty="공정별 수익 데이터가 없습니다."
          columns={[
            { key: 'processNameKo', label: '공정' },
            { key: 'revenue', label: '매출', format: money },
            { key: 'marginRate', label: '마진율', format: percent }
          ]}
        />
        <RankingTable
          title="프로젝트 유형별 수익"
          rows={typeRows}
          empty="유형별 수익 데이터가 없습니다."
          columns={[
            { key: 'projectTypeKo', label: '유형' },
            { key: 'estimateCount', label: '견적' },
            { key: 'margin', label: '마진', format: money },
            { key: 'marginRate', label: '마진율', format: percent }
          ]}
        />
      </div>

      <div className="dashboard-grid two">
        <RankingTable
          title="월별 수익 추세"
          rows={monthlyRows}
          empty="월별 수익 추세가 없습니다."
          columns={[
            { key: 'monthKey', label: '월' },
            { key: 'revenue', label: '매출', format: money },
            { key: 'margin', label: '마진', format: money },
            { key: 'marginRate', label: '마진율', format: percent }
          ]}
        />
        <RankingTable
          title="지역별 수익률"
          rows={regionRows}
          empty="지역별 수익 데이터가 없습니다."
          columns={[
            { key: 'regionKo', label: '지역' },
            { key: 'revenue', label: '매출', format: money },
            { key: 'marginRate', label: '마진율', format: percent }
          ]}
        />
      </div>

      <div className="dashboard-grid two">
        <RankingTable
          title="팀 생산성"
          rows={teamRows}
          empty={text(data.teamProductivity.emptyMessageKo)}
          columns={[
            { key: 'teamNameKo', label: '팀' },
            { key: 'workHours', label: '작업시간' },
            { key: 'laborCost', label: '노무비', format: money },
            { key: 'productivityAmountPerHour', label: '시간당 수익', format: money }
          ]}
        />
        <RankingTable
          title="협력업체 분석"
          rows={vendorRows}
          empty="협력업체 단가/신뢰도 데이터가 없습니다."
          columns={[
            { key: 'vendorName', label: '업체' },
            { key: 'averageUnitPrice', label: '평균 단가', format: money },
            { key: 'vendorScore', label: '점수' },
            { key: 'recommendationKo', label: '판정' }
          ]}
        />
      </div>

      <div className="dashboard-grid two">
        <RankingTable
          title="현금흐름 분석"
          rows={cashRows}
          empty="현금흐름 추세 데이터가 없습니다."
          columns={[
            { key: 'monthKey', label: '월' },
            { key: 'expectedInflow', label: '유입', format: money },
            { key: 'expectedOutflow', label: '유출', format: money },
            { key: 'expectedNetCashflow', label: '순현금', format: money }
          ]}
        />
        <RankingTable
          title="하자 분석"
          rows={defectRows}
          empty="하자 데이터가 없습니다."
          columns={[
            { key: 'defectTypeKo', label: '하자 유형' },
            { key: 'occurrenceCount', label: '건수' },
            { key: 'totalDefectCost', label: '비용', format: money },
            { key: 'defectRate', label: '발생률', format: percent }
          ]}
        />
      </div>

      <RankingTable
        title="지점 비교"
        rows={branchRows}
        empty="지점 비교 데이터가 없습니다."
        columns={[
          { key: 'branchName', label: '지점' },
          { key: 'revenue', label: '매출', format: money },
          { key: 'marginRate', label: '마진율', format: percent },
          { key: 'pceBlockRate', label: 'BLOCK 비율', format: percent },
          { key: 'statusKo', label: '상태' }
        ]}
      />
    </div>
  );
}
