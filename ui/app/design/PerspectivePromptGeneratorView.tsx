type Props = {
  promptText: string;
  onGenerate: (promptType: string) => void;
  isBusy?: boolean;
};

export function PerspectivePromptGeneratorView({ promptText, onGenerate, isBusy = false }: Props) {
  return (
    <section className="drawer-block">
      <div className="section-header">
        <div>
          <span className="eyebrow">PROMPT GENERATOR</span>
          <h3>투시도 프롬프트 생성</h3>
          <p>무드보드 + 평면도 + 견적 데이터 = 투시도 프롬프트</p>
        </div>
      </div>
      <div className="button-row">
        <button onClick={() => onGenerate('PERSPECTIVE')} disabled={isBusy}>공간 투시도 프롬프트</button>
        <button onClick={() => onGenerate('ISOMETRIC')} disabled={isBusy}>아이소메트릭 프롬프트</button>
        <button onClick={() => onGenerate('MOODBOARD')} disabled={isBusy}>무드보드 프롬프트</button>
      </div>
      <textarea className="prompt-output" value={promptText || '아직 생성된 프롬프트가 없습니다.'} readOnly rows={10} />
    </section>
  );
}
