type Props = {
  allocations: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
};

export function CrewAllocationBoard({ allocations, risks }: Props) {
  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>프로젝트 투입 보드</h5>
        {allocations.map((allocation) => (
          <div className="case-row" key={String(allocation.crewAllocationId)}>
            <strong>{String(allocation.memberNameKo)}</strong>
            <span>{String(allocation.plannedStartDate)} ~ {String(allocation.plannedEndDate)}</span>
            <p>
              {String(allocation.projectId)} / {String(allocation.processNameKo)} /
              계획 품수 {String(allocation.plannedLaborDay)} / 실제 품수 {String(allocation.actualLaborDay)}
            </p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>인력 충돌 / 부족 경고</h5>
        {risks.length ? risks.map((risk) => (
          <div className="case-row warning-row" key={String(risk.crewRiskLogId)}>
            <strong>{String(risk.riskType)}</strong>
            <span>{String(risk.severity)}</span>
            <p>{String(risk.messageKo)}</p>
          </div>
        )) : <p className="small-note">현재 인력 리스크 없음</p>}
      </div>
    </div>
  );
}
