type Props = {
  titleKo: string;
  descriptionKo: string;
  severity: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSeverityChange: (value: string) => void;
  onSave: () => void;
};

export function SiteIssueView({ titleKo, descriptionKo, severity, onTitleChange, onDescriptionChange, onSeverityChange, onSave }: Props) {
  return (
    <section className="site-card">
      <span className="eyebrow">SITE ISSUE</span>
      <h4>현장 이슈 기록</h4>
      <div className="site-form-grid">
        <label>
          <span>이슈 제목</span>
          <input value={titleKo} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label>
          <span>위험도</span>
          <select value={severity} onChange={(event) => onSeverityChange(event.target.value)}>
            <option value="WARNING">경고</option>
            <option value="HIGH">높음</option>
            <option value="BLOCKING">차단</option>
          </select>
        </label>
        <label className="site-wide-field">
          <span>상세 내용</span>
          <textarea value={descriptionKo} onChange={(event) => onDescriptionChange(event.target.value)} />
        </label>
      </div>
      <button onClick={onSave}>이슈 저장</button>
    </section>
  );
}
