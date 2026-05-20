const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { createSqliteService } = require('./services/sqliteService');
const { createBackupService } = require('./services/backupService');

const isDev = process.env.ECOREAN_DEV_SERVER_URL;
const shouldOpenDevTools = process.env.ECOREAN_OPEN_DEVTOOLS === '1';
const isSmokeTest = process.env.ECOREAN_SMOKE_TEST === '1';
let sqliteService;
let backupService;

function registerIpcHandlers() {
  ipcMain.handle('boc:dashboard:get', () => sqliteService.getDashboardData());
  ipcMain.handle('boc:approval:decide', (_event, payload) => sqliteService.decideApproval(payload));
  ipcMain.handle('boc:action:record', (_event, payload) => sqliteService.recordAction(payload));
  ipcMain.handle('boc:estimate-draft:save', (_event, payload) => sqliteService.saveEstimateDraft(payload));
  ipcMain.handle('boc:estimate-draft:load', (_event, payload) => sqliteService.loadEstimateDraftForProject(payload));
  ipcMain.handle('boc:estimate-draft:update', (_event, payload) => sqliteService.updateEstimateDraft(payload));
  ipcMain.handle('boc:lightbim:select-json', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: 'LightBIM JSON 파일 선택',
      properties: ['openFile'],
      filters: [{ name: 'LightBIM JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, filePath: result.filePaths[0] };
  });
  ipcMain.handle('boc:lightbim:import-file', (_event, payload) => sqliteService.importLightBIMJSONFile(payload));
  ipcMain.handle('boc:lightbim:import-payload', (_event, payload) => sqliteService.importLightBIMPayload(payload));
  ipcMain.handle('boc:lightbim:create-estimate', (_event, payload) => sqliteService.createEstimateFromLightBIM(payload));
  ipcMain.handle('boc:bathroom-estimate:calculate', (_event, payload) => sqliteService.calculateBathroomEstimatePreview(payload));
  ipcMain.handle('boc:bathroom-estimate:save', (_event, payload) => sqliteService.saveBathroomEstimate(payload));
  ipcMain.handle('boc:bathroom-estimate:export', (_event, payload) => sqliteService.exportBathroomEstimateDocument(payload));
  ipcMain.handle('boc:kitchen-estimate:calculate', (_event, payload) => sqliteService.calculateKitchenEstimatePreview(payload));
  ipcMain.handle('boc:kitchen-estimate:save', (_event, payload) => sqliteService.saveKitchenEstimate(payload));
  ipcMain.handle('boc:kitchen-estimate:export', (_event, payload) => sqliteService.exportKitchenEstimateDocument(payload));
  ipcMain.handle('boc:full-remodeling-estimate:calculate', (_event, payload) => sqliteService.calculateFullRemodelingEstimatePreview(payload));
  ipcMain.handle('boc:full-remodeling-estimate:save', (_event, payload) => sqliteService.saveFullRemodelingEstimate(payload));
  ipcMain.handle('boc:full-remodeling-estimate:export', (_event, payload) => sqliteService.exportFullRemodelingEstimateDocument(payload));
  ipcMain.handle('boc:ai-estimate:intelligence', (_event, payload) => sqliteService.getAiEstimateIntelligence(payload));
  ipcMain.handle('boc:ai-estimate:action', (_event, payload) => sqliteService.decideAiRecommendationAction(payload));
  ipcMain.handle('boc:bathroom-contract:generate', (_event, payload) => sqliteService.generateBathroomContract(payload));
  ipcMain.handle('boc:bathroom-contract:export-pdf', (_event, payload) => sqliteService.exportBathroomContractPdf(payload));
  ipcMain.handle('boc:bathroom-schedule:generate', (_event, payload) => sqliteService.generateBathroomSchedule(payload));
  ipcMain.handle('boc:bathroom-purchase-order:generate', (_event, payload) => sqliteService.generateBathroomPurchaseOrder(payload));
  ipcMain.handle('boc:kitchen-contract:generate', (_event, payload) => sqliteService.generateKitchenContract(payload));
  ipcMain.handle('boc:kitchen-schedule:generate', (_event, payload) => sqliteService.generateKitchenSchedule(payload));
  ipcMain.handle('boc:kitchen-purchase-order:generate', (_event, payload) => sqliteService.generateKitchenPurchaseOrder(payload));
  ipcMain.handle('boc:full-remodeling-contract:generate', (_event, payload) => sqliteService.generateFullRemodelingContract(payload));
  ipcMain.handle('boc:full-remodeling-schedule:generate', (_event, payload) => sqliteService.generateFullRemodelingSchedule(payload));
  ipcMain.handle('boc:full-remodeling-purchase-order:generate', (_event, payload) => sqliteService.generateFullRemodelingPurchaseOrder(payload));
  ipcMain.handle('boc:floorplan:get', (_event, payload = {}) => sqliteService.getFloorplanCenterData(payload));
  ipcMain.handle('boc:floorplan:save', (_event, payload) => sqliteService.saveFloorplanMetadata(payload));
  ipcMain.handle('boc:floorplan:space:create', (_event, payload) => sqliteService.createFloorplanSpace(payload));
  ipcMain.handle('boc:floorplan:space-link:create', (_event, payload) => sqliteService.linkEstimateItemToSpace(payload));
  ipcMain.handle('boc:floorplan:moodboard:save', (_event, payload) => sqliteService.saveMoodboardProfile(payload));
  ipcMain.handle('boc:floorplan:prompt:generate', (_event, payload) => sqliteService.generatePerspectivePrompt(payload));
  ipcMain.handle('boc:visualization:get', (_event, payload = {}) => sqliteService.getAIVisualizationCenterData(payload));
  ipcMain.handle('boc:visualization:brief:create', (_event, payload) => sqliteService.createVisualizationBrief(payload));
  ipcMain.handle('boc:visualization:prompts:generate', (_event, payload) => sqliteService.generateVisualizationPrompts(payload));
  ipcMain.handle('boc:visualization:job:queue', (_event, payload) => sqliteService.queueVisualizationJob(payload));
  ipcMain.handle('boc:visualization:comfyui:get', () => sqliteService.getComfyUiSettingsData());
  ipcMain.handle('boc:visualization:comfyui:settings:save', (_event, payload) => sqliteService.saveComfyUiSettings(payload));
  ipcMain.handle('boc:visualization:comfyui:health', () => sqliteService.checkComfyUiHealth());
  ipcMain.handle('boc:visualization:comfyui:preset:save', (_event, payload) => sqliteService.saveComfyUiWorkflowPreset(payload));
  ipcMain.handle('boc:visualization:comfyui:run', (_event, payload) => sqliteService.runComfyUiGeneration(payload));
  ipcMain.handle('boc:visualization:comfyui:refresh', (_event, payload) => sqliteService.refreshComfyUiJobStatus(payload));
  ipcMain.handle('boc:visualization:result:attach', (_event, payload) => sqliteService.attachVisualizationResult(payload));
  ipcMain.handle('boc:visualization:result:decide', (_event, payload) => sqliteService.decideVisualizationResult(payload));
  ipcMain.handle('boc:board:get', (_event, payload = {}) => sqliteService.getBoardGenerationCenterData(payload));
  ipcMain.handle('boc:board:create', (_event, payload) => sqliteService.createDesignBoard(payload));
  ipcMain.handle('boc:board:export-pdf', (_event, payload) => sqliteService.exportDesignBoardPdf(payload));
  ipcMain.handle('boc:board:portfolio-candidate', (_event, payload) => sqliteService.createPortfolioCandidate(payload));
  ipcMain.handle('boc:execution:readiness', (_event, payload) => sqliteService.getProjectExecutionReadiness(payload));
  ipcMain.handle('boc:field-mobile:get', (_event, payload = {}) => sqliteService.getFieldMobileCenterData(payload));
  ipcMain.handle('boc:field-mobile:attendance:check-in', (_event, payload) => sqliteService.saveFieldAttendanceCheckIn(payload));
  ipcMain.handle('boc:field-mobile:attendance:check-out', (_event, payload) => sqliteService.saveFieldAttendanceCheckOut(payload));
  ipcMain.handle('boc:field-mobile:daily-report:create', (_event, payload) => sqliteService.createFieldDailyReport(payload));
  ipcMain.handle('boc:field-mobile:media:save', (_event, payload) => sqliteService.saveSiteMediaFile(payload));
  ipcMain.handle('boc:field-mobile:material-receiving:create', (_event, payload) => sqliteService.createFieldMaterialReceiving(payload));
  ipcMain.handle('boc:field-mobile:inspection:save', (_event, payload) => sqliteService.saveFieldInspectionResult(payload));
  ipcMain.handle('boc:field-mobile:change-order:create', (_event, payload) => sqliteService.createFieldChangeOrderRequest(payload));
  ipcMain.handle('boc:field-mobile:defect:create', (_event, payload) => sqliteService.createFieldDefectReport(payload));
  ipcMain.handle('boc:field-mobile:signature:save', (_event, payload) => sqliteService.saveFieldSignature(payload));
  ipcMain.handle('boc:field-mobile:risk:create', (_event, payload) => sqliteService.createFieldRiskReport(payload));
  ipcMain.handle('boc:execution:transition', (_event, payload) => sqliteService.transitionProjectToExecution(payload));
  ipcMain.handle('boc:site:status', (_event, payload) => sqliteService.getSiteOperationStatus(payload));
  ipcMain.handle('boc:site:start', (_event, payload) => sqliteService.startSiteOperation(payload));
  ipcMain.handle('boc:site:daily-report:save', (_event, payload) => sqliteService.saveDailySiteReport(payload));
  ipcMain.handle('boc:site:material-delivery:save', (_event, payload) => sqliteService.saveMaterialDeliveryCheck(payload));
  ipcMain.handle('boc:site:inspection:save', (_event, payload) => sqliteService.saveInspectionResult(payload));
  ipcMain.handle('boc:site:issue:create', (_event, payload) => sqliteService.createSiteIssue(payload));
  ipcMain.handle('boc:site:change-order:create', (_event, payload) => sqliteService.createChangeOrderRequest(payload));
  ipcMain.handle('boc:execution:daily-report:create', (_event, payload) => sqliteService.createDailySiteReportFromSchedule(payload));
  ipcMain.handle('boc:execution:attendance:create', (_event, payload) => sqliteService.createCrewAttendanceReport(payload));
  ipcMain.handle('boc:execution:material-receiving:create', (_event, payload) => sqliteService.createMaterialReceivingLog(payload));
  ipcMain.handle('boc:execution:inspection:create', (_event, payload) => sqliteService.createInspectionChecklistFromSchedule(payload));
  ipcMain.handle('boc:execution:inspection:result', (_event, payload) => sqliteService.saveInspectionChecklistResults(payload));
  ipcMain.handle('boc:execution:change-order:create', (_event, payload) => sqliteService.createExecutionChangeOrder(payload));
  ipcMain.handle('boc:execution:change-order:approve', (_event, payload) => sqliteService.approveExecutionChangeOrder(payload));
  ipcMain.handle('boc:execution:defect:create', (_event, payload) => sqliteService.createDefectReport(payload));
  ipcMain.handle('boc:completion:readiness', (_event, payload) => sqliteService.getProjectCompletionReadiness(payload));
  ipcMain.handle('boc:completion:complete', (_event, payload) => sqliteService.completeProject(payload));
  ipcMain.handle('boc:cost-capture:get', () => sqliteService.getActualCostCaptureDashboard());
  ipcMain.handle('boc:cost-capture:save', (_event, payload) => sqliteService.saveActualCostEntry(payload));
  ipcMain.handle('boc:cost-capture:evaluate', (_event, payload) => sqliteService.evaluateCostCaptureReadiness(payload));
  ipcMain.handle('boc:vendor-price:get', () => sqliteService.getVendorPriceAdminData());
  ipcMain.handle('boc:vendor-price:create', (_event, payload) => sqliteService.createVendorPriceCatalogEntry(payload));
  ipcMain.handle('boc:vendor-price:decide', (_event, payload) => sqliteService.decideVendorPriceApproval(payload));
  ipcMain.handle('boc:vendor-intelligence:get', () => sqliteService.getVendorPriceIntelligenceData());
  ipcMain.handle('boc:vendor-intelligence:history:save', (_event, payload) => sqliteService.saveMaterialPriceHistory(payload));
  ipcMain.handle('boc:vendor-intelligence:csv-import', (_event, payload) => sqliteService.importMaterialPriceHistoryCsv(payload));
  ipcMain.handle('boc:vendor-intelligence:recommendation:decide', (_event, payload) => sqliteService.decideVendorPriceRecommendation(payload));
  ipcMain.handle('boc:vendor-intelligence:vendor:recommend', (_event, payload) => sqliteService.getVendorSelectionRecommendation(payload));
  ipcMain.handle('boc:master-data:get', (_event, payload = {}) => sqliteService.getMasterDataCenterData(payload));
  ipcMain.handle('boc:master-data:create', (_event, payload) => sqliteService.createMasterDataItem(payload));
  ipcMain.handle('boc:master-data:validate', (_event, payload = {}) => sqliteService.runMasterDataValidation(payload));
  ipcMain.handle('boc:master-data:import-csv', (_event, payload) => sqliteService.importMasterDataCsv(payload));
  ipcMain.handle('boc:master-data:export-csv', (_event, payload) => sqliteService.exportMasterDataCsv(payload));
  ipcMain.handle('boc:franchise:get', (_event, payload = {}) => sqliteService.getFranchiseCenterData(payload));
  ipcMain.handle('boc:franchise:branch:create', (_event, payload) => sqliteService.createFranchiseBranch(payload));
  ipcMain.handle('boc:franchise:package:publish', (_event, payload) => sqliteService.publishFranchiseDistributionPackage(payload));
  ipcMain.handle('boc:franchise:package:apply', (_event, payload) => sqliteService.applyFranchisePackageToBranch(payload));
  ipcMain.handle('boc:franchise:policy:create', (_event, payload) => sqliteService.createBranchProfitPolicy(payload));
  ipcMain.handle('boc:franchise:fee:calculate', (_event, payload) => sqliteService.calculateFranchiseFeeRecord(payload));
  ipcMain.handle('boc:franchise:fee:paid', (_event, payload) => sqliteService.markFranchiseFeePaid(payload));
  ipcMain.handle('boc:franchise:template:create', (_event, payload) => sqliteService.createFranchiseReplicationTemplate(payload));
  ipcMain.handle('boc:franchise:template:apply', (_event, payload) => sqliteService.applyReplicationTemplateToBranch(payload));
  ipcMain.handle('boc:analytics:get', () => sqliteService.getAnalyticsCenterData());
  ipcMain.handle('boc:analytics:export', (_event, payload = {}) => sqliteService.exportAnalyticsReport(payload));
  ipcMain.handle('boc:ai-automation:get', (_event, payload = {}) => sqliteService.getAIAutomationCenterData(payload));
  ipcMain.handle('boc:ai-automation:run', (_event, payload = {}) => sqliteService.runAIAgentAutomation(payload));
  ipcMain.handle('boc:ai-automation:decide', (_event, payload) => sqliteService.decideAIAgentTask(payload));
  ipcMain.handle('boc:permissions:get', () => sqliteService.getPermissionAdminData());
  ipcMain.handle('boc:portfolio:get', () => sqliteService.getPortfolioDashboardData());
  ipcMain.handle('boc:crew:get', () => sqliteService.getCrewDashboardData());
  ipcMain.handle('boc:finance:get', () => sqliteService.getCompanyFinanceDashboardData());
  ipcMain.handle('boc:sales:get', () => sqliteService.getSalesPipelineData());
  ipcMain.handle('boc:sales:lead:create', (_event, payload) => sqliteService.createLead(payload));
  ipcMain.handle('boc:sales:lead:update-status', (_event, payload) => sqliteService.updateLeadStatus(payload));
  ipcMain.handle('boc:profit:get', () => sqliteService.getProfitGenerationData());
  ipcMain.handle('boc:profit:override', (_event, payload) => sqliteService.overrideProfitDecision(payload));
  ipcMain.handle('boc:ceo-control-tower:get', () => sqliteService.getCeoControlTowerData());
  ipcMain.handle('boc:ceo-control-tower:decide', (_event, payload) => sqliteService.decideCeoApprovalRequest(payload));
  ipcMain.handle('boc:client-contract:get', () => sqliteService.getClientContractData());
  ipcMain.handle('boc:client-contract:approve', (_event, payload) => sqliteService.approveContract(payload));
  ipcMain.handle('boc:client-portal:get', (_event, payload = {}) => sqliteService.getClientPortalData(payload));
  ipcMain.handle('boc:client-portal:token', (_event, payload = {}) => sqliteService.generateClientPortalToken(payload));
  ipcMain.handle('boc:client-portal:contract-confirm', (_event, payload = {}) => sqliteService.confirmClientContract(payload));
  ipcMain.handle('boc:client-portal:change-order-response', (_event, payload = {}) => sqliteService.respondClientChangeOrder(payload));
  ipcMain.handle('boc:client-portal:defect-request', (_event, payload = {}) => sqliteService.createClientDefectRequest(payload));
  ipcMain.handle('boc:client-portal:completion-confirm', (_event, payload = {}) => sqliteService.saveClientCompletionConfirmation(payload));
  ipcMain.handle('boc:communication:get', () => sqliteService.getCommunicationCenterData());
  ipcMain.handle('boc:communication:generate', (_event, payload) => sqliteService.generateCommunicationMessage(payload));
  ipcMain.handle('boc:communication:mark-sent', (_event, payload) => sqliteService.markCommunicationMessageSent(payload));
  ipcMain.handle('boc:communication:cancel', (_event, payload) => sqliteService.cancelCommunicationMessage(payload));
  ipcMain.handle('boc:payment:get', () => sqliteService.getPaymentCenterData());
  ipcMain.handle('boc:payment:customer-received', (_event, payload) => sqliteService.markCustomerPaymentReceived(payload));
  ipcMain.handle('boc:payment:vendor-paid', (_event, payload) => sqliteService.markVendorPaymentPaid(payload));
  ipcMain.handle('boc:payment:request-message', (_event, payload) => sqliteService.createPaymentRequestMessage(payload));
  ipcMain.handle('boc:payment:request-vendor-approval', (_event, payload) => sqliteService.requestVendorPaymentApproval(payload));
  ipcMain.handle('boc:closing:get', (_event, payload = {}) => sqliteService.getProjectClosingCenterData(payload));
  ipcMain.handle('boc:closing:snapshot', (_event, payload) => sqliteService.createProjectClosingSnapshot(payload));
  ipcMain.handle('boc:closing:finalize', (_event, payload) => sqliteService.finalizeProjectClosing(payload));
  ipcMain.handle('boc:closing:template', (_event, payload) => sqliteService.saveHighMarginTemplateFromClosing(payload));
  ipcMain.handle('boc:calibration:get', (_event, payload = {}) => sqliteService.getProjectCalibrationCenterData(payload));
  ipcMain.handle('boc:calibration:snapshot', (_event, payload) => sqliteService.createProjectCalibrationSnapshot(payload));
  ipcMain.handle('boc:calibration:decide', (_event, payload) => sqliteService.decideCalibrationRule(payload));
  ipcMain.handle('boc:bathroom-pricing:get', () => sqliteService.getBathroomPricingStandardDashboard());
  ipcMain.handle('boc:bathroom-pricing:evaluate', (_event, payload) => sqliteService.evaluateBathroomQuote(payload));
  ipcMain.handle('boc:case-library:get', () => sqliteService.getCaseLibrarySnapshot());
  ipcMain.handle('boc:case-library:analyze', (_event, payload) => sqliteService.runCaseLearningAnalysis(payload));
  ipcMain.handle('boc:backup:status', () => backupService.getBackupStatus());
  ipcMain.handle('boc:backup:full', (_event, payload = {}) => {
    sqliteService.assertUserPermission({ actor: payload.actor || 'CEO', permissionKey: 'BACKUP_CREATE', actionType: 'BACKUP_CREATE', payload });
    return backupService.createFullBackup(payload);
  });
  ipcMain.handle('boc:backup:database', (_event, payload = {}) => {
    sqliteService.assertUserPermission({ actor: payload.actor || 'CEO', permissionKey: 'BACKUP_CREATE', actionType: 'BACKUP_CREATE_DATABASE', payload });
    return backupService.createDatabaseBackup(payload);
  });
  ipcMain.handle('boc:backup:restore-preview', (_event, payload) => backupService.previewRestore(payload));
  ipcMain.handle('boc:backup:restore', (_event, payload = {}) => {
    sqliteService.assertUserPermission({ actor: payload.actor || 'CEO', permissionKey: 'RESTORE_EXECUTE', actionType: 'RESTORE_EXECUTE', payload });
    return backupService.restoreBackup(payload);
  });
  ipcMain.handle('boc:export:json', (_event, payload = {}) => {
    sqliteService.assertUserPermission({ actor: payload.actor || 'CEO', permissionKey: 'EXPORT_DATA', actionType: 'EXPORT_JSON', payload });
    return backupService.exportJson(payload);
  });
  ipcMain.handle('boc:export:excel', (_event, payload = {}) => {
    sqliteService.assertUserPermission({ actor: payload.actor || 'CEO', permissionKey: 'EXPORT_DATA', actionType: 'EXPORT_EXCEL', payload });
    return backupService.exportExcel(payload);
  });
  ipcMain.handle('boc:db:stats', () => sqliteService.getDbStats());
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 980,
    minWidth: 1280,
    minHeight: 820,
    backgroundColor: '#08090b',
    title: 'ECOREAN BOC CEO Dashboard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('BOC dashboard load failed:', {
      errorCode,
      errorDescription,
      validatedURL
    });

    if (isSmokeTest) {
      app.exit(1);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('BOC dashboard loaded');

    if (isSmokeTest) {
      setTimeout(() => app.quit(), 500);
    }
  });

  if (shouldOpenDevTools) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  sqliteService = createSqliteService({ app });
  backupService = createBackupService({ dbPaths: sqliteService.dbPaths, databaseDir: path.dirname(sqliteService.dbPaths.project) });
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
