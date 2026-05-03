import { useEffect, useState } from 'react';
import { CashflowForecastView } from './CashflowForecastView';
import { FixedCostManagementView } from './FixedCostManagementView';
import { MonthlyProfitLossView } from './MonthlyProfitLossView';
import { ReceivablePayableView } from './ReceivablePayableView';
import {
  formatWon,
  loadCompanyFinanceData,
  type CompanyFinanceData
} from '../../services/finance-service/financeService';

export function CompanyFinanceDashboard() {
  const [data, setData] = useState<CompanyFinanceData | null>(null);
  const [messageKo, setMessageKo] = useState('회사 재무 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadCompanyFinanceData();
    setData(next);
    setMessageKo(next ? `${next.monthKey} 회사 손익 / 현금흐름 기준` : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">COMPANY FINANCE</span>
          <h4>Company Finance Control</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>이번 달 회사 KPI</h5>
          <div className="case-row"><strong>예상 매출</strong><span>{formatWon(data?.kpis.monthlyRevenue)}</span></div>
          <div className="case-row"><strong>예상 원가</strong><span>{formatWon(data?.kpis.monthlyCost)}</span></div>
          <div className="case-row"><strong>고정비</strong><span>{formatWon(data?.kpis.monthlyFixedCost)}</span></div>
          <div className={Number(data?.kpis.operatingProfit || 0) < 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>예상 영업이익</strong>
            <span>{formatWon(data?.kpis.operatingProfit)}</span>
          </div>
        </div>

        <div className="estimate-preview-card">
          <h5>자금 위험</h5>
          <div className={data?.kpis.cashShortageRisk ? 'case-row warning-row' : 'case-row'}>
            <strong>자금 부족 위험</strong>
            <span>{data?.kpis.cashShortageRisk ? 'RED ALERT' : '정상'}</span>
            <p>{data?.kpis.cashShortageDate ? `${data.kpis.cashShortageDate} 부족 예상` : '현재 예측 부족일 없음'}</p>
          </div>
          <div className="case-row"><strong>미수금 총액</strong><span>{formatWon(data?.kpis.receivableTotal)}</span></div>
          <div className="case-row"><strong>미지급 총액</strong><span>{formatWon(data?.kpis.payableTotal)}</span></div>
          <div className={Number(data?.kpis.netCashflow || 0) < 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>순현금흐름</strong>
            <span>{formatWon(data?.kpis.netCashflow)}</span>
          </div>
        </div>
      </div>

      <MonthlyProfitLossView profitLoss={data?.monthlyProfitLoss || null} />
      <CashflowForecastView forecasts={data?.cashflowForecast || []} />
      <ReceivablePayableView receivables={data?.receivables || []} payables={data?.payables || []} />
      <FixedCostManagementView fixedCosts={data?.fixedCosts || []} />
    </section>
  );
}
