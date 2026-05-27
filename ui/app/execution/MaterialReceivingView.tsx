type Props = {
  onCreate: () => void;
  onOpenFeedback?: () => void;
  onOpenTraceability?: () => void;
};

export function MaterialReceivingView({ onCreate, onOpenFeedback, onOpenTraceability }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>자재입고</h5>
      <p>발주 수량과 입고 수량을 비교합니다. LightBIM 발주 항목은 도면 수량 기준을 함께 기록합니다.</p>
      <p className="muted">발주 수량 · 입고 수량 · 미입고 수량 · 기준 수량 출처</p>
      <div className="button-row">
        <button onClick={onCreate}>자재입고 기록</button>
        <button onClick={onOpenFeedback}>실제 사용 / 차이 확인</button>
        <button onClick={onOpenTraceability}>수량 출처 보기</button>
      </div>
    </div>
  );
}
