export type LiveMarginSnapshot = {
  snapshotId?: string;
  projectId: string;
  revenue: number;
  capturedCost: number;
  estimatedRemainingCost: number;
  initialEstimatedMargin: number;
  initialEstimatedMarginRate: number;
  currentForecastMargin: number;
  currentForecastMarginRate: number;
  marginDropRate: number;
  marginStatus: 'STABLE' | 'WARNING' | 'RED_ALERT';
  alertLevel: 'GREEN' | 'YELLOW' | 'RED';
  createdAt?: string;
};

export type CostCaptureStatus = {
  projectId: string;
  revenue: number;
  capturedCost: number;
  missingCriticalCount: number;
  forecastMargin: number;
  forecastMarginRate: number;
  completionBlocked: boolean;
  redAlertCount: number;
  ceoAlertCount: number;
  liveMargin?: LiveMarginSnapshot;
};

export type CostRequirement = {
  requirementId: string;
  projectId: string;
  processId: string;
  costCategory: string;
  itemNameKo: string;
  requiredStage: string;
  blockingLevel: 'RED' | 'YELLOW' | 'GREEN';
  sourceType: string;
  vendorRequired: boolean;
  amountRequired: boolean;
  status: 'MISSING_CRITICAL' | 'NEEDS_RESEARCH' | 'CAPTURED' | 'WAIVED_BY_APPROVAL';
  updatedAt: string;
};

export type CostLeakAnalysis = {
  analysisId: string;
  projectId: string;
  leakType: string;
  titleKo: string;
  reasonKo: string;
  severity: 'RED' | 'YELLOW' | 'GREEN';
  actionKo: string;
  createdAt: string;
};

export type ProcessCostLeak = {
  leakId: string;
  projectId: string;
  requirementId: string;
  processId: string;
  costCategory: string;
  itemNameKo: string;
  baselineAmount: number;
  actualAmount: number;
  varianceAmount: number;
  varianceRate: number;
  severity: 'RED' | 'YELLOW' | 'GREEN';
  alertMessageKo: string;
  updatedAt: string;
};

export type CostLeakRootCause = {
  rootCauseId: string;
  leakId: string;
  projectId: string;
  requirementId: string;
  processId: string;
  costCategory: string;
  itemNameKo: string;
  rootCauseType: string;
  rootCauseNameKo: string;
  reasonKo: string;
  status: 'CANDIDATE' | 'APPROVED' | 'REJECTED';
  approvalRequired: boolean;
  evidence: Record<string, unknown>;
  updatedAt: string;
};

export type RootCausePattern = {
  patternId: string;
  rootCauseType: string;
  rootCauseNameKo: string;
  occurrenceCount: number;
  affectedProjects: string[];
  affectedItems: Array<Record<string, unknown>>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detectionRuleKo: string;
  updatedAt: string;
};

export type CostCaptureDashboardData = {
  snapshotDate: string;
  topKpis: CostCaptureStatus[];
  requirements: CostRequirement[];
  entries: Array<Record<string, unknown>>;
  costLeakAnalysis: CostLeakAnalysis[];
  processCostLeaks: ProcessCostLeak[];
  rootCauses: CostLeakRootCause[];
  rootCausePatterns: RootCausePattern[];
  vendorPriceSummary?: {
    verifiedCatalogCount: number;
    needsResearchCatalogCount: number;
    historyCount: number;
    learningCandidateCount: number;
    displayKo: string;
    warningKo: string;
  };
  rootCauseLearningSuggestions: Array<Record<string, unknown>>;
  blockingRules: Array<{ ruleId: string; titleKo: string; severity: string }>;
};

const emptyDashboard: CostCaptureDashboardData = {
  snapshotDate: new Date().toISOString().slice(0, 10),
  topKpis: [],
  requirements: [],
  entries: [],
  costLeakAnalysis: [],
  processCostLeaks: [],
  rootCauses: [],
  rootCausePatterns: [],
  vendorPriceSummary: {
    verifiedCatalogCount: 0,
    needsResearchCatalogCount: 0,
    historyCount: 0,
    learningCandidateCount: 0,
    displayKo: '실제 공급가 입력 대기',
    warningKo: 'VERIFIED 공급가가 없어 현재 견적은 기준값/추정값 기반입니다.'
  },
  rootCauseLearningSuggestions: [],
  blockingRules: []
};

export async function getCostCaptureDashboard(): Promise<CostCaptureDashboardData> {
  const result = await window.ecorean?.bocDb?.getCostCaptureDashboard?.();
  return (result as CostCaptureDashboardData) ?? emptyDashboard;
}

export async function saveActualCostEntry(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.saveActualCostEntry?.(payload);
}

export function formatWon(value: number) {
  return `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: number) {
  return `${((value || 0) * 100).toFixed(2)}%`;
}
