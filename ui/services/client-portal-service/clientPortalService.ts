export type ClientPortalData = {
  snapshotDate: string;
  projectSummary: Record<string, unknown>;
  estimateView: Record<string, unknown>;
  contractView: Record<string, unknown>;
  scheduleView: Record<string, unknown>;
  progressView: Record<string, unknown>;
  paymentView: Record<string, unknown>;
  changeOrderView: Record<string, unknown>;
  inspectionView: Record<string, unknown>;
  defectView: Record<string, unknown>;
  completionView: Record<string, unknown>;
  tokenView: Record<string, unknown>;
  proposalMap?: Record<string, unknown>;
  customerSafe?: boolean;
};

const emptyData: ClientPortalData = {
  snapshotDate: '',
  projectSummary: {},
  estimateView: {},
  contractView: {},
  scheduleView: {},
  progressView: { reports: [], emptyMessageKo: '아직 공유할 공사 진행 기록이 없습니다.' },
  paymentView: { payments: [], emptyMessageKo: '결제 일정 데이터가 없습니다.' },
  changeOrderView: { changeOrders: [], emptyMessageKo: '승인 대기 추가공사가 없습니다.' },
  inspectionView: { inspectionResults: [], emptyMessageKo: '공유된 검수 결과가 없습니다.' },
  defectView: { defectRequests: [], emptyMessageKo: '접수된 하자 요청이 없습니다.' },
  completionView: { confirmations: [], emptyMessageKo: '완료 확인 기록이 없습니다.' },
  tokenView: { tokens: [], shareStatusKo: '고객 공유 링크 준비 중' },
  proposalMap: {},
  customerSafe: true
};

function bridge() {
  const db = window.ecorean?.bocDb;
  if (!db) throw new Error('ECOREAN BOC database bridge is not available.');
  return db;
}

export async function getClientPortalData(payload: Record<string, unknown> = {}): Promise<ClientPortalData> {
  const result = await bridge().getClientPortalData?.(payload);
  return (result as ClientPortalData) ?? emptyData;
}

export async function generateClientPortalToken(payload: Record<string, unknown> = {}) {
  return bridge().generateClientPortalToken?.(payload);
}

export async function confirmClientContract(payload: Record<string, unknown> = {}) {
  return bridge().confirmClientContract?.(payload);
}

export async function respondClientChangeOrder(payload: Record<string, unknown>) {
  return bridge().respondClientChangeOrder?.(payload);
}

export async function createClientDefectRequest(payload: Record<string, unknown>) {
  return bridge().createClientDefectRequest?.(payload);
}

export async function saveClientCompletionConfirmation(payload: Record<string, unknown>) {
  return bridge().saveClientCompletionConfirmation?.(payload);
}
