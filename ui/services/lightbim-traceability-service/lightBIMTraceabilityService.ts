function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('추적 데이터를 불러오지 못했습니다.');
  return bocDb;
}

export async function getLightBIMTraceabilitySummary(payload: Record<string, unknown> = {}) {
  if (!window.ecorean?.bocDb?.getLightBIMTraceabilitySummary) {
    return {
      items: [],
      spaces: [],
      summary: {
        totalCount: 0,
        linkedCount: 0,
        partialCount: 0,
        missingCount: 0,
        reviewRequiredCount: 0,
        varianceCount: 0
      }
    };
  }
  return api().getLightBIMTraceabilitySummary(payload);
}

export async function updateLightBIMTraceabilityFromFeedback(payload: Record<string, unknown> = {}) {
  return api().updateLightBIMTraceabilityFromFeedback(payload);
}
