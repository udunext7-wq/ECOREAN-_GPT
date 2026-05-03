import type { ApprovalItem } from '../../src/types/dashboard';
import { StatusPill } from '../alerts/StatusPill';

type Props = {
  approvals: ApprovalItem[];
  messageKo: string;
  onApprove: (approvalId: string) => void;
  onReject: (approvalId: string) => void;
  onRevise: (approvalId: string) => void;
  onTone: (tone: 'confirm' | 'warning' | 'click') => void;
};

export function ApprovalCenter({ approvals, messageKo, onApprove, onReject, onRevise, onTone }: Props) {
  return (
    <div className="approval-center">
      <div className="approval-message">{messageKo}</div>
      {approvals.map((item) => (
        <div key={item.approvalId} className="approval-item">
          <div>
            <StatusPill
              level={item.status === 'PENDING_CEO_APPROVAL' ? 'RED' : 'GREEN'}
              label={item.status === 'PENDING_CEO_APPROVAL' ? '승인 대기' : item.status === 'APPROVED' ? '승인 완료' : item.status === 'REJECTED' ? '반려' : '수정 요청'}
            />
            <h3>{item.titleKo}</h3>
            <p>{item.reasonKo}</p>
            <span className="small-note">차단 영향: {item.blockingImpactKo}</span>
            {item.rollbackRequired ? <span className="small-note">rollbackData: {item.rollbackStatus === 'READY' ? '준비됨' : '누락'}</span> : null}
          </div>
          <div className="button-row approval-button-row">
            <button
              className="approval-action approval-approve"
              onClick={() => {
                onTone('confirm');
                onApprove(item.approvalId);
              }}
            >
              승인
            </button>
            <button
              className="approval-action approval-reject"
              onClick={() => {
                onTone('warning');
                onReject(item.approvalId);
              }}
            >
              반려
            </button>
            <button
              className="approval-action approval-revise"
              onClick={() => {
                onTone('click');
                onRevise(item.approvalId);
              }}
            >
              수정 요청
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
