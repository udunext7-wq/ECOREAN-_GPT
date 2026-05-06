export type ProjectClosingData = {
  snapshotDate: string;
  summary: Record<string, unknown>;
  snapshots: Array<Record<string, unknown>>;
  costLeaks: Array<Record<string, unknown>>;
  reports: Array<Record<string, unknown>>;
  calibrationRules: Array<Record<string, unknown>>;
  statusLabelsKo: Record<string, string>;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('ECOREAN BOC database bridge is not available.');
  return bocDb;
}

export async function loadProjectClosingCenterData(projectId?: string): Promise<ProjectClosingData> {
  return api().getProjectClosingCenterData(projectId ? { projectId } : {}) as Promise<ProjectClosingData>;
}

export async function createClosingSnapshot(projectId: string): Promise<Record<string, unknown>> {
  return api().createProjectClosingSnapshot({ projectId, actor: 'CEO' });
}

export async function finalizeClosing(projectId: string, override = false): Promise<Record<string, unknown>> {
  return api().finalizeProjectClosing({ projectId, actor: 'CEO', override });
}

export async function saveHighMarginTemplate(projectId: string): Promise<Record<string, unknown>> {
  return api().saveHighMarginTemplateFromClosing({ projectId, actor: 'CEO' });
}
