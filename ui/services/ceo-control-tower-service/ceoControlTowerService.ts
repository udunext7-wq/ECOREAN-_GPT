export type CfoCashflowSummary = {
  todayExpectedInflow: number;
  todayExpectedOutflow: number;
  todayActualInflow?: number;
  todayActualOutflow?: number;
  todayNetCashflow: number;
  sevenDayExpectedInflow: number;
  sevenDayExpectedOutflow: number;
  sevenDayActualInflow?: number;
  sevenDayActualOutflow?: number;
  sevenDayNetCashflow: number;
  receivableAmount: number;
  payableAmount: number;
  dataStatus: string;
  displayStatusKo: string;
};

export type CeoDecisionItem = {
  decisionId: string;
  sourceModule: string;
  entityId: string;
  type: string;
  titleKo: string;
  projectId: string;
  siteNameKo: string;
  financialImpact: number;
  riskLevel: 'RED' | 'ORANGE' | 'YELLOW' | 'NORMAL';
  requiredActionKo: string;
  deadline: string;
  status: string;
};

export type CeoApprovalRequest = {
  requestId: string;
  sourceModule: string;
  entityId: string;
  projectId: string;
  titleKo: string;
  amount: number;
  reasonKo: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export type CeoControlTowerData = {
  snapshotDate: string;
  summary: Record<string, number>;
  cashflow: CfoCashflowSummary;
  decisions: CeoDecisionItem[];
  redAlerts: Array<Record<string, unknown>>;
  approvalRequests: CeoApprovalRequest[];
};

export async function loadCeoControlTowerData(): Promise<CeoControlTowerData | null> {
  if (!window.ecorean?.bocDb?.getCeoControlTowerData) return null;
  return window.ecorean.bocDb.getCeoControlTowerData() as Promise<CeoControlTowerData>;
}

export async function decideCeoApprovalRequest(requestId: string, decision: 'APPROVED' | 'REJECTED') {
  if (!window.ecorean?.bocDb?.decideCeoApprovalRequest) return null;
  const result = await window.ecorean.bocDb.decideCeoApprovalRequest({
    requestId,
    decision,
    actor: 'CEO',
    reasonKo: decision === 'APPROVED' ? 'CEO Control Tower 승인' : 'CEO Control Tower 반려'
  });
  if (result.dashboardData) {
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
  }
  return result;
}
