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
  doorCount?: number;
  windowCount?: number;
  spaces?: Array<Record<string, unknown>>;
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
  return `바닥 면적 ${floorArea}㎡ / 벽 면적 ${wallArea}㎡ / 천장 면적 ${ceilingArea}㎡ / 둘레 ${perimeter}m / 문 ${doorCount}개 / 창 ${windowCount}개`;
}
