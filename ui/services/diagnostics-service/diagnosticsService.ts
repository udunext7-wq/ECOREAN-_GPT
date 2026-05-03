import type { DashboardData, RedAlert } from '../../src/types/dashboard';

export function getRedAlerts(data: DashboardData): RedAlert[] {
  return data.redAlerts.filter((alert) => alert.severity === 'BLOCKING' || alert.severity === 'HIGH');
}

export function getFirstActionRecommendation(data: DashboardData): string {
  if (data.redAlerts.length > 0) {
    return '긴급 경고를 먼저 열고 공정 차단 여부를 결정하십시오.';
  }

  if (data.approvals.some((item) => item.status === 'PENDING_CEO_APPROVAL')) {
    return '승인 대기 항목을 먼저 처리하십시오.';
  }

  return '오늘 순현금흐름과 청구 가능 현장을 확인하십시오.';
}
