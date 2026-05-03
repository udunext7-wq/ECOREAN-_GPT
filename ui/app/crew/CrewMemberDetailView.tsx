type Props = {
  members: Array<Record<string, unknown>>;
};

export function CrewMemberDetailView({ members }: Props) {
  return (
    <div className="estimate-preview-card">
      <h5>Crew Master</h5>
      {members.map((member) => (
        <div className="case-row" key={String(member.crewMemberId)}>
          <strong>{String(member.memberNameKo)}</strong>
          <span>{String(member.crewType)} / 신뢰도 {String(member.reliabilityScore)}</span>
          <p>
            역할 {String(member.role)} / 일당 {Number(member.dailyWage || 0).toLocaleString('ko-KR')}원 /
            하자 {String(member.defectHistoryCount)}건 / 결근·지각 {String(member.absenceHistoryCount)}건
          </p>
        </div>
      ))}
    </div>
  );
}
