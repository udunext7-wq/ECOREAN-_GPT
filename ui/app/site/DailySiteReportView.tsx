type Props = {
  reportDate: string;
  progressRate: number;
  issueSummaryKo: string;
  onReportDateChange: (value: string) => void;
  onProgressRateChange: (value: number) => void;
  onIssueSummaryChange: (value: string) => void;
  onSave: () => void;
};

export function DailySiteReportView({ reportDate, progressRate, issueSummaryKo, onReportDateChange, onProgressRateChange, onIssueSummaryChange, onSave }: Props) {
  return (
    <section className="site-card">
      <span className="eyebrow">DAILY SITE REPORT</span>
      <h4>공사일보</h4>
      <div className="site-form-grid">
        <label>
          <span>작성일</span>
          <input value={reportDate} onChange={(event) => onReportDateChange(event.target.value)} />
        </label>
        <label>
          <span>공정 진행률</span>
          <input type="number" value={progressRate} onChange={(event) => onProgressRateChange(Number(event.target.value))} />
        </label>
        <label className="site-wide-field">
          <span>현장 특이사항</span>
          <textarea value={issueSummaryKo} onChange={(event) => onIssueSummaryChange(event.target.value)} />
        </label>
      </div>
      <button onClick={onSave}>공사일보 저장</button>
    </section>
  );
}
