export type CompletionReadiness = {
  projectId: string;
  canComplete: boolean;
  completionStatus: string;
  siteOperationId?: string;
  blockingReasonsKo: string[];
  warningsKo: string[];
  existingCompletionReportId?: string | null;
};

export type ActualCosts = {
  materialCost: number;
  laborCost: number;
  subcontractCost: number;
  equipmentCost: number;
  wasteCost: number;
  transportCost: number;
};

export type ProjectCompletionInput = {
  projectId: string;
  completionDate: string;
  finalScopeKo: string;
  customerFeedbackKo: string;
  finalContractAmount: number;
  finalAdditionalWorkAmount: number;
  actualCosts: ActualCosts;
  estimatedDurationDays: number;
  actualDurationDays: number;
  delayReasonsKo: string[];
  defects: string[];
  claims: string[];
  reworkRequired: boolean;
};

async function invokeAndRefresh<T>(promise: Promise<{ dashboardData: unknown } & T>): Promise<T> {
  const result = await promise;
  window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
  return result;
}

export async function loadProjectCompletionReadiness(projectId: string): Promise<CompletionReadiness | null> {
  if (!window.ecorean?.bocDb?.getProjectCompletionReadiness) return null;
  return window.ecorean.bocDb.getProjectCompletionReadiness({ projectId }) as Promise<CompletionReadiness>;
}

export async function completeProject(input: ProjectCompletionInput) {
  if (!window.ecorean?.bocDb?.completeProject) return null;
  return invokeAndRefresh(window.ecorean.bocDb.completeProject({ ...input, actor: 'CEO' }));
}

export function calculateCompletionPreview(input: Pick<ProjectCompletionInput, 'finalContractAmount' | 'finalAdditionalWorkAmount' | 'actualCosts' | 'estimatedDurationDays' | 'actualDurationDays'>) {
  const totalActualCost = Object.values(input.actualCosts).reduce((sum, value) => sum + Number(value || 0), 0);
  const totalRevenue = Number(input.finalContractAmount || 0) + Number(input.finalAdditionalWorkAmount || 0);
  const finalMarginAmount = totalRevenue - totalActualCost;
  const finalMarginRate = totalRevenue > 0 ? Number(((finalMarginAmount / totalRevenue) * 100).toFixed(2)) : 0;
  const costVariance = totalActualCost - Number(input.finalContractAmount || 0);
  const costVarianceRate = input.finalContractAmount > 0 ? Number(((costVariance / input.finalContractAmount) * 100).toFixed(2)) : 0;
  const durationVarianceDays = Number(input.actualDurationDays || 0) - Number(input.estimatedDurationDays || 0);

  return {
    totalActualCost,
    totalRevenue,
    finalMarginAmount,
    finalMarginRate,
    costVariance,
    costVarianceRate,
    durationVarianceDays
  };
}
