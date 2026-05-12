export type FieldMobileData = {
  roleModes: string[];
  roleMode: string;
  todaySite: Record<string, unknown>;
  todayReports: Array<Record<string, unknown>>;
  todayAttendance: Array<Record<string, unknown>>;
  materialReceiving: Array<Record<string, unknown>>;
  inspections: Array<Record<string, unknown>>;
  mediaFiles: Array<Record<string, unknown>>;
  signatures: Array<Record<string, unknown>>;
  riskReports: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
  emptyState: boolean;
};

const emptyData: FieldMobileData = {
  roleModes: ['현장 작업자', '팀장', '마스터', '관리자'],
  roleMode: '팀장',
  todaySite: {},
  todayReports: [],
  todayAttendance: [],
  materialReceiving: [],
  inspections: [],
  mediaFiles: [],
  signatures: [],
  riskReports: [],
  summary: {},
  emptyState: true
};

async function invokeAndRefresh<T>(promise: Promise<Record<string, unknown>>): Promise<T> {
  const result = await promise;
  if (result.dashboardData) {
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
  }
  return result as T;
}

export async function getFieldMobileCenterData(payload: Record<string, unknown> = {}): Promise<FieldMobileData> {
  const result = await window.ecorean?.bocDb?.getFieldMobileCenterData?.(payload);
  return (result as FieldMobileData) ?? emptyData;
}

export async function saveFieldAttendanceCheckIn(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.saveFieldAttendanceCheckIn?.(payload) ?? Promise.resolve({}));
}

export async function saveFieldAttendanceCheckOut(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.saveFieldAttendanceCheckOut?.(payload) ?? Promise.resolve({}));
}

export async function createFieldDailyReport(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.createFieldDailyReport?.(payload) ?? Promise.resolve({}));
}

export async function saveSiteMediaFile(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.saveSiteMediaFile?.(payload) ?? Promise.resolve({}));
}

export async function createFieldMaterialReceiving(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.createFieldMaterialReceiving?.(payload) ?? Promise.resolve({}));
}

export async function saveFieldInspectionResult(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.saveFieldInspectionResult?.(payload) ?? Promise.resolve({}));
}

export async function createFieldChangeOrderRequest(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.createFieldChangeOrderRequest?.(payload) ?? Promise.resolve({}));
}

export async function createFieldDefectReport(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.createFieldDefectReport?.(payload) ?? Promise.resolve({}));
}

export async function saveFieldSignature(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.saveFieldSignature?.(payload) ?? Promise.resolve({}));
}

export async function createFieldRiskReport(payload: Record<string, unknown>) {
  return invokeAndRefresh(window.ecorean?.bocDb?.createFieldRiskReport?.(payload) ?? Promise.resolve({}));
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}
