type Props = {
  materialNameKo: string;
  deliveryStatus: string;
  onMaterialChange: (value: string) => void;
  onDeliveryStatusChange: (value: string) => void;
  onSave: () => void;
};

export function MaterialDeliveryCheckView({ materialNameKo, deliveryStatus, onMaterialChange, onDeliveryStatusChange, onSave }: Props) {
  return (
    <section className="site-card">
      <span className="eyebrow">MATERIAL DELIVERY</span>
      <h4>자재 입고 확인</h4>
      <div className="site-form-grid">
        <label>
          <span>자재명</span>
          <input value={materialNameKo} onChange={(event) => onMaterialChange(event.target.value)} />
        </label>
        <label>
          <span>입고 상태</span>
          <select value={deliveryStatus} onChange={(event) => onDeliveryStatusChange(event.target.value)}>
            <option value="DELIVERED">입고 완료</option>
            <option value="NOT_DELIVERED">미입고</option>
            <option value="PARTIAL">부분 입고</option>
          </select>
        </label>
      </div>
      <button onClick={onSave}>입고 기록 저장</button>
    </section>
  );
}
