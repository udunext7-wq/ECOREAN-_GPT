type Payload = Record<string, unknown>;

function bocDb() {
  return window.ecorean?.bocDb;
}

export async function getLightBIMQuantityReviews(payload: Payload = {}) {
  return bocDb()?.getLightBIMQuantityReviews(payload) ?? { reviews: [], summary: {} };
}

export async function updateLightBIMQuantityReview(payload: Payload) {
  return bocDb()?.updateLightBIMQuantityReview(payload) ?? { ok: false, errorMessage: '데이터를 불러오지 못했습니다.' };
}

export async function confirmLightBIMQuantityReview(payload: Payload) {
  return bocDb()?.confirmLightBIMQuantityReview(payload) ?? { ok: false, errorMessage: '데이터를 불러오지 못했습니다.' };
}

export async function ignoreLightBIMQuantityReview(payload: Payload) {
  return bocDb()?.ignoreLightBIMQuantityReview(payload) ?? { ok: false, errorMessage: '데이터를 불러오지 못했습니다.' };
}

export async function resetLightBIMQuantityReviewToDefault(payload: Payload) {
  return bocDb()?.resetLightBIMQuantityReviewToDefault(payload) ?? { ok: false, errorMessage: '데이터를 불러오지 못했습니다.' };
}

export async function applyLightBIMQuantityReview(payload: Payload) {
  return bocDb()?.applyLightBIMQuantityReview(payload) ?? { ok: false, errorMessage: '데이터를 불러오지 못했습니다.' };
}

export async function recalculateEstimateAfterQuantityReview(payload: Payload) {
  return bocDb()?.recalculateEstimateAfterQuantityReview(payload) ?? { errorMessage: '파일을 생성하지 못했습니다.' };
}

export async function getLightBIMQuantityReviewSummary(payload: Payload = {}) {
  return bocDb()?.getLightBIMQuantityReviewSummary(payload) ?? {};
}
