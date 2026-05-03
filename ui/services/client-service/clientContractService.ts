export type ClientContractData = {
  snapshotDate: string;
  clients: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  approvalLogs: Array<Record<string, unknown>>;
};

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export async function loadClientContractData(): Promise<ClientContractData | null> {
  if (!window.ecorean?.bocDb?.getClientContractData) return null;
  return window.ecorean.bocDb.getClientContractData() as Promise<ClientContractData>;
}

export async function approveContractDocument(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.approveContract) return null;
  return window.ecorean.bocDb.approveContract(payload);
}
