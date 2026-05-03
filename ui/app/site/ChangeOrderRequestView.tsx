type Props = {
  titleKo: string;
  reasonKo: string;
  onTitleChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onSave: () => void;
};

export function ChangeOrderRequestView({ titleKo, reasonKo, onTitleChange, onReasonChange, onSave }: Props) {
  return (
    <section className="site-card">
      <span className="eyebrow">CHANGE ORDER</span>
      <h4>추가공사 요청</h4>
      <div className="site-form-grid">
        <label>
          <span>추가공사명</span>
          <input value={titleKo} onChange={(event) => onTitleChange(event.target.value)} />
        </label>
        <label className="site-wide-field">
          <span>요청 사유</span>
          <textarea value={reasonKo} onChange={(event) => onReasonChange(event.target.value)} />
        </label>
      </div>
      <button onClick={onSave}>추가공사 승인 요청 생성</button>
    </section>
  );
}
