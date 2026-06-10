const bocDb = () => window.ecorean?.bocDb;

function requireDb() {
  const db = bocDb();
  if (!db) throw new Error('BOC DB bridge is not available');
  return db;
}

export const crmPipelineService = {
  createCrmLead: (payload: Record<string, unknown>) => requireDb().createCrmLead(payload),
  updateCrmLead: (payload: Record<string, unknown>) => requireDb().updateCrmLead(payload),
  listCrmLeads: (payload: Record<string, unknown> = {}) => requireDb().listCrmLeads(payload),
  getCrmLeadDetail: (payload: Record<string, unknown>) => requireDb().getCrmLeadDetail(payload),
  moveCrmStage: (payload: Record<string, unknown>) => requireDb().moveCrmStage(payload),
  createConsultationLog: (payload: Record<string, unknown>) => requireDb().createConsultationLog(payload),
  createSiteSurveyRequest: (payload: Record<string, unknown>) => requireDb().createSiteSurveyRequest(payload),
  linkLeadToProject: (payload: Record<string, unknown>) => requireDb().linkLeadToProject(payload),
  linkLeadToEstimate: (payload: Record<string, unknown>) => requireDb().linkLeadToEstimate(payload),
  createCrmPipelineReport: (payload: Record<string, unknown> = {}) => requireDb().createCrmPipelineReport(payload),
  getCrmDashboardSummary: () => requireDb().getCrmDashboardSummary(),
  getCrmCustomerSafePayload: (payload: Record<string, unknown>) => requireDb().getCrmCustomerSafePayload(payload)
};
