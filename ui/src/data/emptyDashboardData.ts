import type { DashboardData } from '../types/dashboard';

export const emptyDashboardData: DashboardData = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  topBar: [],
  projects: [],
  redAlerts: [],
  approvals: [],
  immediateActions: [],
  profitSummary: {},
  calibrationSummary: {},
  vendorPriceIntelligenceSummary: {},
  franchiseSummary: {},
  analyticsSummary: {},
  aiAutomationSummary: {},
  profitAlerts: [],
  profitTemplates: [],
  estimateVsActualTop: [],
  repeatedDefectsTop: [],
  repeatedLossProcessTop: [],
  notificationLog: []
};
