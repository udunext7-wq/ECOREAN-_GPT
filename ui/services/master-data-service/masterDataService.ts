export type MasterDataCenterData = {
  summary: Record<string, unknown>;
  processes: Array<Record<string, unknown>>;
  materials: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  labor: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  standardItems: Array<Record<string, unknown>>;
  validationLogs: Array<Record<string, unknown>>;
  estimateUsage: Record<string, unknown>;
  emptyState: boolean;
};

const emptyData: MasterDataCenterData = {
  summary: {},
  processes: [],
  materials: [],
  vendors: [],
  labor: [],
  equipment: [],
  standardItems: [],
  validationLogs: [],
  estimateUsage: {},
  emptyState: true
};

export async function getMasterDataCenterData(payload: Record<string, unknown> = {}): Promise<MasterDataCenterData> {
  const result = await window.ecorean?.bocDb?.getMasterDataCenterData?.(payload);
  return (result as MasterDataCenterData) ?? emptyData;
}

export async function createMasterDataItem(type: string, payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createMasterDataItem?.({ type, payload, actor: 'CEO' });
}

export async function runMasterDataValidation() {
  return window.ecorean?.bocDb?.runMasterDataValidation?.({ actor: 'CEO' });
}

export async function importMasterDataCsv(type: string, csvText: string) {
  return window.ecorean?.bocDb?.importMasterDataCsv?.({ type, csvText, actor: 'CEO' });
}

export async function exportMasterDataCsv(type: string) {
  return window.ecorean?.bocDb?.exportMasterDataCsv?.({ type });
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}
