export type BathroomPricingPackage = {
  standardId: string;
  packageCode: string;
  packageNameKo: string;
  installationMethod: string;
  costFloor: number;
  minimumMarginRate: number;
  minimumAllowedPrice: number;
  recommendedPrice: number;
  targetMarginRate: number;
  includedItemsKo: string[];
  excludedUpsellsKo: string[];
  ruleStatus: string;
};

export type BathroomPricingOption = {
  optionId: string;
  displayNameKo: string;
  optionType: string;
  defaultIncluded: boolean;
  costBasis: number | null;
  minimumSalePrice: number | null;
  approvalRequired: boolean;
  pricingStatus: string;
  notesKo: string;
};

export type MarginSafetyDashboardData = {
  snapshotDate: string;
  version: string;
  reverseEngineering: {
    revenue: number;
    actualCost: number;
    actualMargin: number;
    actualMarginRate: number;
    findingKo: string;
  };
  packages: BathroomPricingPackage[];
  options: BathroomPricingOption[];
  rules: Array<Record<string, unknown>>;
};

export async function getMarginSafetyDashboard(): Promise<MarginSafetyDashboardData> {
  return (await window.ecorean?.bocDb?.getBathroomPricingStandardDashboard?.()) as MarginSafetyDashboardData;
}

export async function evaluateBathroomQuote(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.evaluateBathroomQuote?.(payload);
}

export function formatWon(value: number) {
  return `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
}
