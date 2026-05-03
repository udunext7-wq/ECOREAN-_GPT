type Props = {
  defectPatterns: Array<Record<string, unknown>>;
  profitPatterns: Array<Record<string, unknown>>;
};

export function PatternDetectionView({ defectPatterns, profitPatterns }: Props) {
  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>반복 손실 / 하자 패턴</h5>
        {defectPatterns.length ? defectPatterns.map((pattern) => (
          <div className="case-row" key={String(pattern.patternId)}>
            <strong>{String(pattern.patternNameKo)}</strong>
            <span>{String(pattern.occurrenceCount)}회 / {String(pattern.severity)}</span>
            <p>{String(pattern.detectionRuleKo)}</p>
          </div>
        )) : <p className="small-note">반복 기준을 넘은 손실/하자 패턴이 아직 없습니다.</p>}
      </div>

      <div className="estimate-preview-card">
        <h5>반복 수익 패턴</h5>
        {profitPatterns.length ? profitPatterns.map((pattern) => (
          <div className="case-row" key={String(pattern.patternId)}>
            <strong>{String(pattern.patternNameKo)}</strong>
            <span>{String(pattern.occurrenceCount)}회 / {String(pattern.profitSignalKo)}</span>
            <p>{String(pattern.detectionRuleKo)}</p>
          </div>
        )) : <p className="small-note">반복 기준을 넘은 수익 패턴이 아직 없습니다.</p>}
      </div>
    </div>
  );
}
