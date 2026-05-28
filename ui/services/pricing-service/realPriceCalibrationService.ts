export type RealPriceCalibrationData = {
  summary: Record<string, unknown>;
  needsUpdate: Record<string, unknown>;
  priority: Record<string, unknown>;
  queue: Array<Record<string, unknown>>;
  history: Array<Record<string, unknown>>;
};

export async function getRealPriceCalibrationData(): Promise<RealPriceCalibrationData> {
  const [summary, needsUpdate, priority, queue, history] = await Promise.all([
    window.ecorean?.bocDb?.getRealPriceCalibrationSummary?.(),
    window.ecorean?.bocDb?.getRealPriceNeedsUpdateItems?.(),
    window.ecorean?.bocDb?.getRealPricePriorityList?.(),
    window.ecorean?.bocDb?.getRealPriceUpdateQueue?.(),
    window.ecorean?.bocDb?.getRealPriceUpdateHistory?.()
  ]);
  return {
    summary: summary || {},
    needsUpdate: needsUpdate || { items: [], grouped: {}, count: 0 },
    priority: priority || { high: [], medium: [], low: [], items: [] },
    queue: queue || [],
    history: history || []
  };
}

export async function createVendorQuotePriceUpdate(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createVendorQuotePriceUpdate?.(payload);
}

export async function createActualPurchasePriceUpdate(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createActualPurchasePriceUpdate?.(payload);
}

export async function createLaborRateUpdate(payload: Record<string, unknown>) {
  return window.ecorean?.bocDb?.createLaborRateUpdate?.(payload);
}

export async function approveRealPriceUpdate(queueId: string, note = '대표 단가 보정 승인') {
  return window.ecorean?.bocDb?.approveRealPriceUpdate?.({ queueId, note });
}

export async function rejectRealPriceUpdate(queueId: string, reason = '단가 보정 반려') {
  return window.ecorean?.bocDb?.rejectRealPriceUpdate?.({ queueId, reason });
}

export async function applyRealPriceUpdate(queueId: string) {
  return window.ecorean?.bocDb?.applyRealPriceUpdate?.({ queueId });
}

export async function createRealPriceCalibrationReport() {
  return window.ecorean?.bocDb?.createRealPriceCalibrationReport?.();
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  if (value === null || value === undefined || value === '') return '신규 입력';
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
