import type { ApprovalItem } from '../../src/types/dashboard';

export function getEstimateApprovalChecklist(approval: ApprovalItem) {
  return [
    {
      key: 'needsConfirmation',
      labelKo: 'NEEDS_CONFIRMATION 완료 여부',
      statusKo: approval.reasonKo.includes('NEEDS_CONFIRMATION') ? '확인 필요' : '검토 필요'
    },
    {
      key: 'missingPrice',
      labelKo: '필수 단가 누락 여부',
      statusKo: 'UNKNOWN / NEEDS_RESEARCH 확인'
    },
    {
      key: 'highRiskProcess',
      labelKo: '방수/창호/결로 고위험 공정',
      statusKo: '대표 확인 필요'
    },
    {
      key: 'paymentFlow',
      labelKo: '계약금 / 중도금 / 잔금 흐름',
      statusKo: '수금표 초안 확인'
    },
    {
      key: 'marginRisk',
      labelKo: '예상 마진 위험',
      statusKo: '내부 원가표 확인'
    }
  ];
}

export function getEstimateApprovalDescription(approval: ApprovalItem) {
  if (approval.status === 'APPROVED') return 'FINAL ESTIMATE 생성 또는 승인 완료 상태입니다.';
  if (approval.status === 'REJECTED') return '반려되어 PRELIMINARY 상태를 유지합니다.';
  if (approval.status === 'REVISION_REQUESTED') return '수정 요청 상태입니다. Draft 수정 후 재승인이 필요합니다.';
  return '대표 승인 전에는 FINAL ESTIMATE로 전환할 수 없습니다.';
}
