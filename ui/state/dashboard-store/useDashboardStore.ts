import { useMemo, useState } from 'react';
import { emptyDashboardData } from '../../src/data/emptyDashboardData';
import type { ProjectSortKey } from '../../services/project-service/projectService';
import { sortProjects } from '../../services/project-service/projectService';
import type { DashboardData, ProjectSummary, ViewKey } from '../../src/types/dashboard';
import { loadDashboardData, recordDashboardAction } from '../../services/dashboard-db-service/dashboardDbService';

export function useDashboardStore() {
  const [data, setData] = useState<DashboardData>(emptyDashboardData);
  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [sortKey, setSortKey] = useState<ProjectSortKey>('riskScoreDesc');
  const [activeProjectId, setActiveProjectId] = useState('PRJ-APT-2401');

  const projects = useMemo(() => sortProjects(data.projects, sortKey), [data.projects, sortKey]);
  const activeProject = useMemo<ProjectSummary>(() => {
    return data.projects.find((project) => project.projectId === activeProjectId) ?? data.projects[0] ?? {
      projectId: 'NO_PROJECT',
      projectNameKo: '프로젝트 없음',
      currentProcessKo: 'DB 로딩 중',
      todayTasksKo: [],
      deadline: '-',
      riskScore: 0,
      riskLevel: 'LOW',
      profitRate: '-',
      receivableAmount: '-',
      progressRate: '-',
      remainingDays: 0,
      receivableStatusKo: '-',
      defectRiskKo: '-',
      nextActionKo: 'SQLite 데이터를 불러오는 중입니다.'
    };
  }, [activeProjectId, data.projects]);

  async function refreshDashboardData() {
    setData(await loadDashboardData());
  }

  async function recordAction(actionType: 'BLOCK' | 'ORDER' | 'CLAIM', reasonKo: string, projectId = activeProjectId) {
    setData(await recordDashboardAction({
      actionType,
      actor: 'CEO',
      projectId,
      reasonKo,
      payload: { source: 'CEO Dashboard' }
    }));
  }

  return {
    data,
    projects,
    activeProject,
    activeView,
    sortKey,
    setSortKey,
    setActiveView,
    setActiveProjectId,
    setData,
    refreshDashboardData,
    recordAction
  };
}
