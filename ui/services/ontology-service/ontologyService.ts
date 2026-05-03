import type { RedAlert } from '../../src/types/dashboard';

export function buildOntologyFocus(alert: RedAlert): string {
  if (alert.alertId.includes('ORDER')) {
    return '발주, 자재, 일정, 리드타임 관계를 3D 그래프로 추적합니다.';
  }

  if (alert.alertId.includes('RED-001')) {
    return '방수, 검수, 타일 후속 공정, 하자 리스크 관계를 3D 그래프로 추적합니다.';
  }

  return '공정, 리스크, 결제, Approval Log 관계를 3D 그래프로 추적합니다.';
}
