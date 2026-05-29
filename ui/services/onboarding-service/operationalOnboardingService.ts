export type OnboardingStepStatus = 'NOT_STARTED' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'BLOCKED';

export type OnboardingIssueSeverity = 'S1' | 'S2' | 'S3' | 'S4';

export type OperationalOnboardingRun = {
  id: string;
  version: string;
  run_name: string;
  status: string;
  steps: Array<Record<string, unknown>>;
  issues: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
};

function bocDb() {
  return window.ecorean?.bocDb;
}

export async function createOperationalOnboardingRun(payload: { version?: string; runName?: string } = {}) {
  return bocDb()?.createOperationalOnboardingRun?.(payload) || null;
}

export async function getOperationalOnboardingRuns() {
  return bocDb()?.getOperationalOnboardingRuns?.() || [];
}

export async function getOperationalOnboardingRun(runId: string) {
  return bocDb()?.getOperationalOnboardingRun?.({ runId }) || null;
}

export async function updateOperationalOnboardingStep(payload: {
  runId: string;
  stepKey: string;
  status: OnboardingStepStatus;
  actualResult?: string;
  issueSeverity?: OnboardingIssueSeverity;
  note?: string;
}) {
  return bocDb()?.updateOperationalOnboardingStep?.(payload) || null;
}

export async function createOperationalOnboardingIssue(payload: {
  runId: string;
  stepKey: string;
  severity: OnboardingIssueSeverity;
  screen?: string;
  description: string;
  reproductionSteps?: string;
  decision?: string;
  targetVersion?: string;
  note?: string;
}) {
  return bocDb()?.createOperationalOnboardingIssue?.(payload) || null;
}

export async function getOperationalOnboardingSummary(runId: string) {
  return bocDb()?.getOperationalOnboardingSummary?.({ runId }) || null;
}

export async function completeOperationalOnboardingRun(runId: string) {
  return bocDb()?.completeOperationalOnboardingRun?.({ runId }) || null;
}

export async function generateOperationalOnboardingReport(runId: string) {
  return bocDb()?.generateOperationalOnboardingReport?.({ runId }) || null;
}
