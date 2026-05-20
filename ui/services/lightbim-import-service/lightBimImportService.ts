export type LightBIMImportResult = {
  ok?: boolean;
  importId?: string;
  errorMessage?: string;
  draft?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  estimateId?: string;
  estimateType?: string;
  targetView?: string;
  input?: Record<string, unknown>;
  preview?: Record<string, unknown>;
  bannerKo?: string;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('LightBIM import API is not available.');
  return bocDb;
}

export async function selectLightBIMJSONFile(): Promise<Record<string, unknown>> {
  if (!api().selectLightBIMJSONFile) throw new Error('LightBIM file picker API is not available.');
  return api().selectLightBIMJSONFile();
}

export async function importLightBIMJSON(filePath: string): Promise<LightBIMImportResult> {
  if (!api().importLightBIMJSON) throw new Error('LightBIM import API is not available.');
  return api().importLightBIMJSON({ filePath }) as Promise<LightBIMImportResult>;
}

export async function importLightBIMPayload(payload: Record<string, unknown>, sourceFileName = ''): Promise<LightBIMImportResult> {
  if (!api().importLightBIMPayload) throw new Error('LightBIM payload import API is not available.');
  return api().importLightBIMPayload({ payload, sourceFileName }) as Promise<LightBIMImportResult>;
}

export async function createEstimateFromLightBIM(payload: { importId?: string; payload?: Record<string, unknown>; estimateTypeOverride?: string }): Promise<LightBIMImportResult> {
  if (!api().createEstimateFromLightBIM) throw new Error('LightBIM estimate creation API is not available.');
  return api().createEstimateFromLightBIM(payload) as Promise<LightBIMImportResult>;
}

export function storeLightBIMDraft(result: LightBIMImportResult) {
  if (!result?.ok) return;
  const draft = {
    estimateId: result.estimateId,
    estimateType: result.estimateType,
    targetView: result.targetView,
    input: result.input,
    preview: result.preview,
    summary: result.summary,
    bannerKo: result.bannerKo || 'LightBIM 도면 데이터가 적용되었습니다.'
  };
  window.sessionStorage.setItem('ecorean:lightbimDraft', JSON.stringify(draft));
}
