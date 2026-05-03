type Props = {
  inspectionType: string;
  resultStatus: string;
  notesKo: string;
  onInspectionTypeChange: (value: string) => void;
  onResultStatusChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onSave: () => void;
};

export function InspectionChecklistView({ inspectionType, resultStatus, notesKo, onInspectionTypeChange, onResultStatusChange, onNotesChange, onSave }: Props) {
  return (
    <section className="site-card">
      <span className="eyebrow">INSPECTION</span>
      <h4>검수 체크리스트</h4>
      <div className="site-form-grid">
        <label>
          <span>검수 유형</span>
          <select value={inspectionType} onChange={(event) => onInspectionTypeChange(event.target.value)}>
            <option value="WATERPROOF">방수 검수</option>
            <option value="TILE">타일 검수</option>
            <option value="ELECTRICAL">전기 검수</option>
            <option value="FINAL">준공 검수</option>
          </select>
        </label>
        <label>
          <span>검수 결과</span>
          <select value={resultStatus} onChange={(event) => onResultStatusChange(event.target.value)}>
            <option value="PASSED">완료</option>
            <option value="FAILED">실패</option>
          </select>
        </label>
        <label className="site-wide-field">
          <span>검수 메모</span>
          <textarea value={notesKo} onChange={(event) => onNotesChange(event.target.value)} />
        </label>
      </div>
      <button onClick={onSave}>검수 결과 저장</button>
    </section>
  );
}
