const bocDb = () => window.ecorean?.bocDb;

function requireDb() {
  const db = bocDb();
  if (!db) throw new Error('BOC DB bridge is not available');
  return db;
}

export const crmNextActionService = {
  create: (payload: Record<string, unknown>) => requireDb().createCrmNextAction(payload),
  list: (payload: Record<string, unknown> = {}) => requireDb().listCrmNextActions(payload),
  detail: (payload: Record<string, unknown>) => requireDb().getCrmNextActionDetail(payload),
  update: (payload: Record<string, unknown>) => requireDb().updateCrmNextAction(payload),
  complete: (payload: Record<string, unknown>) => requireDb().completeCrmNextAction(payload),
  snooze: (payload: Record<string, unknown>) => requireDb().snoozeCrmNextAction(payload),
  cancel: (payload: Record<string, unknown>) => requireDb().cancelCrmNextAction(payload),
  generateForLead: (payload: Record<string, unknown>) => requireDb().generateNextActionsForLead(payload),
  generateForStage: (payload: Record<string, unknown>) => requireDb().generateNextActionsForStageChange(payload),
  createNotification: (payload: Record<string, unknown>) => requireDb().createInternalCrmNotification(payload),
  listNotifications: (payload: Record<string, unknown> = {}) => requireDb().listCrmNotifications(payload),
  readNotification: (payload: Record<string, unknown>) => requireDb().markCrmNotificationRead(payload),
  dismissNotification: (payload: Record<string, unknown>) => requireDb().dismissCrmNotification(payload),
  summary: () => requireDb().getCrmNextActionDashboardSummary(),
  report: (payload: Record<string, unknown> = {}) => requireDb().createCrmNextActionReport(payload)
};
