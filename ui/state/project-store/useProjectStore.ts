import type { ProjectSummary } from '../../src/types/dashboard';

export function getProjectDecisionText(project: ProjectSummary): string {
  if (project.riskLevel === 'BLOCKING') {
    return '후속 공정 차단 여부를 먼저 결정해야 합니다.';
  }

  if (project.receivableStatusKo.includes('미수')) {
    return '입금 확인과 지출 예정액을 먼저 대조해야 합니다.';
  }

  return project.nextActionKo;
}
