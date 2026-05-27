function emptyMapData() {
  return {
    project: null,
    spaces: [],
    walls: [],
    openings: [],
    traceSummaries: [],
    warnings: [],
    statusKo: '표시할 공간 정보가 없습니다.'
  };
}

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('도면 정보를 불러오지 못했습니다.');
  return bocDb;
}

export async function getLightBIMSpaceMapData(payload: Record<string, unknown> = {}) {
  if (!window.ecorean?.bocDb?.getLightBIMSpaceMapData) return emptyMapData();
  return api().getLightBIMSpaceMapData(payload);
}

export async function getLightBIMSpaceMapDataByEstimate(payload: Record<string, unknown> = {}) {
  if (!window.ecorean?.bocDb?.getLightBIMSpaceMapDataByEstimate) return emptyMapData();
  return api().getLightBIMSpaceMapDataByEstimate(payload);
}
