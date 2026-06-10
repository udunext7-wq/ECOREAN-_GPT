function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb) throw new Error('ECOREAN BOC database bridge is not available.');
  return bocDb;
}

export async function getRecommendationScoringData(filters: Record<string, unknown> = {}) {
  const [summary, rules] = await Promise.all([
    api().getRecommendationScoringSummary(),
    api().listRecommendationScoringRules(filters)
  ]);
  return { summary, rules };
}

export function saveRecommendationScoringRule(payload: Record<string, unknown>) {
  return api().saveRecommendationScoringRule(payload);
}

export function setRecommendationScoringRuleStatus(ruleId: string, status: string) {
  return api().setRecommendationScoringRuleStatus({ ruleId, status });
}

export function createRecommendationScoringReport() {
  return api().createRecommendationScoringReport();
}
