export type VendorPriceCatalogItem = {
  priceId: string;
  vendorId: string;
  vendorNameKo: string;
  materialId: string;
  materialNameKo: string;
  category: string;
  brandName: string;
  modelName: string;
  standardSpec: string;
  unit: string;
  supplierPrice: number;
  internalPrice: number;
  priceStatus: string;
  sourceType: string;
  sourceName: string;
  sourceDate: string;
  confidenceLevel: string;
  approvalStatus: string;
  notesKo: string;
  updatedAt: string;
};

export type VendorPriceAdminData = {
  summary: {
    verifiedCatalogCount: number;
    needsResearchCatalogCount: number;
    pendingApprovalCount: number;
    historyCount: number;
    learningCandidateCount: number;
    displayKo: string;
    warningKo: string;
  };
  catalog: VendorPriceCatalogItem[];
  mappings: Array<{
    mappingId: string;
    projectType: string;
    itemId: string;
    materialId: string;
    materialNameKo: string;
    category: string;
    fallbackBasis: string;
  }>;
  approvalLogs: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
};

export type VendorPriceInput = {
  vendorId?: string;
  vendorNameKo: string;
  materialId: string;
  materialNameKo: string;
  category: string;
  brandName: string;
  modelName: string;
  standardSpec: string;
  unit: string;
  supplierPrice: number;
  internalPrice?: number;
  leadTimeDays?: string;
  paymentConditionKo?: string;
  evidenceMemoKo: string;
  sourceDocumentKo: string;
  actor?: string;
  notesKo?: string;
};

const emptyData: VendorPriceAdminData = {
  summary: {
    verifiedCatalogCount: 0,
    needsResearchCatalogCount: 0,
    pendingApprovalCount: 0,
    historyCount: 0,
    learningCandidateCount: 0,
    displayKo: '실제 공급가 입력 대기',
    warningKo: 'VERIFIED 공급가가 없어 현재 견적은 기준값/추정값 기반입니다.'
  },
  catalog: [],
  mappings: [],
  approvalLogs: [],
  evidence: []
};

export async function getVendorPriceAdminData(): Promise<VendorPriceAdminData> {
  const result = await window.ecorean?.bocDb?.getVendorPriceAdminData?.();
  return (result as VendorPriceAdminData) ?? emptyData;
}

export async function createVendorPriceCatalogEntry(payload: VendorPriceInput) {
  return window.ecorean?.bocDb?.createVendorPriceCatalogEntry?.(payload);
}

export async function decideVendorPriceApproval(payload: { priceId: string; decision: 'APPROVED' | 'REJECTED' | 'REQUEST_REVISION'; actor?: string; reasonKo?: string }) {
  return window.ecorean?.bocDb?.decideVendorPriceApproval?.(payload);
}

export function formatWon(value: number | null | undefined) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}
