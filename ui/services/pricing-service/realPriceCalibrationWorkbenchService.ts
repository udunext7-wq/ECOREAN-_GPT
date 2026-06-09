export type CalibrationWorkbenchData = {
  summary: Record<string, unknown>;
  queueItems: Array<Record<string, unknown>>;
};

function api() {
  return window.ecorean?.bocDb;
}

export function formatWon(value: unknown) {
  const number = Number(value || 0);
  return `${Math.round(number).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export async function getCalibrationWorkbenchData(filters: Record<string, unknown> = {}): Promise<CalibrationWorkbenchData> {
  const service = api();
  if (!service) return { summary: {}, queueItems: [] };
  const [summary, queueItems] = await Promise.all([
    service.getCalibrationWorkbenchSummary(),
    service.listCalibrationQueueItems(filters)
  ]);
  return { summary, queueItems };
}

export async function getCalibrationQueueItemDetail(queueId: string) {
  return api()?.getCalibrationQueueItemDetail({ queueId });
}

export async function approveCalibrationQueueItem(queueId: string, payload: Record<string, unknown> = {}) {
  return api()?.approveCalibrationQueueItem({ queueId, ...payload });
}

export async function rejectCalibrationQueueItem(queueId: string, payload: Record<string, unknown> = {}) {
  return api()?.rejectCalibrationQueueItem({ queueId, ...payload });
}

export async function deferCalibrationQueueItem(queueId: string, payload: Record<string, unknown> = {}) {
  return api()?.deferCalibrationQueueItem({ queueId, ...payload });
}

export async function applyApprovedCalibrationWithBackup(queueId: string, payload: Record<string, unknown> = {}) {
  return api()?.applyApprovedCalibrationWithBackup({ queueId, ...payload });
}

export async function createCalibrationWorkbenchReport(payload: Record<string, unknown> = {}) {
  return api()?.createCalibrationWorkbenchReport(payload);
}
