import { updateSalesLeadStatus, formatWon, type SalesLead } from '../../services/sales-service/salesService';

type Props = {
  leads: SalesLead[];
  onRefresh: () => void;
  onMessage: (messageKo: string) => void;
};

export function LeadDetailView({ leads, onRefresh, onMessage }: Props) {
  async function moveStatus(leadId: string, nextStatus: string) {
    try {
      await updateSalesLeadStatus({
        leadId,
        nextStatus,
        actor: 'CEO',
        reasonKo: `${nextStatus} 상태 전환`,
        lostReasonKo: nextStatus === 'LOST' ? '상담 결과 수주 실패 사유 입력 필요' : undefined,
        reasonCategory: nextStatus === 'LOST' ? 'MANUAL_LOST' : undefined
      });
      onMessage('리드 상태가 저장되었습니다.');
      onRefresh();
    } catch (error) {
      onMessage(error instanceof Error ? error.message : '리드 상태 변경 실패');
    }
  }

  return (
    <div className="estimate-preview-card">
      <h5>Lead Detail</h5>
      {leads.map((lead) => (
        <div className={lead.consultationStatus === 'LOST' ? 'case-row warning-row' : 'case-row'} key={lead.leadId}>
          <strong>{lead.customerNameKo}</strong>
          <span>{lead.statusLabelKo}</span>
          <p>
            {lead.interestedScopeKo} / {lead.sourceChannel} / {formatWon(lead.expectedBudget)}
          </p>
          <p>
            Qualification: {lead.qualificationDecision || 'CONDITIONAL'} / {lead.areaM2 || 0}m2 / {lead.locationKo || 'UNKNOWN'}
          </p>
          <p>
            돈 되는 고객 점수: {Number(lead.moneyPriorityScore || 0).toFixed(0)} / m2당 {formatWon(lead.estimatedPricePerM2 || 0)}
          </p>
          <p>{lead.consultationMemoKo}</p>
          <div className="tag-list">
            <button onClick={() => moveStatus(lead.leadId, 'CONTACTED')}>상담 완료</button>
            <button onClick={() => moveStatus(lead.leadId, 'VISIT_SCHEDULED')}>방문 예약</button>
            <button onClick={() => moveStatus(lead.leadId, 'ESTIMATE_SENT')}>견적 발송</button>
            <button onClick={() => moveStatus(lead.leadId, 'NEGOTIATING')}>협의 중</button>
            <button onClick={() => moveStatus(lead.leadId, 'WON')}>계약</button>
            <button onClick={() => moveStatus(lead.leadId, 'LOST')}>실패</button>
          </div>
          <p>다음 액션: {lead.nextActionKo}</p>
        </div>
      ))}
    </div>
  );
}
