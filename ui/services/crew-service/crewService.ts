export type CrewDashboardData = {
  snapshotDate: string;
  kpis: {
    totalCrewCount: number;
    todayCrewCount: number;
    tomorrowCrewCount: number;
    activeAllocationCount: number;
    crewRiskCount: number;
    missingLaborCostCount: number;
    laborOverrunCount: number;
    plannedLaborCost: number;
    actualLaborCost: number;
    laborCostVariance: number;
  };
  members: Array<Record<string, unknown>>;
  allocations: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
  performance: Array<Record<string, unknown>>;
  laborCosts: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
  costCaptureLinks: Array<Record<string, unknown>>;
};

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export async function loadCrewDashboardData(): Promise<CrewDashboardData | null> {
  if (!window.ecorean?.bocDb?.getCrewDashboardData) return null;
  return window.ecorean.bocDb.getCrewDashboardData() as Promise<CrewDashboardData>;
}
