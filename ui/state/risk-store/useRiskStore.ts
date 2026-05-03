import type { RedAlert } from '../../src/types/dashboard';

export function getRiskButtonLabel(alert: RedAlert): string {
  if (alert.firstAction === 'blockTileProcess') return '타일 공정 차단';
  if (alert.firstAction === 'approveRushOrder') return '긴급 발주 검토';
  if (alert.firstAction === 'openApprovalCenter') return '승인 센터 열기';
  if (alert.firstAction === 'holdPaymentClaim') return '청구 보류';
  return '상세 보기';
}
