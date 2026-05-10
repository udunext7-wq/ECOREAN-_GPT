export type AIVisualizationData = {
  briefs: Array<Record<string, unknown>>;
  activeBrief?: Record<string, unknown> | null;
  jobs: Array<Record<string, unknown>>;
  results: Array<Record<string, unknown>>;
  stats: Record<string, unknown>;
  comfyUi?: Record<string, unknown>;
  floorplanCenterData: Record<string, unknown>;
  emptyState: boolean;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('BOC database API is not available.');
  return bocDb;
}

export async function getAIVisualizationCenterData(payload: Record<string, unknown> = {}): Promise<AIVisualizationData> {
  const bocDb = api();
  if (!bocDb.getAIVisualizationCenterData) throw new Error('AI Visualization API is not available.');
  return bocDb.getAIVisualizationCenterData(payload) as Promise<AIVisualizationData>;
}

export async function createVisualizationBrief(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.createVisualizationBrief) throw new Error('Visualization brief API is not available.');
  return bocDb.createVisualizationBrief(payload);
}

export async function generateVisualizationPrompts(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generateVisualizationPrompts) throw new Error('Visualization prompt API is not available.');
  return bocDb.generateVisualizationPrompts(payload);
}

export async function queueVisualizationJob(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.queueVisualizationJob) throw new Error('Visualization queue API is not available.');
  return bocDb.queueVisualizationJob(payload);
}

export async function getComfyUiSettingsData(): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.getComfyUiSettingsData) throw new Error('ComfyUI settings API is not available.');
  return bocDb.getComfyUiSettingsData();
}

export async function saveComfyUiSettings(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveComfyUiSettings) throw new Error('ComfyUI settings save API is not available.');
  return bocDb.saveComfyUiSettings(payload);
}

export async function checkComfyUiHealth(): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.checkComfyUiHealth) throw new Error('ComfyUI health API is not available.');
  return bocDb.checkComfyUiHealth();
}

export async function saveComfyUiWorkflowPreset(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveComfyUiWorkflowPreset) throw new Error('ComfyUI workflow preset API is not available.');
  return bocDb.saveComfyUiWorkflowPreset(payload);
}

export async function runComfyUiGeneration(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.runComfyUiGeneration) throw new Error('ComfyUI generation API is not available.');
  return bocDb.runComfyUiGeneration(payload);
}

export async function refreshComfyUiJobStatus(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.refreshComfyUiJobStatus) throw new Error('ComfyUI refresh API is not available.');
  return bocDb.refreshComfyUiJobStatus(payload);
}

export async function attachVisualizationResult(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.attachVisualizationResult) throw new Error('Visualization result API is not available.');
  return bocDb.attachVisualizationResult(payload);
}

export async function decideVisualizationResult(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.decideVisualizationResult) throw new Error('Visualization review API is not available.');
  return bocDb.decideVisualizationResult(payload);
}
