export type Severity = 'GREEN' | 'YELLOW' | 'RED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
export type ViewKey = 'dashboard' | 'project' | 'approvals' | 'risks' | 'ontology' | 'floorplanCenter' | 'aiVisualization' | 'boardGeneration' | 'lightbimImport' | 'lightbimQuantityReview' | 'lightbimExecutionFeedback' | 'lightbimTraceability' | 'lightbimSpaceMap' | 'lightbimCustomerMap' | 'userTestCenter' | 'backupRestore' | 'initialMasterData' | 'realPriceCalibration' | 'realPriceWorkbench' | 'priceWorkbookImport' | 'priceCalibrationPriority' | 'unmatchedPriceRecommendation' | 'recommendationScoringRules' | 'operationalOnboarding' | 'realProjectIntake' | 'masterDb' | 'franchise' | 'fieldMobile' | 'clientPortal' | 'analytics' | 'aiAutomation' | 'estimate' | 'bathroomEstimate' | 'kitchenEstimate' | 'fullRemodelingEstimate' | 'contractDocuments' | 'constructionSchedule' | 'purchaseOrders' | 'executionManagement' | 'ceoControlTower' | 'communication' | 'payment' | 'closing' | 'calibration' | 'caseLibrary' | 'costCapture' | 'marginSafety' | 'vendorPrice' | 'vendorIntelligence' | 'portfolio' | 'crew' | 'finance' | 'sales' | 'client' | 'settings' | 'profitTemplates' | 'profitAutomation';

export type TopBarKpi = {
  id: string;
  labelKo: string;
  value: string;
  helperKo: string;
  severity: Severity;
  action: string;
};

export type ProjectSummary = {
  projectId: string;
  projectNameKo: string;
  currentProcessKo: string;
  todayTasksKo: string[];
  deadline: string;
  riskScore: number;
  riskLevel: RiskLevel;
  profitRate: string;
  receivableAmount: string;
  progressRate: string;
  remainingDays: number;
  receivableStatusKo: string;
  defectRiskKo: string;
  nextActionKo: string;
};

export type RedAlert = {
  alertId: string;
  projectId: string;
  titleKo: string;
  reasonKo: string;
  severity: RiskLevel;
  firstAction: string;
  drillDownTarget: ViewKey;
};

export type ApprovalItem = {
  approvalId: string;
  projectId: string;
  approvalType: 'MasterDbUpdateRequest' | 'BrandChange' | 'DefectRework' | 'ChangeOrder' | 'Exception' | 'EstimateApproval' | 'LearningSuggestion';
  titleKo: string;
  reasonKo: string;
  status: 'PENDING_CEO_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  rollbackRequired: boolean;
  rollbackStatus: 'READY' | 'NOT_REQUIRED' | 'MISSING';
  blockingImpactKo: string;
};

export type ImmediateAction = {
  actionId: string;
  priority: number;
  titleKo: string;
  reasonKo: string;
  buttonLabelKo: string;
  targetView: ViewKey;
};

export type VarianceItem = {
  rank: number;
  itemNameKo: string;
  varianceType: string;
  reasonKo: string;
  actionKo: string;
};

export type NotificationLogItem = {
  logId: string;
  time: string;
  level: 'INFO' | 'WARNING' | 'RED';
  messageKo: string;
  relatedProjectId: string;
  actionKo: string;
};

export type DashboardData = {
  snapshotDate: string;
  topBar: TopBarKpi[];
  projects: ProjectSummary[];
  redAlerts: RedAlert[];
  approvals: ApprovalItem[];
  immediateActions: ImmediateAction[];
  profitSummary: Record<string, unknown>;
  calibrationSummary: Record<string, unknown>;
  vendorPriceIntelligenceSummary: Record<string, unknown>;
  franchiseSummary: Record<string, unknown>;
  analyticsSummary: Record<string, unknown>;
  aiAutomationSummary: Record<string, unknown>;
  profitAlerts: Array<Record<string, unknown>>;
  profitTemplates: Array<Record<string, unknown>>;
  estimateVsActualTop: VarianceItem[];
  repeatedDefectsTop: VarianceItem[];
  repeatedLossProcessTop: VarianceItem[];
  notificationLog: NotificationLogItem[];
};
