export type CompanyFinanceData = {
  snapshotDate: string;
  monthKey: string;
  kpis: {
    monthlyRevenue: number;
    monthlyCost: number;
    monthlyFixedCost: number;
    operatingProfit: number;
    netCashflow: number;
    receivableTotal: number;
    payableTotal: number;
    cashShortageRisk: boolean;
    cashShortageDate: string | null;
  };
  fixedCosts: Array<Record<string, unknown>>;
  monthlyProfitLoss: Record<string, unknown> | null;
  cashflowForecast: Array<Record<string, unknown>>;
  receivables: Array<Record<string, unknown>>;
  payables: Array<Record<string, unknown>>;
};

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export async function loadCompanyFinanceData(): Promise<CompanyFinanceData | null> {
  if (!window.ecorean?.bocDb?.getCompanyFinanceDashboardData) return null;
  return window.ecorean.bocDb.getCompanyFinanceDashboardData() as Promise<CompanyFinanceData>;
}
