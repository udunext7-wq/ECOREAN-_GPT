export type ExecutionDocumentPreview = {
  documentType: string;
  displayNameKo: string;
  documentStatus: string;
  warningsKo: string[];
  payload: Record<string, unknown>;
};

export type ExecutionReadiness = {
  projectId: string;
  finalEstimateId?: string;
  canTransition: boolean;
  executionStatus: string;
  blockingReasonsKo: string[];
  warningReasonsKo: string[];
  documents: ExecutionDocumentPreview[];
};

export type ExecutionTransitionResult = {
  dashboardData: unknown;
  executionProject: {
    executionProjectId: string;
    projectId: string;
    finalEstimateId: string;
    executionStatus: 'EXECUTION_READY';
    preliminaryExecutionWarning: boolean;
    warningReasonsKo: string[];
    documentCount: number;
  };
};

export async function loadExecutionReadiness(projectId: string): Promise<ExecutionReadiness | null> {
  if (window.ecorean?.bocDb?.getProjectExecutionReadiness) {
    return window.ecorean.bocDb.getProjectExecutionReadiness({ projectId }) as Promise<ExecutionReadiness>;
  }

  return null;
}

export async function transitionProjectToExecution(projectId: string): Promise<ExecutionTransitionResult | null> {
  if (window.ecorean?.bocDb?.transitionProjectToExecution) {
    const result = await (window.ecorean.bocDb.transitionProjectToExecution({ projectId, actor: 'CEO' }) as Promise<ExecutionTransitionResult>);
    window.dispatchEvent(new CustomEvent('ecorean:dashboard-data-updated', { detail: result.dashboardData }));
    return result;
  }

  return null;
}
