export type FranchiseCenterData = {
  summary: Record<string, unknown>;
  branches: Array<Record<string, unknown>>;
  branchMetrics: Array<Record<string, unknown>>;
  selectedBranch?: Record<string, unknown>;
  packages: Array<Record<string, unknown>>;
  packageStatuses: Array<Record<string, unknown>>;
  policies: Array<Record<string, unknown>>;
  feeRules: Array<Record<string, unknown>>;
  feeRecords: Array<Record<string, unknown>>;
  riskAlerts: Array<Record<string, unknown>>;
  templates: Array<Record<string, unknown>>;
  emptyState: boolean;
};

const emptyData: FranchiseCenterData = {
  summary: {},
  branches: [],
  branchMetrics: [],
  packages: [],
  packageStatuses: [],
  policies: [],
  feeRules: [],
  feeRecords: [],
  riskAlerts: [],
  templates: [],
  emptyState: true
};

export async function getFranchiseCenterData(payload: Record<string, unknown> = {}): Promise<FranchiseCenterData> {
  const result = await window.ecorean?.bocDb?.getFranchiseCenterData?.(payload);
  return (result as FranchiseCenterData) ?? emptyData;
}

export async function createFranchiseBranch(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createFranchiseBranch?.(payload);
}

export async function publishFranchiseDistributionPackage(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.publishFranchiseDistributionPackage?.(payload);
}

export async function applyFranchisePackageToBranch(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.applyFranchisePackageToBranch?.(payload);
}

export async function createBranchProfitPolicy(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createBranchProfitPolicy?.(payload);
}

export async function calculateFranchiseFeeRecord(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.calculateFranchiseFeeRecord?.(payload);
}

export async function markFranchiseFeePaid(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.markFranchiseFeePaid?.(payload);
}

export async function createFranchiseReplicationTemplate(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createFranchiseReplicationTemplate?.(payload);
}

export async function applyReplicationTemplateToBranch(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.applyReplicationTemplateToBranch?.(payload);
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
