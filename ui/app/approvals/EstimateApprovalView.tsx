import type { ApprovalItem } from '../../src/types/dashboard';
import { getEstimateApprovalChecklist, getEstimateApprovalDescription } from '../../services/estimate-approval-service/estimateApprovalService';

type Props = {
  approvals: ApprovalItem[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onRevise: (approvalId: string) => void;
};

export function EstimateApprovalView({ approvals, onApprove, onReject, onRevise }: Props) {
  const estimateApprovals = approvals.filter((approval) => approval.approvalType === 'EstimateApproval');

  return (
    <section className="estimate-approval-view">
      <div className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">ESTIMATE APPROVAL FLOW</span>
            <h4>예비 견적 FINAL 전환 승인</h4>
          </div>
          <span className="preliminary-badge">{estimateApprovals.length}건</span>
        </div>
        <p className="small-note">대표 승인 없는 FINAL ESTIMATE 생성은 차단됩니다. 단가/확인 항목이 남아 있으면 수정 요청으로 기록됩니다.</p>
      </div>

      {estimateApprovals.map((approval) => (
        <article className="estimate-approval-card" key={approval.approvalId}>
          <div className="estimate-panel-head">
            <div>
              <span className="eyebrow">{approval.status}</span>
              <h4>{approval.titleKo}</h4>
              <p>{getEstimateApprovalDescription(approval)}</p>
            </div>
            <span className="preliminary-badge">{approval.projectId}</span>
          </div>

          <div className="approval-check-grid">
            {getEstimateApprovalChecklist(approval).map((item) => (
              <div key={item.key}>
                <strong>{item.labelKo}</strong>
                <span>{item.statusKo}</span>
              </div>
            ))}
          </div>

          <div className="final-document-grid">
            <div>
              <strong>고객용 견적서 확정본</strong>
              <span>고객용 / FINAL_READY</span>
            </div>
            <div>
              <strong>내부 원가표 확정본</strong>
              <span>내부용 / FINAL_READY</span>
            </div>
            <div>
              <strong>발주서 생성 준비</strong>
              <span>현장/구매 / READY</span>
            </div>
            <div>
              <strong>공정표 확정 준비</strong>
              <span>현장관리 / READY</span>
            </div>
          </div>

          <div className="button-row approval-button-row">
            <button className="approval-action approval-approve" onClick={() => onApprove(approval.approvalId)}>승인</button>
            <button className="approval-action approval-reject" onClick={() => onReject(approval.approvalId)}>반려</button>
            <button className="approval-action approval-revise" onClick={() => onRevise(approval.approvalId)}>수정 요청</button>
          </div>
        </article>
      ))}
    </section>
  );
}
