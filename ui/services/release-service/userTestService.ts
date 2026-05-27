export type UserTestStepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';
export type UserTestRunStatus = 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'BLOCKED';

export type UserTestStep = {
  id: string;
  runId: string;
  stepCode: string;
  stepOrder: number;
  moduleName: string;
  taskName: string;
  expectedResult: string;
  status: UserTestStepStatus;
  actualResult: string;
  bugSeverity: string;
  evidencePath: string;
  createdAt: string;
  updatedAt: string;
};

export type UserTestRun = {
  id: string;
  releaseVersion: string;
  testerName: string;
  testEnvironment: string;
  status: UserTestRunStatus;
  conclusion: string;
  notes: string;
  startedAt: string;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type UserTestCenterData = {
  releaseVersion: string;
  activeRun: UserTestRun | null;
  runs: UserTestRun[];
  steps: UserTestStep[];
  summary: {
    totalCount: number;
    passedCount: number;
    failedCount: number;
    blockedCount: number;
    pendingCount: number;
    progressRate: number;
  };
  documents: string[];
  sampleDataPath: string;
  emptyMessageKo: string;
  ok?: boolean;
  errorMessage?: string;
};

function bridge() {
  const db = window.ecorean?.bocDb;
  if (!db) {
    throw new Error('BOC DB bridge is not available.');
  }
  return db;
}

export async function getUserTestCenterData(payload: { runId?: string } = {}) {
  return (await bridge().getUserTestCenterData(payload)) as UserTestCenterData;
}

export async function createUserTestRun(payload: { testerName: string; testEnvironment: string; notes?: string }) {
  return (await bridge().createUserTestRun(payload)) as UserTestCenterData;
}

export async function updateUserTestStep(payload: {
  stepId: string;
  status: UserTestStepStatus;
  actualResult?: string;
  bugSeverity?: string;
  evidencePath?: string;
}) {
  return (await bridge().updateUserTestStep(payload)) as UserTestCenterData;
}

export async function completeUserTestRun(payload: { runId: string; conclusion?: string; notes?: string }) {
  return (await bridge().completeUserTestRun(payload)) as UserTestCenterData;
}
