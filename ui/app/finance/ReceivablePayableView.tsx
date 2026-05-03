import { formatWon } from '../../services/finance-service/financeService';

type Props = {
  receivables: Array<Record<string, unknown>>;
  payables: Array<Record<string, unknown>>;
};

export function ReceivablePayableView({ receivables, payables }: Props) {
  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>미수금</h5>
        {receivables.map((item) => (
          <div className={String(item.receivableStatus) === 'OVERDUE' ? 'case-row warning-row' : 'case-row'} key={String(item.receivableId)}>
            <strong>{String(item.projectId)}</strong>
            <span>{formatWon(item.amount)} / {String(item.dueDate)}</span>
            <p>{String(item.receivableStatus)} / {String(item.notesKo)}</p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>미지급/예정 지급</h5>
        {payables.map((item) => (
          <div className="case-row" key={String(item.payableId)}>
            <strong>{String(item.projectId || item.vendorId)}</strong>
            <span>{formatWon(item.amount)} / {String(item.dueDate)}</span>
            <p>{String(item.payableType)} / {String(item.notesKo)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
