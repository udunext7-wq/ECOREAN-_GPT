type Props = {
  onCreate: () => void;
};

export function MaterialReceivingView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>자재입고</h5>
      <p>발주 수량과 입고 수량을 비교하고 부족 수량이 있으면 알림을 생성합니다.</p>
      <button onClick={onCreate}>자재입고 기록</button>
    </div>
  );
}
