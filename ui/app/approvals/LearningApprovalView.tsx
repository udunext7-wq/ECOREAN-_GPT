import type { ApprovalItem } from '../../src/types/dashboard';
import {
  getLearningApprovalChecklist,
  getLearningApprovals,
  getLearningCandidatePreview
} from '../../services/learning-approval-service/learningApprovalService';

type Props = {
  approvals: ApprovalItem[];
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onRevise: (approvalId: string) => void;
};

export function LearningApprovalView({ approvals, onApprove, onReject, onRevise }: Props) {
  const learningApprovals = getLearningApprovals(approvals);

  return (
    <section className="estimate-approval-view">
      <div className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">LEARNING SUGGESTION APPROVAL FLOW</span>
            <h4>Learning Suggestion 승인</h4>
          </div>
          <span className="preliminary-badge">{learningApprovals.length}건</span>
        </div>
        <p className="small-note">
          Case Library 반복 패턴에서 생성된 제안만 표시됩니다. 대표 승인 전에는 Master DB에 반영되지 않습니다.
        </p>
      </div>

      {learningApprovals.map((approval) => {
        const preview = getLearningCandidatePreview(approval);

        return (
          <article className="estimate-approval-card" key={approval.approvalId}>
            <div className="estimate-panel-head">
              <div>
                <span className="eyebrow">{approval.status}</span>
                <h4>{approval.titleKo}</h4>
                <p>{approval.reasonKo}</p>
              </div>
              <span className="preliminary-badge">{approval.projectId}</span>
            </div>

            <div className="approval-check-grid">
              {getLearningApprovalChecklist(approval).map((item) => (
                <div key={item.key}>
                  <strong>{item.labelKo}</strong>
                  <span>{item.statusKo}</span>
                </div>
              ))}
            </div>

            <div className="final-document-grid">
              <div>
                <strong>Candidate</strong>
                <span>{preview.candidateStatusKo}</span>
              </div>
              <div>
                <strong>Master DB</strong>
                <span>{preview.masterDbImpactKo}</span>
              </div>
              <div>
                <strong>Rollback</strong>
                <span>{preview.rollbackKo}</span>
              </div>
              <div>
                <strong>반려 / 수정</strong>
                <span>{preview.rejectionKo} / {preview.revisionKo}</span>
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
