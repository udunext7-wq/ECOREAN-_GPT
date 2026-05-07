import type { BathroomEstimateInput, BathroomEstimatePreview } from '../bathroom-estimate-service/bathroomEstimateService';

export type AIEstimateIntelligence = {
  estimateId: string;
  preview?: BathroomEstimatePreview;
  recommendations: Array<Record<string, unknown>>;
  warnings: Array<Record<string, unknown>>;
  riskScore: {
    severity: string;
    marginRisk: Record<string, unknown>;
    defectRisk: Record<string, unknown>;
    costLeakRisk: Record<string, unknown>;
  };
  suggestedSchedule: Record<string, unknown>;
  suggestedTemplate?: Record<string, unknown> | null;
  appliedCalibrationRules: Array<Record<string, unknown>>;
  recommendedProcesses: string[];
  recommendedMaterials: string[];
};

function api() {
  const bocDb = window.ecorean?.bocDb;
  if (!bocDb?.getAiEstimateIntelligence) throw new Error('AI Estimate Intelligence API is not available.');
  return bocDb;
}

export async function loadAiEstimateIntelligence(
  input: BathroomEstimateInput,
  estimateId?: string,
  persist = true
): Promise<AIEstimateIntelligence> {
  return api().getAiEstimateIntelligence({ input, estimateId, persist }) as Promise<AIEstimateIntelligence>;
}

export async function decideAiRecommendation(
  estimateId: string,
  recommendationId: string,
  actionType: 'APPLY' | 'IGNORE' | 'DETAIL',
  reasonKo = ''
): Promise<Record<string, unknown>> {
  return api().decideAiRecommendationAction({ estimateId, recommendationId, actionType, actor: 'CEO', reasonKo });
}
