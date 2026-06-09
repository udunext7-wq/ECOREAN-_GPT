export type RecommendationConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_MATCH';

export type UnmatchedRecommendationData = {
  summary: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
};

function api() {
  return window.ecorean?.bocDb;
}

export async function getUnmatchedRecommendationData(filters: Record<string, unknown> = {}): Promise<UnmatchedRecommendationData> {
  const service = api();
  if (!service) return { summary: {}, rows: [] };
  const [summary, rows] = await Promise.all([
    service.getUnmatchedPriceRecommendationSummary(),
    service.listUnmatchedPriceImportRows(filters)
  ]);
  return { summary, rows };
}

export async function getRecommendationCandidates(importRowId: string, payload: Record<string, unknown> = {}) {
  return api()?.getUnmatchedPriceRecommendationCandidates({ importRowId, ...payload });
}

export async function createRecommendation(importRowId: string, payload: Record<string, unknown> = {}) {
  return api()?.createUnmatchedPriceRecommendation({ importRowId, ...payload });
}

export async function approveRecommendation(recommendationId: string, payload: Record<string, unknown> = {}) {
  return api()?.approveUnmatchedPriceRecommendation({ recommendationId, ...payload });
}

export async function rejectRecommendation(recommendationId: string, payload: Record<string, unknown> = {}) {
  return api()?.rejectUnmatchedPriceRecommendation({ recommendationId, ...payload });
}

export async function deferRecommendation(recommendationId: string, payload: Record<string, unknown> = {}) {
  return api()?.deferUnmatchedPriceRecommendation({ recommendationId, ...payload });
}

export async function linkRecommendationToQueue(recommendationId: string, queueId = '') {
  return api()?.linkUnmatchedPriceRecommendationToQueue({ recommendationId, queueId });
}

export async function createRecommendationReport(filters: Record<string, unknown> = {}) {
  return api()?.createUnmatchedPriceRecommendationReport({ filters });
}

export function formatWon(value: unknown) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

export function formatScore(value: unknown) {
  return `${Math.round(Number(value || 0))}점`;
}

export function formatRate(value: unknown) {
  if (value === null || value === undefined || value === '') return '신규 입력';
  return `${(Number(value) * 100).toFixed(1)}%`;
}
