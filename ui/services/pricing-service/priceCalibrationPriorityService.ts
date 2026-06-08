export type PriceCalibrationPriorityData = {
  summary: Record<string, unknown>;
  impacts: Array<Record<string, unknown>>;
  priorityItems: Array<Record<string, unknown>>;
};

function bocDb() {
  return window.ecorean?.bocDb;
}

export async function getPriceCalibrationPrioritySummary(): Promise<PriceCalibrationPriorityData> {
  const fallback: PriceCalibrationPriorityData = { summary: {}, impacts: [], priorityItems: [] };
  return ((await bocDb()?.getPriceCalibrationPrioritySummary?.()) as PriceCalibrationPriorityData | undefined) || fallback;
}

export async function getPriorityItemsByEstimateType(estimateType: string) {
  return (await bocDb()?.getPriceCalibrationPriorityItems?.({ estimateType })) || [];
}

export async function createCalibrationTaskFromImpact(payload: Record<string, unknown>) {
  return bocDb()?.createCalibrationTaskFromImpact?.(payload);
}

export async function markCalibrationTaskReviewed(taskId: string, payload: Record<string, unknown> = {}) {
  return bocDb()?.markCalibrationTaskReviewed?.({ taskId, ...payload });
}

export async function linkCalibrationTaskToPriceQueue(taskId: string, queueId: string) {
  return bocDb()?.linkCalibrationTaskToPriceQueue?.({ taskId, queueId });
}

export async function createPriceCalibrationPriorityReport(payload: Record<string, unknown> = {}) {
  return bocDb()?.createPriceCalibrationPriorityReport?.(payload);
}

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  return `${Math.round(Number(value || 0) * 1000) / 10}%`;
}
