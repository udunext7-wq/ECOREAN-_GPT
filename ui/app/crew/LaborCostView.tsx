import { formatWon } from '../../services/crew-service/crewService';

type Props = {
  laborCosts: Array<Record<string, unknown>>;
  costCaptureLinks: Array<Record<string, unknown>>;
};

export function LaborCostView({ laborCosts, costCaptureLinks }: Props) {
  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>예상 인건비 vs 실제 인건비</h5>
        {laborCosts.map((cost) => (
          <div className={String(cost.costStatus) === 'OVER_BASELINE' ? 'case-row warning-row' : 'case-row'} key={String(cost.laborCostRecordId)}>
            <strong>{String(cost.projectId)}</strong>
            <span>{String(cost.costStatus)}</span>
            <p>
              계획 {formatWon(cost.plannedLaborCost)} / 실제 {formatWon(cost.actualLaborCost)} /
              차이 {formatWon(cost.varianceAmount)}
            </p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>Cost Capture 연결</h5>
        {costCaptureLinks.map((link) => (
          <div className="case-row" key={`${String(link.projectId)}-${String(link.crewAllocationId)}`}>
            <strong>{String(link.projectId)}</strong>
            <span>{String(link.status)}</span>
            <p>{String(link.messageKo)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
