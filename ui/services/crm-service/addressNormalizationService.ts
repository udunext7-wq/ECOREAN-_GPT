const bocDb = () => window.ecorean?.bocDb;

function requireDb() {
  const db = bocDb();
  if (!db) throw new Error('BOC DB bridge is not available');
  return db;
}

export const addressNormalizationService = {
  create: (payload: Record<string, unknown>) => requireDb().createAddressRecord(payload),
  update: (payload: Record<string, unknown>) => requireDb().updateAddressRecord(payload),
  list: (payload: Record<string, unknown> = {}) => requireDb().listAddressRecords(payload),
  detail: (payload: Record<string, unknown>) => requireDb().getAddressRecordDetail(payload),
  normalize: (payload: Record<string, unknown>) => requireDb().requestAddressNormalization(payload),
  approve: (payload: Record<string, unknown>) => requireDb().approveNormalizedAddress(payload),
  reject: (payload: Record<string, unknown>) => requireDb().rejectNormalizedAddress(payload),
  defer: (payload: Record<string, unknown>) => requireDb().deferAddressNormalization(payload),
  linkLead: (payload: Record<string, unknown>) => requireDb().linkAddressToLead(payload),
  linkSurvey: (payload: Record<string, unknown>) => requireDb().linkAddressToSurvey(payload),
  linkProject: (payload: Record<string, unknown>) => requireDb().linkAddressToProject(payload),
  summary: () => requireDb().getAddressNormalizationSummary(),
  customerSafe: (payload: Record<string, unknown>) => requireDb().getCustomerSafeAddressPayload(payload),
  report: (payload: Record<string, unknown> = {}) => requireDb().createAddressNormalizationReport(payload)
};
