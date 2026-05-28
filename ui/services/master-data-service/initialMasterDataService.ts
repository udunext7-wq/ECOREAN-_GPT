export type InitialMasterDataStatus = {
  version?: string;
  sourceMarker?: string;
  status?: string;
  statusKo?: string;
  summary?: Record<string, unknown>;
  latestLogs?: Array<Record<string, unknown>>;
  warningKo?: string;
};

const fallbackStatus: InitialMasterDataStatus = {
  status: 'NOT_STARTED',
  statusKo: '초기 데이터 세팅 필요',
  summary: {},
  latestLogs: [],
  warningKo: '이 기본 데이터는 초기 운영용 기준값입니다. 실제 단가와 업체 조건에 맞게 반드시 수정해야 합니다.'
};

export async function getInitialMasterDataStatus(): Promise<InitialMasterDataStatus> {
  return (await window.ecorean?.bocDb?.getInitialMasterDataStatus?.()) as InitialMasterDataStatus ?? fallbackStatus;
}

export async function runInitialMasterDataSetup(payload: Record<string, unknown> = {}) {
  return window.ecorean?.bocDb?.runInitialMasterDataSetup?.(payload);
}

export async function validateInitialMasterData() {
  return window.ecorean?.bocDb?.validateInitialMasterData?.();
}

export async function createInitialMasterDataBackup() {
  return window.ecorean?.bocDb?.createInitialMasterDataBackup?.({ notes: '초기 기준 데이터 수동 백업' });
}

export async function resetInitialSeedStatus() {
  return window.ecorean?.bocDb?.resetInitialSeedStatus?.();
}

export async function seedInitialProcessMaster() {
  return window.ecorean?.bocDb?.seedInitialProcessMaster?.();
}

export async function seedInitialMaterialMaster() {
  return window.ecorean?.bocDb?.seedInitialMaterialMaster?.();
}

export async function seedInitialLaborMaster() {
  return window.ecorean?.bocDb?.seedInitialLaborMaster?.();
}

export async function seedInitialEquipmentMaster() {
  return window.ecorean?.bocDb?.seedInitialEquipmentMaster?.();
}

export async function seedInitialStandardEstimateItems() {
  return window.ecorean?.bocDb?.seedInitialStandardEstimateItems?.();
}

export async function seedBathroomDefaultPackage() {
  return window.ecorean?.bocDb?.seedBathroomDefaultPackage?.();
}

export async function seedKitchenDefaultPackage() {
  return window.ecorean?.bocDb?.seedKitchenDefaultPackage?.();
}

export async function seedFullRemodelingDefaultPackage() {
  return window.ecorean?.bocDb?.seedFullRemodelingDefaultPackage?.();
}
