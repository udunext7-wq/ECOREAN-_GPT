export type FullRemodelingEstimateInput = {
  customerName: string;
  siteName: string;
  constructionType: 'full_remodel';
  housingType: string;
  areaM2: number;
  areaPyeong: number;
  roomCount: number;
  bathroomCount: number;
  kitchenType: string;
  balconyCount: number;
  constructionScope: string;
  demolition: Record<string, unknown>;
  selectedProcesses: Record<string, boolean>;
  options: Record<string, Record<string, unknown>>;
  customerPriceMultiplier?: number;
};

export type FullRemodelingEstimateItem = {
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

export type FullRemodelingEstimateResult = {
  input: FullRemodelingEstimateInput;
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
  process_summary: Array<Record<string, unknown>>;
  line_items: FullRemodelingEstimateItem[];
};

export type FullRemodelingEstimatePreview = {
  estimate: FullRemodelingEstimateResult;
  customerView: Record<string, unknown>;
  internalView: Record<string, unknown>;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('BOC database API is not available.');
  return bocDb;
}

export async function calculateFullRemodelingEstimate(input: FullRemodelingEstimateInput): Promise<FullRemodelingEstimatePreview> {
  const bocDb = api();
  if (!bocDb.calculateFullRemodelingEstimate) throw new Error('Full remodeling estimate API is not available.');
  return bocDb.calculateFullRemodelingEstimate(input) as Promise<FullRemodelingEstimatePreview>;
}

export async function saveFullRemodelingEstimate(input: FullRemodelingEstimateInput): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveFullRemodelingEstimate) throw new Error('Full remodeling estimate save API is not available.');
  return bocDb.saveFullRemodelingEstimate(input);
}

export async function exportFullRemodelingEstimate(payload: {
  estimateId: string;
  documentType: 'customer' | 'internal';
  format: 'pdf' | 'xlsx';
}): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.exportFullRemodelingEstimate) throw new Error('Full remodeling estimate export API is not available.');
  return bocDb.exportFullRemodelingEstimate(payload);
}

export async function generateFullRemodelingContract(estimateId: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateFullRemodelingContract) throw new Error('Full remodeling contract generation API is not available.');
  return bocDb.generateFullRemodelingContract({ estimateId });
}

export async function generateFullRemodelingSchedule(estimateId: string, contractId?: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateFullRemodelingSchedule) throw new Error('Full remodeling schedule generation API is not available.');
  return bocDb.generateFullRemodelingSchedule({ estimateId, contractId });
}

export async function generateFullRemodelingPurchaseOrder(estimateId: string, contractId?: string): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateFullRemodelingPurchaseOrder) throw new Error('Full remodeling purchase order generation API is not available.');
  return bocDb.generateFullRemodelingPurchaseOrder({ estimateId, contractId });
}
