export type BathroomEstimateInput = {
  customerName: string;
  siteName: string;
  constructionType: string;
  bathroomCount: number;
  bathroomAreaM2: number;
  ceilingHeightMm: number;
  demolitionIncluded: boolean;
  constructionMethod: string;
  waterproofMethod: string;
  tileWallType: string;
  tileFloorType: string;
  fixtureGrade: string;
  options: {
    showerBooth: boolean;
    zenda: boolean;
    bathtub: boolean;
    slidingCabinet: boolean;
    ventilationFanReplace: boolean;
    lightingReplace: boolean;
    faucetReplace: boolean;
  };
};

export type BathroomEstimateItem = {
  category: string;
  itemName: string;
  quantity: number;
  unit: string;
  customerUnitPrice: number;
  customerTotal: number;
  materialCost: number;
  laborCost: number;
  subcontractCost: number;
  internalTotal: number;
  margin: number;
  marginRate: number;
};

export type BathroomEstimateResult = {
  input: BathroomEstimateInput;
  revenue: number;
  material_cost: number;
  labor_cost: number;
  subcontract_cost: number;
  total_cost: number;
  expected_margin: number;
  expected_margin_rate: number;
  pce_decision: 'BLOCK' | 'MODIFY' | 'GO' | 'SCALE';
  pce_label_ko: string;
  line_items: BathroomEstimateItem[];
};

export type BathroomEstimatePreview = {
  estimate: BathroomEstimateResult;
  customerView: Record<string, unknown>;
  internalView: Record<string, unknown>;
};

export async function calculateBathroomEstimate(input: BathroomEstimateInput): Promise<BathroomEstimatePreview> {
  const api = window.ecorean?.bocDb;
  if (!api?.calculateBathroomEstimate) {
    throw new Error('Bathroom estimate API is not available.');
  }
  return api.calculateBathroomEstimate(input) as Promise<BathroomEstimatePreview>;
}

export async function saveBathroomEstimate(input: BathroomEstimateInput): Promise<Record<string, unknown>> {
  const api = window.ecorean?.bocDb;
  if (!api?.saveBathroomEstimate) {
    throw new Error('Bathroom estimate save API is not available.');
  }
  return api.saveBathroomEstimate(input);
}
