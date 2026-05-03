export type SiteOperationStatus = {
  projectId: string;
  executionProjectId?: string;
  canStart: boolean;
  siteStatus: string;
  blockingReasonsKo: string[];
  progressRate: number;
  blockedProcessesKo: string[];
  riskFlagsKo: string[];
};

async function invokeAndRefresh<T>(promise: Promise<{ dashboardData: unknown } & T>): Promise<T> {
  const result = await promise;
  window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
  return result;
}

export async function loadSiteOperationStatus(projectId: string): Promise<SiteOperationStatus | null> {
  if (window.ecorean?.bocDb?.getSiteOperationStatus) {
    return window.ecorean.bocDb.getSiteOperationStatus({ projectId }) as Promise<SiteOperationStatus>;
  }
  return null;
}

export async function startSiteOperation(projectId: string) {
  if (!window.ecorean?.bocDb?.startSiteOperation) return null;
  return invokeAndRefresh(window.ecorean.bocDb.startSiteOperation({ projectId, actor: 'CEO' }));
}

export async function saveDailySiteReport(projectId: string, reportDate: string, progressRate: number, issueSummaryKo: string) {
  if (!window.ecorean?.bocDb?.saveDailySiteReport) return null;
  return invokeAndRefresh(window.ecorean.bocDb.saveDailySiteReport({ projectId, reportDate, progressRate, issueSummaryKo, actor: 'CEO' }));
}

export async function saveMaterialDeliveryCheck(projectId: string, materialNameKo: string, relatedProcessId: string, deliveryStatus: string) {
  if (!window.ecorean?.bocDb?.saveMaterialDeliveryCheck) return null;
  return invokeAndRefresh(window.ecorean.bocDb.saveMaterialDeliveryCheck({ projectId, materialNameKo, relatedProcessId, deliveryStatus, actor: 'CEO' }));
}

export async function saveInspectionResult(projectId: string, inspectionType: string, relatedProcessId: string, resultStatus: string, notesKo: string) {
  if (!window.ecorean?.bocDb?.saveInspectionResult) return null;
  return invokeAndRefresh(window.ecorean.bocDb.saveInspectionResult({ projectId, inspectionType, relatedProcessId, resultStatus, notesKo, actor: 'CEO' }));
}

export async function createSiteIssue(projectId: string, issueType: string, severity: string, titleKo: string, descriptionKo: string) {
  if (!window.ecorean?.bocDb?.createSiteIssue) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createSiteIssue({ projectId, issueType, severity, titleKo, descriptionKo, actor: 'CEO' }));
}

export async function createChangeOrderRequest(projectId: string, titleKo: string, requestReasonKo: string) {
  if (!window.ecorean?.bocDb?.createChangeOrderRequest) return null;
  return invokeAndRefresh(window.ecorean.bocDb.createChangeOrderRequest({ projectId, titleKo, requestReasonKo, actor: 'CEO' }));
}
