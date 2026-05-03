type Props = {
  suggestions: Array<Record<string, unknown>>;
  candidates: Array<Record<string, unknown>>;
};

export function LearningSuggestionView({ suggestions, candidates }: Props) {
  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>Auto Suggest</h5>
        {suggestions.length ? suggestions.map((suggestion) => (
          <div className="case-row" key={String(suggestion.suggestionId)}>
            <strong>{String(suggestion.titleKo)}</strong>
            <span>{String(suggestion.status)} / 승인 필요</span>
            <p>{String(suggestion.suggestionKo)}</p>
          </div>
        )) : <p className="small-note">대표 승인으로 올릴 자동 제안이 아직 없습니다.</p>}
      </div>

      <div className="estimate-preview-card">
        <h5>Master DB Update Candidate</h5>
        {candidates.length ? candidates.map((candidate) => (
          <div className="case-row" key={String(candidate.candidateId)}>
            <strong>{String(candidate.targetDb)} / {String(candidate.targetItemId)}</strong>
            <span>{String(candidate.approvalStatus)}</span>
            <p>자동 반영 금지. Approval Center에서 대표 승인 후 반영합니다.</p>
          </div>
        )) : <p className="small-note">Master DB 후보가 아직 없습니다.</p>}
      </div>
    </div>
  );
}
