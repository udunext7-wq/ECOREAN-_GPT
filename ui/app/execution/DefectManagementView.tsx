type Props = {
  onCreate: () => void;
};

export function DefectManagementView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>하자관리</h5>
      <p>하자 접수, 예상 처리비, 원인 기록을 Root Cause와 Learning으로 연결합니다.</p>
      <button onClick={onCreate}>하자 접수</button>
    </div>
  );
}
