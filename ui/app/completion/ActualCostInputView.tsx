import type { ActualCosts } from '../../services/completion-service/projectCompletionService';

type Props = {
  finalContractAmount: number;
  finalAdditionalWorkAmount: number;
  actualCosts: ActualCosts;
  estimatedDurationDays: number;
  actualDurationDays: number;
  onFinalContractAmountChange: (value: number) => void;
  onFinalAdditionalWorkAmountChange: (value: number) => void;
  onActualCostsChange: (value: ActualCosts) => void;
  onEstimatedDurationDaysChange: (value: number) => void;
  onActualDurationDaysChange: (value: number) => void;
};

const costFields: Array<{ key: keyof ActualCosts; labelKo: string }> = [
  { key: 'materialCost', labelKo: '실제 자재비' },
  { key: 'laborCost', labelKo: '실제 노무비' },
  { key: 'subcontractCost', labelKo: '실제 외주비' },
  { key: 'equipmentCost', labelKo: '실제 장비비' },
  { key: 'wasteCost', labelKo: '실제 폐기물비' },
  { key: 'transportCost', labelKo: '실제 운반비' }
];

export function ActualCostInputView({
  finalContractAmount,
  finalAdditionalWorkAmount,
  actualCosts,
  estimatedDurationDays,
  actualDurationDays,
  onFinalContractAmountChange,
  onFinalAdditionalWorkAmountChange,
  onActualCostsChange,
  onEstimatedDurationDaysChange,
  onActualDurationDaysChange
}: Props) {
  function updateCost(key: keyof ActualCosts, value: number) {
    onActualCostsChange({ ...actualCosts, [key]: value });
  }

  return (
    <div className="estimate-preview-card">
      <h5>실제 원가 입력</h5>
      <div className="completion-input-grid">
        <label>
          <span>최종 계약금액</span>
          <input type="number" value={finalContractAmount} onChange={(event) => onFinalContractAmountChange(Number(event.target.value))} />
        </label>
        <label>
          <span>추가공사 금액</span>
          <input type="number" value={finalAdditionalWorkAmount} onChange={(event) => onFinalAdditionalWorkAmountChange(Number(event.target.value))} />
        </label>
        {costFields.map((field) => (
          <label key={field.key}>
            <span>{field.labelKo}</span>
            <input type="number" value={actualCosts[field.key]} onChange={(event) => updateCost(field.key, Number(event.target.value))} />
          </label>
        ))}
        <label>
          <span>예상 공기</span>
          <input type="number" value={estimatedDurationDays} onChange={(event) => onEstimatedDurationDaysChange(Number(event.target.value))} />
        </label>
        <label>
          <span>실제 공기</span>
          <input type="number" value={actualDurationDays} onChange={(event) => onActualDurationDaysChange(Number(event.target.value))} />
        </label>
      </div>
    </div>
  );
}
