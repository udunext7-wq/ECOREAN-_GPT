type Props = {
  onCreate: () => void;
};

export function CrewAttendanceView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>출역일보</h5>
      <p>작업자, 역할, 출퇴근 시간, 실제 노무비를 저장하고 Cost Capture와 연결합니다.</p>
      <button onClick={onCreate}>출역일보 저장</button>
    </div>
  );
}
