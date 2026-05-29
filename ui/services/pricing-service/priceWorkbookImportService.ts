export type PriceWorkbookImportType =
  | 'MATERIAL_PRICE_LIST'
  | 'VENDOR_QUOTE'
  | 'ACTUAL_PURCHASE'
  | 'LABOR_RATE'
  | 'EQUIPMENT_PRICE'
  | 'STANDARD_ITEM_PRICE';

export const priceWorkbookImportTypes: Array<{ value: PriceWorkbookImportType; label: string }> = [
  { value: 'MATERIAL_PRICE_LIST', label: '자재 단가표' },
  { value: 'VENDOR_QUOTE', label: '업체 견적 단가표' },
  { value: 'ACTUAL_PURCHASE', label: '실제 매입 단가표' },
  { value: 'LABOR_RATE', label: '노무 단가표' },
  { value: 'EQUIPMENT_PRICE', label: '장비 단가표' },
  { value: 'STANDARD_ITEM_PRICE', label: '표준 견적 품목 단가표' }
];

function bocDb() {
  return window.ecorean?.bocDb;
}

export async function selectPriceWorkbookFile() {
  return bocDb()?.selectPriceWorkbookFile?.() || { canceled: true };
}

export async function previewPriceWorkbookImport(payload: { filePath: string; importType: PriceWorkbookImportType }) {
  return bocDb()?.previewPriceWorkbookImport?.(payload) || { rows: [], summary: {}, columnMapping: {} };
}

export async function matchPriceWorkbookImportRows(importId: string) {
  return bocDb()?.matchPriceWorkbookImportRows?.({ importId }) || null;
}

export async function createPriceUpdateQueueFromWorkbook(payload: { importId: string; selectedRowIds?: Array<string | number>; selectedRowIndexes?: Array<string | number> }) {
  return bocDb()?.createPriceUpdateQueueFromWorkbook?.(payload) || { createdCount: 0 };
}

export async function searchPriceImportMatchCandidates(payload: { importType: PriceWorkbookImportType; keyword: string; filters?: Record<string, unknown> }) {
  return bocDb()?.searchPriceImportMatchCandidates?.(payload) || { candidates: [] };
}

export async function manuallyMatchPriceImportRow(payload: { importRowId: string | number; targetType: string; targetId: string | number; note?: string }) {
  return bocDb()?.manuallyMatchPriceImportRow?.(payload) || null;
}

export async function clearPriceImportRowMatch(payload: { importRowId: string | number }) {
  return bocDb()?.clearPriceImportRowMatch?.(payload) || null;
}

export async function excludePriceImportRow(payload: { importRowId: string | number; reason?: string }) {
  return bocDb()?.excludePriceImportRow?.(payload) || null;
}

export async function getUnmatchedPriceImportRows(importId: string) {
  return bocDb()?.getUnmatchedPriceImportRows?.({ importId }) || [];
}

export async function getMultipleMatchPriceImportRows(importId: string) {
  return bocDb()?.getMultipleMatchPriceImportRows?.({ importId }) || [];
}

export async function getPriceImportQueueReadiness(importId: string) {
  return bocDb()?.getPriceImportQueueReadiness?.({ importId }) || null;
}

export async function getPriceWorkbookImportHistory() {
  return bocDb()?.getPriceWorkbookImportHistory?.() || [];
}

export async function getPriceWorkbookImportDetail(importId: string) {
  return bocDb()?.getPriceWorkbookImportDetail?.({ importId }) || null;
}

export async function createPriceWorkbookImportReport(importId: string) {
  return bocDb()?.createPriceWorkbookImportReport?.({ importId }) || null;
}

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatRate(value: unknown) {
  if (value === null || value === undefined || value === '') return '신규 입력';
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}
