export type FloorplanCenterData = {
  floorplans: Array<Record<string, unknown>>;
  activeFloorplan?: Record<string, unknown> | null;
  spaces: Array<Record<string, unknown>>;
  links: Array<Record<string, unknown>>;
  summaries: Array<Record<string, unknown>>;
  isometricPreview: { blocks: Array<Record<string, unknown>> };
  prompts: Array<Record<string, unknown>>;
  moodboards: Array<Record<string, unknown>>;
  emptyState: boolean;
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('BOC database API is not available.');
  return bocDb;
}

export async function getFloorplanCenterData(payload: Record<string, unknown> = {}): Promise<FloorplanCenterData> {
  const bocDb = api();
  if (!bocDb.getFloorplanCenterData) throw new Error('Floorplan Center API is not available.');
  return bocDb.getFloorplanCenterData(payload) as Promise<FloorplanCenterData>;
}

export async function saveFloorplanMetadata(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveFloorplanMetadata) throw new Error('Floorplan save API is not available.');
  return bocDb.saveFloorplanMetadata(payload);
}

export async function createFloorplanSpace(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.createFloorplanSpace) throw new Error('Floorplan space API is not available.');
  return bocDb.createFloorplanSpace(payload);
}

export async function linkEstimateItemToSpace(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.linkEstimateItemToSpace) throw new Error('Space estimate link API is not available.');
  return bocDb.linkEstimateItemToSpace(payload);
}

export async function saveMoodboardProfile(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.saveMoodboardProfile) throw new Error('Moodboard API is not available.');
  return bocDb.saveMoodboardProfile(payload);
}

export async function generatePerspectivePrompt(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const bocDb = api();
  if (!bocDb.generatePerspectivePrompt) throw new Error('Perspective prompt API is not available.');
  return bocDb.generatePerspectivePrompt(payload);
}
