export type VendorPriceIntelligenceData = {
  summary: {
    openAlertCount: number;
    criticalAlertCount: number;
    highAlertCount: number;
    riskyVendorCount: number;
    pendingRecommendationCount: number;
    priceHistoryCount: number;
    topPriceIncreases: Array<Record<string, unknown>>;
    displayStatusKo: string;
  };
  priceHistory: Array<Record<string, unknown>>;
  comparisons: Array<Record<string, unknown>>;
  reliabilityScores: Array<Record<string, unknown>>;
  alerts: Array<Record<string, unknown>>;
  recommendations: Array<Record<string, unknown>>;
  vendorSelection: Record<string, unknown>;
  emptyState: boolean;
};

const emptyData: VendorPriceIntelligenceData = {
  summary: {
    openAlertCount: 0,
    criticalAlertCount: 0,
    highAlertCount: 0,
    riskyVendorCount: 0,
    pendingRecommendationCount: 0,
    priceHistoryCount: 0,
    topPriceIncreases: [],
    displayStatusKo: '단가 이력 입력 대기'
  },
  priceHistory: [],
  comparisons: [],
  reliabilityScores: [],
  alerts: [],
  recommendations: [],
  vendorSelection: {},
  emptyState: true
};

export async function getVendorPriceIntelligenceData(): Promise<VendorPriceIntelligenceData> {
  const result = await window.ecorean?.bocDb?.getVendorPriceIntelligenceData?.();
  return (result as VendorPriceIntelligenceData) ?? emptyData;
}

export async function saveMaterialPriceHistory(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.saveMaterialPriceHistory?.(payload);
}

export async function importMaterialPriceHistoryCsv(csvText: string) {
  return window.ecorean?.bocDb?.importMaterialPriceHistoryCsv?.({ csvText });
}

export async function decideVendorPriceRecommendation(payload: { recommendationId: string; decision: 'APPROVED' | 'REJECTED' | 'APPLIED'; actor?: string; reasonKo?: string }) {
  return window.ecorean?.bocDb?.decideVendorPriceRecommendation?.(payload);
}

export async function getVendorSelectionRecommendation(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.getVendorSelectionRecommendation?.(payload);
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
