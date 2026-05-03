import type { ApprovalItem } from '../../src/types/dashboard';

export function getChangeOrderEstimateNo(approval: ApprovalItem) {
  return approval.approvalId.replace(/^APP-/, 'CO-EST-');
}

export function getChangeOrderApprovalChecklist(approval: ApprovalItem) {
  return [
    { key: 'customerApproval', labelKo: '고객 승인 여부', statusKo: '필수 확인' },
    { key: 'paymentCondition', labelKo: '추가공사비 입금 조건', statusKo: '입금 확인 후 진행' },
    { key: 'costImpact', labelKo: 'Cost Impact', statusKo: 'UNKNOWN / NEEDS_RESEARCH' },
    { key: 'scheduleImpact', labelKo: 'Schedule Impact', statusKo: '지연 영향 검토' },
    { key: 'materialOrder', labelKo: '자재 발주 필요 여부', statusKo: '발주 전 확인' },
    { key: 'diagnostics', labelKo: '기존 공정 충돌 여부', statusKo: 'diagnostics 필요' },
    { key: 'rollback', labelKo: 'rollback 가능 여부', statusKo: approval.rollbackStatus === 'READY' ? '준비됨' : '확인 필요' }
  ];
}

export function getChangeOrderImpactPreview(approval: ApprovalItem) {
  return {
    estimateNo: getChangeOrderEstimateNo(approval),
    costImpactKo: '승인 후 별도 추가공사 견적 번호로 Cost Impact가 생성됩니다.',
    scheduleImpactKo: '승인 후 Execution Schedule에 추가공정이 삽입됩니다.',
    paymentImpactKo: '승인 후 Payment Milestone에 추가공사비가 추가됩니다.',
    blockedBeforeApprovalKo: '대표 승인 전에는 견적/공정표/수금표에 반영되지 않습니다.'
  };
}
