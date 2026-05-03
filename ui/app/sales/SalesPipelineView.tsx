import { formatPercent, formatWon, type SalesPipelineData } from '../../services/sales-service/salesService';

type Props = {
  data: SalesPipelineData | null;
};

export function SalesPipelineView({ data }: Props) {
  const channelRows = data?.channelPerformance || [];
  const lostReasons = data?.lostReasons || [];
  const profitDecisions = data?.profitDecisions || [];

  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>Sales Funnel</h5>
        <p className="small-note">리드 목록은 Qualification 점수, m2당 예산, 예산 규모 기준으로 “돈 되는 고객”부터 자동 정렬됩니다.</p>
        {(data?.funnel || []).map((stage) => (
          <div className={stage.status === 'LOST' ? 'case-row warning-row' : 'case-row'} key={stage.status}>
            <strong>{stage.labelKo}</strong>
            <span>{stage.count}건</span>
            <p>{formatWon(stage.amount)}</p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>채널별 성과</h5>
        {channelRows.map((row) => (
          <div className="case-row" key={String(row.sourceChannel)}>
            <strong>{String(row.sourceChannel)}</strong>
            <span>{formatWon(row.expectedBudget)}</span>
            <p>계약 {String(row.wonCount)}건 / 실패 {String(row.lostCount)}건 / 전환 {formatPercent(row.winRate)}</p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>LOST 이유 분석</h5>
        {lostReasons.length === 0 ? <p className="small-note">아직 LOST 사유가 없습니다.</p> : null}
        {lostReasons.map((row) => (
          <div className="case-row warning-row" key={String(row.lostReasonId)}>
            <strong>{String(row.reasonCategory)}</strong>
            <span>{formatWon(row.lostAmount)}</span>
            <p>{String(row.reasonKo)}</p>
          </div>
        ))}
      </div>


      <div className="estimate-preview-card">
        <h5>Profit Control Engine</h5>
        {profitDecisions.length === 0 ? <p className="small-note">PCE ?? ??? ?? ????.</p> : null}
        {profitDecisions.slice(0, 6).map((row) => (
          <div className={String(row.decision) === 'BLOCK' ? 'case-row warning-row' : 'case-row'} key={String(row.id)}>
            <strong>{String(row.decision)}</strong>
            <span>{formatPercent(row.realMargin)}</span>
            <p>{String(row.estimateId)} / risk buffer {formatWon(row.riskBuffer)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
