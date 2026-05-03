import type { ProjectSummary } from '../../src/types/dashboard';

export type ProjectSortKey = 'riskScoreDesc' | 'deadlineAsc' | 'receivableDesc' | 'defectRiskDesc';

export function sortProjects(projects: ProjectSummary[], sortKey: ProjectSortKey): ProjectSummary[] {
  const list = [...projects];

  if (sortKey === 'deadlineAsc') {
    return list.sort((a, b) => a.deadline.localeCompare(b.deadline));
  }

  if (sortKey === 'receivableDesc') {
    return list.sort((a, b) => Number(b.receivableStatusKo.includes('미수') || b.receivableStatusKo.includes('청구')) - Number(a.receivableStatusKo.includes('미수') || a.receivableStatusKo.includes('청구')));
  }

  if (sortKey === 'defectRiskDesc') {
    return list.sort((a, b) => Number(b.defectRiskKo !== '낮음') - Number(a.defectRiskKo !== '낮음'));
  }

  return list.sort((a, b) => b.riskScore - a.riskScore);
}
