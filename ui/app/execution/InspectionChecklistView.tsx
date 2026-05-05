type Props = {
  onCreate: () => void;
};

export function InspectionChecklistView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>검수 체크리스트</h5>
      <p>욕실 필수 검수 항목을 만들고 Critical FAIL 시 후속 공정을 차단합니다.</p>
      <button onClick={onCreate}>검수표 생성</button>
    </div>
  );
}
