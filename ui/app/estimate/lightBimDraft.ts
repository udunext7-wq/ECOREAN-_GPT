type LightBIMDraft = {
  estimateType?: string;
  input?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  bannerKo?: string;
};

export type LightBIMSourceSummary = {
  floorAreaM2?: number;
  kitchenAreaM2?: number;
  wallAreaM2?: number;
  ceilingAreaM2?: number;
  perimeterM?: number;
  tileAreaM2?: number;
  estimatedKitchenLengthMm?: number;
  doorCount?: number;
  windowCount?: number;
  quantityBasis?: Record<string, unknown>;
  spaces?: Array<Record<string, unknown>>;
  processQuantities?: Record<string, unknown>;
  warnings?: Array<Record<string, unknown>>;
};

function readStoredDraft(): LightBIMDraft | null {
  try {
    const raw = window.sessionStorage.getItem('ecorean:lightbimDraft');
    return raw ? JSON.parse(raw) as LightBIMDraft : null;
  } catch {
    return null;
  }
}

export function readLightBIMInitialInput<T>(targetType: string, fallback: T): T {
  const draft = readStoredDraft();
  if (!draft?.input || draft.estimateType !== targetType) return fallback;
  return { ...fallback, ...draft.input } as T;
}

export function getLightBIMSource(input: unknown): LightBIMSourceSummary | null {
  const source = (input as { lightBimSource?: LightBIMSourceSummary }).lightBimSource;
  return source && typeof source === 'object' ? source : null;
}

export function formatLightBIMSource(source: LightBIMSourceSummary | null) {
  if (!source) return '';
  const floorArea = Number(source.floorAreaM2 ?? source.kitchenAreaM2 ?? 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const wallArea = Number(source.wallAreaM2 || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const ceilingArea = Number(source.ceilingAreaM2 || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const perimeter = Number(source.perimeterM || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
  const doorCount = Number(source.doorCount || 0).toLocaleString('ko-KR');
  const windowCount = Number(source.windowCount || 0).toLocaleString('ko-KR');
  const details = [
    `바닥 면적 ${floorArea}㎡`,
    `벽 면적 ${wallArea}㎡`,
    `천장 면적 ${ceilingArea}㎡`,
    `둘레 ${perimeter}m`,
    `문 ${doorCount}개`,
    `창 ${windowCount}개`
  ];
  if (source.tileAreaM2) details.push(`타일 면적 ${Number(source.tileAreaM2).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}㎡`);
  if (source.estimatedKitchenLengthMm) details.push(`예상 주방 길이 ${Number(source.estimatedKitchenLengthMm).toLocaleString('ko-KR')}mm`);
  if (source.spaces?.length) details.push(`공간 목록 ${source.spaces.length}개`);
  const processQuantities = source.processQuantities || {};
  const processLabels: Array<[string, string]> = [
    ['flooring_area_m2', '바닥'],
    ['wallpaper_area_m2', '도배'],
    ['painting_area_m2', '도장'],
    ['ceiling_area_m2', '천장'],
    ['tile_area_m2', '타일']
  ];
  const processSummary = processLabels
    .filter(([key]) => Number(processQuantities[key] || 0) > 0)
    .map(([key, label]) => `${label} ${Number(processQuantities[key] || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}㎡`);
  if (processSummary.length) details.push(`선택 공정 수량: ${processSummary.join(', ')}`);
  return details.join(' / ');
}

export function quantitySourceLabel(source?: string) {
  if (source === 'LIGHTBIM') return 'LightBIM 도면 수량';
  if (source === 'USER') return '사용자 수정';
  return '기본 산식';
}

export function formatQuantitySourceSummary(summary?: Record<string, unknown>) {
  if (!summary) return '';
  const lightBim = Number(summary.lightbim_bound_item_count || 0);
  const defaults = Number(summary.default_item_count || 0);
  const user = Number(summary.user_override_count || 0);
  return `LightBIM 적용 항목 ${lightBim}개 / 기본 산식 항목 ${defaults}개 / 사용자 수정 항목 ${user}개`;
}
