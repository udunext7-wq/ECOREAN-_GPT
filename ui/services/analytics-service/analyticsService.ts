export type AnalyticsCenterData = {
  snapshotDate: string;
  summary: Record<string, unknown>;
  profitAnalytics: Record<string, unknown>;
  teamProductivity: Record<string, unknown>;
  vendorAnalytics: Record<string, unknown>;
  conversionAnalytics: Record<string, unknown>;
  cashflowAnalytics: Record<string, unknown>;
  defectAnalytics: Record<string, unknown>;
  branchComparison: Record<string, unknown>;
  aiPredictions: Array<Record<string, unknown>>;
  emptyState?: boolean;
  emptyMessageKo?: string;
};

function bridge() {
  const db = window.ecorean?.bocDb;
  if (!db) throw new Error('ECOREAN BOC database bridge is not available.');
  return db;
}

export async function getAnalyticsCenterData(): Promise<AnalyticsCenterData> {
  return (await bridge().getAnalyticsCenterData?.()) as AnalyticsCenterData;
}

export async function exportAnalyticsReport(exportType: 'PDF' | 'XLSX') {
  return bridge().exportAnalyticsReport?.({ exportType, actor: 'CEO' });
}
