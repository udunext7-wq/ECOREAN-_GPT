export type LeadStatus = 'NEW' | 'CONTACTED' | 'VISIT_SCHEDULED' | 'VISITED' | 'ESTIMATE_SENT' | 'NEGOTIATING' | 'WON' | 'LOST';

export type SalesLead = {
  leadId: string;
  customerNameKo: string;
  contactPhone: string;
  sourceChannel: string;
  consultationStatus: LeadStatus;
  statusLabelKo: string;
  interestedScope: string;
  interestedScopeKo: string;
  expectedBudget: number;
  consultationMemoKo: string;
  assignedOwner: string;
  nextActionKo: string;
  lostReasonRequired: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SalesPipelineData = {
  snapshotDate: string;
  metrics: {
    monthKey: string;
    totalLeads: number;
    contactedLeads: number;
    estimateSentLeads: number;
    wonLeads: number;
    lostLeads: number;
    contactConversionRate: number;
    estimateConversionRate: number;
    contractConversionRate: number;
    pipelineAmount: number;
    expectedWinAmount: number;
  };
  leads: SalesLead[];
  funnel: Array<{ status: LeadStatus; labelKo: string; count: number; amount: number }>;
  activities: Array<Record<string, unknown>>;
  estimateLinks: Array<Record<string, unknown>>;
  lostReasons: Array<Record<string, unknown>>;
  channelPerformance: Array<Record<string, unknown>>;
};

export function formatWon(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

export function formatPercent(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

export async function loadSalesPipelineData(): Promise<SalesPipelineData | null> {
  if (!window.ecorean?.bocDb?.getSalesPipelineData) return null;
  return window.ecorean.bocDb.getSalesPipelineData() as Promise<SalesPipelineData>;
}

export async function createSalesLead(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.createLead) return null;
  return window.ecorean.bocDb.createLead(payload);
}

export async function updateSalesLeadStatus(payload: Record<string, unknown>) {
  if (!window.ecorean?.bocDb?.updateLeadStatus) return null;
  return window.ecorean.bocDb.updateLeadStatus(payload);
}
