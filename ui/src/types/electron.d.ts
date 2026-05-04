import type { DashboardData } from './dashboard';

type ApprovalDecisionPayload = {
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED';
  actor?: string;
  reasonKo?: string;
};

type ActionRecordPayload = {
  actionType: 'BLOCK' | 'ORDER' | 'CLAIM' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' | 'SAVE_ESTIMATE_DRAFT' | 'UPDATE_ESTIMATE_DRAFT' | 'CAPTURE_ACTUAL_COST' | 'CREATE_VENDOR_PRICE_PENDING' | 'VENDOR_PRICE_APPROVED' | 'VENDOR_PRICE_REJECTED' | 'VENDOR_PRICE_REQUEST_REVISION';
  actor?: string;
  projectId?: string;
  approvalId?: string | null;
  reasonKo?: string;
  payload?: Record<string, unknown>;
};

declare global {
  interface Window {
    ecorean?: {
      platform: string;
      appName: string;
      bocDb?: {
        getDashboardData: () => Promise<DashboardData>;
        decideApproval: (payload: ApprovalDecisionPayload) => Promise<DashboardData>;
        recordAction: (payload: ActionRecordPayload) => Promise<DashboardData>;
        saveEstimateDraft: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; savedDraft: Record<string, unknown> }>;
        loadEstimateDraftForProject: (payload: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
        updateEstimateDraft: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; savedDraft: Record<string, unknown> }>;
        calculateBathroomEstimate: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        saveBathroomEstimate: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        exportBathroomEstimate: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getProjectExecutionReadiness: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        transitionProjectToExecution: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; executionProject: Record<string, unknown> }>;
        getSiteOperationStatus: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        startSiteOperation: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; siteOperation: Record<string, unknown> }>;
        saveDailySiteReport: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; reportId: string }>;
        saveMaterialDeliveryCheck: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; deliveryCheckId: string }>;
        saveInspectionResult: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; inspectionResultId: string; blockedProcesses: string[] }>;
        createSiteIssue: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; siteIssueId: string }>;
        createChangeOrderRequest: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; changeOrderId: string }>;
        getProjectCompletionReadiness: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        completeProject: (payload: Record<string, unknown>) => Promise<{ dashboardData: DashboardData; completionReport: Record<string, unknown> }>;
        getCostCaptureDashboard: () => Promise<Record<string, unknown>>;
        saveActualCostEntry: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        evaluateCostCaptureReadiness: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getVendorPriceAdminData: () => Promise<Record<string, unknown>>;
        createVendorPriceCatalogEntry: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        decideVendorPriceApproval: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getPermissionAdminData: () => Promise<Record<string, unknown>>;
        getPortfolioDashboardData: () => Promise<Record<string, unknown>>;
        getCrewDashboardData: () => Promise<Record<string, unknown>>;
        getCompanyFinanceDashboardData: () => Promise<Record<string, unknown>>;
        getSalesPipelineData: () => Promise<Record<string, unknown>>;
        createLead: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        updateLeadStatus: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getProfitGenerationData: () => Promise<Record<string, unknown>>;
        overrideProfitDecision: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getClientContractData: () => Promise<Record<string, unknown>>;
        approveContract: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getBathroomPricingStandardDashboard: () => Promise<Record<string, unknown>>;
        evaluateBathroomQuote: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getCaseLibrarySnapshot: () => Promise<Record<string, unknown>>;
        runCaseLearningAnalysis: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getBackupStatus: () => Promise<Record<string, unknown>>;
        createFullBackup: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        createDatabaseBackup: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        previewRestore: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        restoreBackup: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        exportJson: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        exportExcel: (payload: Record<string, unknown>) => Promise<Record<string, unknown>>;
        getStats: () => Promise<Record<string, unknown>>;
      };
    };
  }
}

export {};
