function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('데이터를 불러오지 못했습니다.');
  return bocDb;
}

export async function getLightBIMExecutionFeedbackSummary(payload: Record<string, unknown> = {}) {
  if (!window.ecorean?.bocDb?.getLightBIMExecutionFeedbackSummary) {
    return {
      items: [],
      summary: {
        totalCount: 0,
        matchedCount: 0,
        overUsedCount: 0,
        shortageCount: 0,
        wasteHighCount: 0,
        calibrationRequiredCount: 0
      },
      purchaseCalibrationRules: []
    };
  }
  return api().getLightBIMExecutionFeedbackSummary(payload);
}

export async function updateLightBIMActualUsedQuantity(payload: Record<string, unknown>) {
  return api().updateLightBIMActualUsedQuantity(payload);
}

export async function closeLightBIMExecutionFeedback(payload: Record<string, unknown>) {
  return api().closeLightBIMExecutionFeedback(payload);
}

export async function generateLightBIMQuantityCalibration(payload: Record<string, unknown>) {
  return api().generateLightBIMQuantityCalibration(payload);
}
