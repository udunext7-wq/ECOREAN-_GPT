export type ProjectCalibrationData = {
  snapshotDate: string;
  emptyState: boolean;
  emptyMessageKo: string;
  summary: Record<string, unknown>;
  comparisons: Array<Record<string, unknown>>;
  costLeaks: Array<Record<string, unknown>>;
  calibrationRules: Array<Record<string, unknown>>;
  riskPatterns: Array<Record<string, unknown>>;
  approvalLogs: Array<Record<string, unknown>>;
  categoryLabelsKo: Record<string, string>;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('ECOREAN BOC database bridge is not available.');
  return bocDb;
}

export async function loadProjectCalibrationCenterData(projectId?: string): Promise<ProjectCalibrationData> {
  return api().getProjectCalibrationCenterData(projectId ? { projectId } : {}) as Promise<ProjectCalibrationData>;
}

export async function createCalibrationSnapshot(projectId: string): Promise<Record<string, unknown>> {
  return api().createProjectCalibrationSnapshot({ projectId, actor: 'CEO' });
}

export async function decideCalibrationRule(ruleId: string, decision: 'APPROVED' | 'REJECTED' | 'TESTING'): Promise<Record<string, unknown>> {
  return api().decideCalibrationRule({ ruleId, decision, actor: 'CEO' });
}
