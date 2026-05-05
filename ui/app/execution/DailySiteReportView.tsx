type Props = {
  onCreate: () => void;
};

export function DailySiteReportView({ onCreate }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>공사일보</h5>
      <p>공정표의 금일 공정을 기준으로 작업 내용, 날씨, 특이사항, 내일 공정을 기록합니다.</p>
      <button onClick={onCreate}>공사일보 생성</button>
    </div>
  );
}
