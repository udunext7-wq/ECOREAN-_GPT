import type { ApprovalItem } from '../../src/types/dashboard';

export function getLearningApprovals(approvals: ApprovalItem[]) {
  return approvals.filter((approval) => approval.approvalType === 'LearningSuggestion');
}

export function getLearningApprovalChecklist(approval: ApprovalItem) {
  const isHighPriority = approval.reasonKo.includes('하자') || approval.reasonKo.includes('클레임') || approval.reasonKo.includes('손실');
  const isProfitSignal = approval.reasonKo.includes('수익') || approval.reasonKo.includes('ROI') || approval.reasonKo.includes('마진');

  return [
    { key: 'repeatRule', labelKo: '반복 기준', statusKo: '동일 Case 2건 이상 필요' },
    { key: 'singleCaseBlock', labelKo: '단일 사례 반영 금지', statusKo: '차단 규칙 적용' },
    { key: 'beforeAfter', labelKo: '변경 전/후 비교', statusKo: 'Master DB 적용 전 비교 필수' },
    { key: 'rollback', labelKo: 'Rollback Snapshot', statusKo: approval.rollbackStatus === 'READY' ? '준비됨' : '차단' },
    { key: 'priority', labelKo: '우선순위', statusKo: isHighPriority ? '하자/클레임 우선' : isProfitSignal ? 'ROI 검토' : '일반' },
    { key: 'approval', labelKo: '대표 승인', statusKo: '승인 전 자동 반영 금지' }
  ];
}

export function getLearningCandidatePreview(approval: ApprovalItem) {
  return {
    candidateStatusKo: 'Auto Update Candidate 생성됨',
    masterDbImpactKo: '승인 시 Master DB Update Request 생성 후 master_db_values에 반영',
    rollbackKo: 'learning_update_snapshots와 master_db_rollback_snapshots에 rollback 기준 저장',
    rejectionKo: '반려 시 learning_suggestions와 auto_update_candidates가 REJECTED로 기록',
    revisionKo: '수정 요청 시 Approval Center에 LearningSuggestion 재등록'
  };
}
