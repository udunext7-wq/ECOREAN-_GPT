type Props = {
  totalActualCost: number;
  totalRevenue: number;
  finalMarginAmount: number;
  finalMarginRate: number;
  costVariance: number;
  costVarianceRate: number;
  durationVarianceDays: number;
};

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

export function EstimateVsActualView({
  totalActualCost,
  totalRevenue,
  finalMarginAmount,
  finalMarginRate,
  costVariance,
  costVarianceRate,
  durationVarianceDays
}: Props) {
  const marginClassName = finalMarginAmount < 0 ? 'money-red' : '';

  return (
    <div className="estimate-preview-card">
      <h5>Estimate vs Actual 미리보기</h5>
      <div className="money-stack completion-money-stack">
        <div>
          <span>총 매출</span>
          <strong>{formatWon(totalRevenue)}</strong>
        </div>
        <div>
          <span>총 실제 원가</span>
          <strong>{formatWon(totalActualCost)}</strong>
        </div>
        <div className={marginClassName}>
          <span>최종 마진</span>
          <strong>{formatWon(finalMarginAmount)} / {finalMarginRate}%</strong>
        </div>
        <div className={costVariance > 0 ? 'money-red' : ''}>
          <span>예상 대비 원가 오차</span>
          <strong>{formatWon(costVariance)} / {costVarianceRate}%</strong>
        </div>
        <div className={durationVarianceDays > 0 ? 'money-red' : ''}>
          <span>공기 오차</span>
          <strong>{durationVarianceDays}일</strong>
        </div>
      </div>
      <p className="small-note">
        완료 저장 시 위 값은 Completion Report, Estimate vs Actual Report, Master DB Update Candidate로 동시에 기록됩니다.
      </p>
    </div>
  );
}
