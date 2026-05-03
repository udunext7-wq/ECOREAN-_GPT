import { formatWon } from '../../services/finance-service/financeService';

type Props = {
  profitLoss: Record<string, unknown> | null;
};

export function MonthlyProfitLossView({ profitLoss }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>월별 손익표</h5>
      <div className="case-row"><strong>월 매출</strong><span>{formatWon(profitLoss?.monthlyRevenue)}</span></div>
      <div className="case-row"><strong>월 직접 원가</strong><span>{formatWon(profitLoss?.monthlyDirectCost)}</span></div>
      <div className="case-row"><strong>월 인건비</strong><span>{formatWon(profitLoss?.monthlyLaborCost)}</span></div>
      <div className="case-row"><strong>월 고정비</strong><span>{formatWon(profitLoss?.monthlyFixedCost)}</span></div>
      <div className={Number(profitLoss?.operatingProfit || 0) < 0 ? 'case-row warning-row' : 'case-row'}>
        <strong>영업이익</strong>
        <span>{formatWon(profitLoss?.operatingProfit)}</span>
        <p>프로젝트 마진에서 회사 고정비를 반영한 실제 회사 이익입니다.</p>
      </div>
      <div className={Number(profitLoss?.netCashflow || 0) < 0 ? 'case-row warning-row' : 'case-row'}>
        <strong>순현금흐름</strong>
        <span>{formatWon(profitLoss?.netCashflow)}</span>
      </div>
    </div>
  );
}
