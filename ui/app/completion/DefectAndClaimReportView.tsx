type Props = {
  finalScopeKo: string;
  customerFeedbackKo: string;
  defectsText: string;
  claimsText: string;
  delayReasonsText: string;
  reworkRequired: boolean;
  onFinalScopeChange: (value: string) => void;
  onCustomerFeedbackChange: (value: string) => void;
  onDefectsTextChange: (value: string) => void;
  onClaimsTextChange: (value: string) => void;
  onDelayReasonsTextChange: (value: string) => void;
  onReworkRequiredChange: (value: boolean) => void;
};

export function DefectAndClaimReportView({
  finalScopeKo,
  customerFeedbackKo,
  defectsText,
  claimsText,
  delayReasonsText,
  reworkRequired,
  onFinalScopeChange,
  onCustomerFeedbackChange,
  onDefectsTextChange,
  onClaimsTextChange,
  onDelayReasonsTextChange,
  onReworkRequiredChange
}: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>하자 / 클레임 / 고객 피드백</h5>
      <div className="completion-input-grid">
        <label className="completion-wide">
          <span>최종 공사 범위</span>
          <textarea value={finalScopeKo} onChange={(event) => onFinalScopeChange(event.target.value)} />
        </label>
        <label>
          <span>하자 기록</span>
          <textarea value={defectsText} onChange={(event) => onDefectsTextChange(event.target.value)} />
        </label>
        <label>
          <span>클레임 기록</span>
          <textarea value={claimsText} onChange={(event) => onClaimsTextChange(event.target.value)} />
        </label>
        <label>
          <span>지연 사유</span>
          <textarea value={delayReasonsText} onChange={(event) => onDelayReasonsTextChange(event.target.value)} />
        </label>
        <label>
          <span>고객 피드백</span>
          <textarea value={customerFeedbackKo} onChange={(event) => onCustomerFeedbackChange(event.target.value)} />
        </label>
      </div>
      <label className="completion-checkbox">
        <input type="checkbox" checked={reworkRequired} onChange={(event) => onReworkRequiredChange(event.target.checked)} />
        <span>재시공 또는 보완 공사 필요</span>
      </label>
    </div>
  );
}
