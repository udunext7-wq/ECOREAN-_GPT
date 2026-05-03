import { formatWon } from '../../services/finance-service/financeService';

type Props = {
  fixedCosts: Array<Record<string, unknown>>;
};

export function FixedCostManagementView({ fixedCosts }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>회사 고정비</h5>
      {fixedCosts.map((cost) => (
        <div className="case-row" key={String(cost.fixedCostId)}>
          <strong>{String(cost.costNameKo)}</strong>
          <span>매월 {String(cost.paymentDay)}일 / {formatWon(cost.monthlyAmount)}</span>
          <p>{String(cost.paymentMethodKo)} / {String(cost.notesKo)}</p>
        </div>
      ))}
    </div>
  );
}
