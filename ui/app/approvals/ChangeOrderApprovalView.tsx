import type { ApprovalItem } from '../../src/types/dashboard';
import { getChangeOrderApprovalChecklist, getChangeOrderImpactPreview } from '../../services/change-order-service/changeOrderService';

type Props = {
  approvals: ApprovalItem[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onRevise: (approvalId: string) => void;
};

export function ChangeOrderApprovalView({ approvals, onApprove, onReject, onRevise }: Props) {
  const changeOrderApprovals = approvals.filter((approval) => approval.approvalType === 'ChangeOrder');

  return (
    <section className="estimate-approval-view">
      <div className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">CHANGE ORDER APPROVAL FLOW</span>
            <h4>추가공사 승인</h4>
          </div>
          <span className="preliminary-badge">{changeOrderApprovals.length}건</span>
        </div>
        <p className="small-note">대표 승인 전에는 추가공사를 견적, 공정표, 수금표에 반영하지 않습니다.</p>
      </div>

      {changeOrderApprovals.map((approval) => {
        const impact = getChangeOrderImpactPreview(approval);

        return (
          <article className="estimate-approval-card" key={approval.approvalId}>
            <div className="estimate-panel-head">
              <div>
                <span className="eyebrow">{approval.status}</span>
                <h4>{approval.titleKo}</h4>
                <p>{approval.reasonKo}</p>
              </div>
              <span className="preliminary-badge">{impact.estimateNo}</span>
            </div>

            <div className="approval-check-grid">
              {getChangeOrderApprovalChecklist(approval).map((item) => (
                <div key={item.key}>
                  <strong>{item.labelKo}</strong>
                  <span>{item.statusKo}</span>
                </div>
              ))}
            </div>

            <div className="final-document-grid">
              <div>
                <strong>비용 영향</strong>
                <span>{impact.costImpactKo}</span>
              </div>
              <div>
                <strong>일정 영향</strong>
                <span>{impact.scheduleImpactKo}</span>
              </div>
              <div>
                <strong>수금 영향</strong>
                <span>{impact.paymentImpactKo}</span>
              </div>
              <div>
                <strong>승인 전 차단</strong>
                <span>{impact.blockedBeforeApprovalKo}</span>
              </div>
            </div>

            <div className="button-row approval-button-row">
              <button className="approval-action approval-approve" onClick={() => onApprove(approval.approvalId)}>승인</button>
              <button className="approval-action approval-reject" onClick={() => onReject(approval.approvalId)}>반려</button>
              <button className="approval-action approval-revise" onClick={() => onRevise(approval.approvalId)}>수정 요청</button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
