export type PortfolioDashboardData = {
  snapshotDate: string;
  kpis: {
    totalRevenue: number;
    totalCost: number;
    totalExpectedMargin: number;
    totalExpectedMarginRate: number;
    activeProjectCount: number;
    redAlertProjectCount: number;
    resourceConflictCount: number;
    totalInflow: number;
    totalOutflow: number;
    netCashflow: number;
    futureCashShortageRisk: boolean;
  };
  statusGroups: Array<{ status: string; count: number }>;
  projects: Array<Record<string, unknown>>;
  resourceAllocations: Array<Record<string, unknown>>;
  resourceConflicts: Array<Record<string, unknown>>;
  cashflow: Array<Record<string, unknown>>;
  portfolioRisks: Array<Record<string, unknown>>;
};

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export async function loadPortfolioDashboardData(): Promise<PortfolioDashboardData | null> {
  if (!window.ecorean?.bocDb?.getPortfolioDashboardData) return null;
  return window.ecorean.bocDb.getPortfolioDashboardData() as Promise<PortfolioDashboardData>;
}
