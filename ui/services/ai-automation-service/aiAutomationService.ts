export type AIAutomationCenterData = {
  snapshotDate: string;
  summary: Record<string, unknown>;
  agents: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  approvalQueue: Array<Record<string, unknown>>;
  learningLogs: Array<Record<string, unknown>>;
  preventionRules: Array<Record<string, unknown>>;
  automationLogs: Array<Record<string, unknown>>;
  emptyState?: boolean;
  emptyMessageKo?: string;
};

function bridge() {
  const db = window.ecorean?.bocDb;
  if (!db) throw new Error('ECOREAN BOC database bridge is not available.');
  return db;
}

export async function getAIAutomationCenterData(runAgents = true): Promise<AIAutomationCenterData> {
  return (await bridge().getAIAutomationCenterData?.({ runAgents })) as AIAutomationCenterData;
}

export async function runAIAgentAutomation() {
  return bridge().runAIAgentAutomation?.({ actor: 'CEO' });
}

export async function decideAIAgentTask(taskId: string, decision: 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED', reasonKo: string) {
  return bridge().decideAIAgentTask?.({ taskId, decision, actor: 'CEO', reasonKo });
}
