export type KitchenEstimateInput = {
  customerName: string;
  siteName: string;
  constructionType: 'kitchen_remodel';
  kitchenType: 'straight' | 'l_shape' | 'u_shape' | 'island';
  kitchenLengthMm: number;
  ceilingHeightMm: number;
  demolitionIncluded: boolean;
  expansionIncluded: boolean;
  upperCabinetLengthMm: number;
  lowerCabinetLengthMm: number;
  tallCabinet: boolean;
  pantry: boolean;
  island: boolean;
  doorFinish: 'pet' | 'uv' | 'painted' | 'matte';
  countertopType: 'artificial_marble' | 'ceramic' | 'engineered_stone';
  handleType: 'exposed' | 'hidden';
  customerPriceMultiplier?: number;
  options: {
    sinkBowlReplace: boolean;
    faucetReplace: boolean;
    hoodReplace: boolean;
    cooktopReplace: boolean;
    outletAdd: boolean;
    indirectLighting: boolean;
    electricalUpgrade: boolean;
    wallTile: boolean;
    floorFinishConnection: boolean;
    wallpaperConnection: boolean;
    ceilingFinish: boolean;
    moldingFinish: boolean;
  };
};

export type KitchenEstimateItem = {
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

export type KitchenEstimateResult = {
  input: KitchenEstimateInput;
  revenue: number;
  material_cost: number;
  labor_cost: number;
  subcontract_cost: number;
  total_cost: number;
  expected_margin: number;
  expected_margin_rate: number;
  pce_decision: 'BLOCK' | 'MODIFY' | 'GO' | 'SCALE';
  pce_label_ko: string;
  schedule_days: number;
  line_items: KitchenEstimateItem[];
};

export type KitchenEstimatePreview = {
  estimate: KitchenEstimateResult;
  customerView: Record<string, unknown>;
  internalView: Record<string, unknown>;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('BOC database API is not available.');
  return bocDb;
}

export async function calculateKitchenEstimate(input: KitchenEstimateInput): Promise<KitchenEstimatePreview> {
  const bocDb = api();
  if (!bocDb.calculateKitchenEstimate) throw new Error('Kitchen estimate API is not available.');
  return bocDb.calculateKitchenEstimate(input) as Promise<KitchenEstimatePreview>;
}

export async function saveKitchenEstimate(input: KitchenEstimateInput): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveKitchenEstimate) throw new Error('Kitchen estimate save API is not available.');
  return bocDb.saveKitchenEstimate(input);
}

export async function exportKitchenEstimate(payload: {
  estimateId: string;
  documentType: 'customer' | 'internal';
  format: 'pdf' | 'xlsx';
}): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.exportKitchenEstimate) throw new Error('Kitchen estimate export API is not available.');
  return bocDb.exportKitchenEstimate(payload);
}

export async function generateKitchenContract(estimateId: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateKitchenContract) throw new Error('Kitchen contract generation API is not available.');
  return bocDb.generateKitchenContract({ estimateId });
}

export async function generateKitchenSchedule(estimateId: string, contractId?: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateKitchenSchedule) throw new Error('Kitchen schedule generation API is not available.');
  return bocDb.generateKitchenSchedule({ estimateId, contractId });
}

export async function generateKitchenPurchaseOrder(estimateId: string, contractId?: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateKitchenPurchaseOrder) throw new Error('Kitchen purchase order generation API is not available.');
  return bocDb.generateKitchenPurchaseOrder({ estimateId, contractId });
}
