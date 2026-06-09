const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { createSqliteService } = require('./services/sqliteService');
const { createBackupService } = require('./services/backupService');
const { createBackupRestoreService } = require('./services/backupRestoreService');
const { createInitialMasterDataService } = require('./services/initialMasterDataService');
const { createRealPriceCalibrationService } = require('./services/realPriceCalibrationService');
const { createPriceWorkbookImportService } = require('./services/priceWorkbookImportService');
const { createPriceCalibrationPriorityService } = require('./services/priceCalibrationPriorityService');
const { createRealPriceCalibrationWorkbenchService } = require('./services/realPriceCalibrationWorkbenchService');
const { createUnmatchedPriceRecommendationService } = require('./services/unmatchedPriceRecommendationService');
const { createOperationalOnboardingService } = require('./services/operationalOnboardingService');
const { createRealProjectIntakeService } = require('./services/realProjectIntakeService');

const isDev = process.env.ECOREAN_DEV_SERVER_URL;
const shouldOpenDevTools = process.env.ECOREAN_OPEN_DEVTOOLS === '1';
const isSmokeTest = process.env.ECOREAN_SMOKE_TEST === '1';
let sqliteService;
let backupService;
let backupRestoreService;
let initialMasterDataService;
let realPriceCalibrationService;
let priceWorkbookImportService;
let priceCalibrationPriorityService;
let realPriceCalibrationWorkbenchService;
let unmatchedPriceRecommendationService;
let operationalOnboardingService;
let realProjectIntakeService;

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
  ipcMain.handle('boc:lightbim:quantity-review:create', (_event, payload) => sqliteService.createLightBIMQuantityReviews(payload));
  ipcMain.handle('boc:lightbim:quantity-review:get', (_event, payload) => sqliteService.getLightBIMQuantityReviews(payload));
  ipcMain.handle('boc:lightbim:quantity-review:update', (_event, payload) => sqliteService.updateLightBIMQuantityReview(payload));
  ipcMain.handle('boc:lightbim:quantity-review:confirm', (_event, payload) => sqliteService.confirmLightBIMQuantityReview(payload));
  ipcMain.handle('boc:lightbim:quantity-review:ignore', (_event, payload) => sqliteService.ignoreLightBIMQuantityReview(payload));
  ipcMain.handle('boc:lightbim:quantity-review:reset-default', (_event, payload) => sqliteService.resetLightBIMQuantityReviewToDefault(payload));
  ipcMain.handle('boc:lightbim:quantity-review:apply-lightbim', (_event, payload) => sqliteService.applyLightBIMQuantityReview(payload));
  ipcMain.handle('boc:lightbim:quantity-review:recalculate', (_event, payload) => sqliteService.recalculateEstimateAfterQuantityReview(payload));
  ipcMain.handle('boc:lightbim:quantity-review:summary', (_event, payload) => sqliteService.getLightBIMQuantityReviewSummary(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:create', (_event, payload) => sqliteService.createLightBIMExecutionFeedback(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:get', (_event, payload) => sqliteService.getLightBIMExecutionFeedback(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:update-actual', (_event, payload) => sqliteService.updateLightBIMActualUsedQuantity(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:close', (_event, payload) => sqliteService.closeLightBIMExecutionFeedback(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:calibration', (_event, payload) => sqliteService.generateLightBIMQuantityCalibration(payload));
  ipcMain.handle('boc:lightbim:execution-feedback:summary', (_event, payload) => sqliteService.getLightBIMExecutionFeedbackSummary(payload));
  ipcMain.handle('boc:lightbim:traceability:create', (_event, payload) => sqliteService.createLightBIMTraceability(payload));
  ipcMain.handle('boc:lightbim:traceability:get', (_event, payload) => sqliteService.getLightBIMTraceability(payload));
  ipcMain.handle('boc:lightbim:traceability:estimate', (_event, payload) => sqliteService.getLightBIMTraceabilityByEstimate(payload));
  ipcMain.handle('boc:lightbim:traceability:space', (_event, payload) => sqliteService.getLightBIMTraceabilityBySpace(payload));
  ipcMain.handle('boc:lightbim:traceability:summary', (_event, payload) => sqliteService.getLightBIMTraceabilitySummary(payload));
  ipcMain.handle('boc:lightbim:traceability:receiving', (_event, payload) => sqliteService.updateLightBIMTraceabilityFromReceiving(payload));
  ipcMain.handle('boc:lightbim:traceability:feedback', (_event, payload) => sqliteService.updateLightBIMTraceabilityFromFeedback(payload));
  ipcMain.handle('boc:lightbim:space-map:get', (_event, payload) => sqliteService.getLightBIMSpaceMapData(payload));
  ipcMain.handle('boc:lightbim:space-map:estimate', (_event, payload) => sqliteService.getLightBIMSpaceMapDataByEstimate(payload));
  ipcMain.handle('boc:lightbim:space-map:space', (_event, payload) => sqliteService.getLightBIMSpaceTraceSummary(payload));
  ipcMain.handle('boc:lightbim:space-map:summaries', (_event, payload) => sqliteService.getAllLightBIMSpaceTraceSummaries(payload));
  ipcMain.handle('boc:lightbim:customer-map:get', (_event, payload) => sqliteService.getLightBIMCustomerProposalMapData(payload));
  ipcMain.handle('boc:lightbim:customer-map:estimate', (_event, payload) => sqliteService.getLightBIMCustomerProposalMapByEstimate(payload));
  ipcMain.handle('boc:lightbim:customer-map:project', (_event, payload) => sqliteService.getLightBIMCustomerProposalMapByProject(payload));
  ipcMain.handle('boc:lightbim:customer-map:summary', (_event, payload) => sqliteService.generateLightBIMCustomerMapSummary(payload));
  ipcMain.handle('boc:user-test:get', (_event, payload = {}) => sqliteService.getUserTestCenterData(payload));
  ipcMain.handle('boc:user-test:create-run', (_event, payload = {}) => sqliteService.createUserTestRun(payload));
  ipcMain.handle('boc:user-test:update-step', (_event, payload) => sqliteService.updateUserTestStep(payload));
  ipcMain.handle('boc:user-test:complete-run', (_event, payload) => sqliteService.completeUserTestRun(payload));
  ipcMain.handle('boc:backup-restore:paths', () => backupRestoreService.getDataPaths());
  ipcMain.handle('boc:backup-restore:status', () => backupRestoreService.getBackupStatus());
  ipcMain.handle('boc:backup-restore:db', (_event, payload = {}) => backupRestoreService.createDatabaseBackup(payload));
  ipcMain.handle('boc:backup-restore:export', (_event, payload = {}) => backupRestoreService.createExportFolderBackup(payload));
  ipcMain.handle('boc:backup-restore:full', (_event, payload = {}) => backupRestoreService.createFullUserDataBackup(payload));
  ipcMain.handle('boc:backup-restore:pre-update', (_event, payload = {}) => backupRestoreService.createPreUpdateBackup(payload));
  ipcMain.handle('boc:backup-restore:list', () => backupRestoreService.listBackups());
  ipcMain.handle('boc:backup-restore:verify', (_event, payload = {}) => backupRestoreService.verifyBackup(payload));
  ipcMain.handle('boc:backup-restore:validate-db', () => backupRestoreService.validateCurrentDatabase());
  ipcMain.handle('boc:backup-restore:restore-plan', (_event, payload = {}) => backupRestoreService.prepareRestorePlan(payload));
  ipcMain.handle('boc:backup-restore:restore', (_event, payload = {}) => backupRestoreService.restoreFromBackup(payload));
  ipcMain.handle('boc:initial-master-data:status', () => initialMasterDataService.getInitialMasterDataStatus());
  ipcMain.handle('boc:initial-master-data:seed-process', (_event, payload = {}) => initialMasterDataService.seedInitialProcessMaster(payload));
  ipcMain.handle('boc:initial-master-data:seed-material', (_event, payload = {}) => initialMasterDataService.seedInitialMaterialMaster(payload));
  ipcMain.handle('boc:initial-master-data:seed-labor', (_event, payload = {}) => initialMasterDataService.seedInitialLaborMaster(payload));
  ipcMain.handle('boc:initial-master-data:seed-equipment', (_event, payload = {}) => initialMasterDataService.seedInitialEquipmentMaster(payload));
  ipcMain.handle('boc:initial-master-data:seed-standard-items', (_event, payload = {}) => initialMasterDataService.seedInitialStandardEstimateItems(payload));
  ipcMain.handle('boc:initial-master-data:seed-bathroom-package', (_event, payload = {}) => initialMasterDataService.seedBathroomDefaultPackage(payload));
  ipcMain.handle('boc:initial-master-data:seed-kitchen-package', (_event, payload = {}) => initialMasterDataService.seedKitchenDefaultPackage(payload));
  ipcMain.handle('boc:initial-master-data:seed-full-package', (_event, payload = {}) => initialMasterDataService.seedFullRemodelingDefaultPackage(payload));
  ipcMain.handle('boc:initial-master-data:validate', () => initialMasterDataService.validateInitialMasterData());
  ipcMain.handle('boc:initial-master-data:backup', (_event, payload = {}) => initialMasterDataService.createInitialMasterDataBackup(payload));
  ipcMain.handle('boc:initial-master-data:reset-logs', () => initialMasterDataService.resetInitialSeedStatus());
  ipcMain.handle('boc:initial-master-data:run-setup', (_event, payload = {}) => initialMasterDataService.runInitialMasterDataSetup(payload));
  ipcMain.handle('boc:real-price:needs-update', () => realPriceCalibrationService.getNeedsUpdatePriceItems());
  ipcMain.handle('boc:real-price:priority-list', () => realPriceCalibrationService.getPriceUpdatePriorityList());
  ipcMain.handle('boc:real-price:vendor-quote', (_event, payload = {}) => realPriceCalibrationService.createVendorQuotePriceUpdate(payload));
  ipcMain.handle('boc:real-price:actual-purchase', (_event, payload = {}) => realPriceCalibrationService.createActualPurchasePriceUpdate(payload));
  ipcMain.handle('boc:real-price:labor-rate', (_event, payload = {}) => realPriceCalibrationService.createLaborRateUpdate(payload));
  ipcMain.handle('boc:real-price:approve', (_event, payload = {}) => realPriceCalibrationService.approvePriceUpdate(payload.queueId, payload.note));
  ipcMain.handle('boc:real-price:reject', (_event, payload = {}) => realPriceCalibrationService.rejectPriceUpdate(payload.queueId, payload.reason));
  ipcMain.handle('boc:real-price:apply', (_event, payload = {}) => realPriceCalibrationService.applyApprovedPriceUpdate(payload.queueId, payload));
  ipcMain.handle('boc:real-price:apply-bulk', (_event, payload = {}) => realPriceCalibrationService.applyApprovedPriceUpdates(payload.queueIds || []));
  ipcMain.handle('boc:real-price:history', () => realPriceCalibrationService.getPriceUpdateHistory());
  ipcMain.handle('boc:real-price:queue', () => realPriceCalibrationService.getQueueItems());
  ipcMain.handle('boc:real-price:summary', () => realPriceCalibrationService.getRealPriceCalibrationSummary());
  ipcMain.handle('boc:real-price:report', () => realPriceCalibrationService.createPriceCalibrationReport());
  ipcMain.handle('boc:price-workbook:select-file', async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(owner, {
      title: '단가표 파일 선택',
      properties: ['openFile'],
      filters: [
        { name: 'CSV 단가표', extensions: ['csv'] },
        { name: 'Excel 단가표', extensions: ['xlsx', 'xls'] }
      ]
    });
    if (result.canceled || !result.filePaths.length) return { canceled: true };
    return { canceled: false, filePath: result.filePaths[0] };
  });
  ipcMain.handle('boc:price-workbook:preview', (_event, payload = {}) => priceWorkbookImportService.previewPriceImport(payload.filePath, payload.importType));
  ipcMain.handle('boc:price-workbook:match', (_event, payload = {}) => priceWorkbookImportService.matchImportedRowsToMasterData(payload.importId || payload.rows || payload));
  ipcMain.handle('boc:price-workbook:create-queue', (_event, payload = {}) => priceWorkbookImportService.createPriceUpdateQueueFromImport(payload));
  ipcMain.handle('boc:price-workbook:search-candidates', (_event, payload = {}) => priceWorkbookImportService.searchPriceImportMatchCandidates(payload.importType, payload.keyword, payload.filters || payload));
  ipcMain.handle('boc:price-workbook:manual-match', (_event, payload = {}) => priceWorkbookImportService.manuallyMatchImportRow(payload));
  ipcMain.handle('boc:price-workbook:clear-match', (_event, payload = {}) => priceWorkbookImportService.clearImportRowMatch(payload));
  ipcMain.handle('boc:price-workbook:exclude-row', (_event, payload = {}) => priceWorkbookImportService.excludeImportRow(payload));
  ipcMain.handle('boc:price-workbook:unmatched', (_event, payload = {}) => priceWorkbookImportService.getUnmatchedImportRows(payload.importId || payload));
  ipcMain.handle('boc:price-workbook:multiple', (_event, payload = {}) => priceWorkbookImportService.getMultipleMatchImportRows(payload.importId || payload));
  ipcMain.handle('boc:price-workbook:readiness', (_event, payload = {}) => priceWorkbookImportService.getImportQueueReadiness(payload.importId || payload));
  ipcMain.handle('boc:price-workbook:history', () => priceWorkbookImportService.getPriceImportHistory());
  ipcMain.handle('boc:price-workbook:detail', (_event, payload = {}) => priceWorkbookImportService.getPriceImportDetail(payload.importId || payload));
  ipcMain.handle('boc:price-workbook:report', (_event, payload = {}) => priceWorkbookImportService.createImportReport(payload.importId || payload));
  ipcMain.handle('boc:price-calibration-priority:summary', () => priceCalibrationPriorityService.getPriceCalibrationPrioritySummary());
  ipcMain.handle('boc:price-calibration-priority:items', (_event, payload = {}) => priceCalibrationPriorityService.getPriorityItemsByEstimateType(payload.estimateType || payload.estimate_type || payload));
  ipcMain.handle('boc:price-calibration-priority:create-task', (_event, payload = {}) => priceCalibrationPriorityService.createCalibrationTaskFromImpact(payload));
  ipcMain.handle('boc:price-calibration-priority:review-task', (_event, payload = {}) => priceCalibrationPriorityService.markCalibrationTaskReviewed(payload.taskId || payload.task_id, payload));
  ipcMain.handle('boc:price-calibration-priority:link-queue', (_event, payload = {}) => priceCalibrationPriorityService.linkCalibrationTaskToPriceQueue(payload.taskId || payload.task_id, payload.queueId || payload.queue_id));
  ipcMain.handle('boc:price-calibration-priority:report', (_event, payload = {}) => priceCalibrationPriorityService.createPriceCalibrationPriorityReport(payload));
  ipcMain.handle('boc:real-price-workbench:summary', () => realPriceCalibrationWorkbenchService.getCalibrationWorkbenchSummary());
  ipcMain.handle('boc:real-price-workbench:list', (_event, payload = {}) => realPriceCalibrationWorkbenchService.listCalibrationQueueItems(payload));
  ipcMain.handle('boc:real-price-workbench:detail', (_event, payload = {}) => realPriceCalibrationWorkbenchService.getCalibrationQueueItemDetail(payload.queueId || payload.id || payload));
  ipcMain.handle('boc:real-price-workbench:approve', (_event, payload = {}) => realPriceCalibrationWorkbenchService.approveCalibrationQueueItem(payload.queueId || payload.id, payload));
  ipcMain.handle('boc:real-price-workbench:reject', (_event, payload = {}) => realPriceCalibrationWorkbenchService.rejectCalibrationQueueItem(payload.queueId || payload.id, payload));
  ipcMain.handle('boc:real-price-workbench:defer', (_event, payload = {}) => realPriceCalibrationWorkbenchService.deferCalibrationQueueItem(payload.queueId || payload.id, payload));
  ipcMain.handle('boc:real-price-workbench:apply', (_event, payload = {}) => realPriceCalibrationWorkbenchService.applyApprovedCalibrationWithBackup(payload.queueId || payload.id, payload));
  ipcMain.handle('boc:real-price-workbench:history', (_event, payload = {}) => realPriceCalibrationWorkbenchService.getCalibrationHistory(payload.itemId || payload.queueId || payload.id || payload));
  ipcMain.handle('boc:real-price-workbench:report', (_event, payload = {}) => realPriceCalibrationWorkbenchService.createCalibrationWorkbenchReport(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:summary', () => unmatchedPriceRecommendationService.getUnmatchedPriceRecommendationSummary());
  ipcMain.handle('boc:unmatched-price-recommendation:list', (_event, payload = {}) => unmatchedPriceRecommendationService.listUnmatchedImportRows(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:candidates', (_event, payload = {}) => unmatchedPriceRecommendationService.getRecommendationCandidates(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:create', (_event, payload = {}) => unmatchedPriceRecommendationService.createRecommendationForRow(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:approve', (_event, payload = {}) => unmatchedPriceRecommendationService.approveRecommendation(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:reject', (_event, payload = {}) => unmatchedPriceRecommendationService.rejectRecommendation(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:defer', (_event, payload = {}) => unmatchedPriceRecommendationService.deferRecommendation(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:link-queue', (_event, payload = {}) => unmatchedPriceRecommendationService.linkRecommendationToPriceQueue(payload));
  ipcMain.handle('boc:unmatched-price-recommendation:report', (_event, payload = {}) => unmatchedPriceRecommendationService.createUnmatchedPriceRecommendationReport(payload));
  ipcMain.handle('boc:operational-onboarding:create-run', (_event, payload = {}) => operationalOnboardingService.createOperationalOnboardingRun(payload));
  ipcMain.handle('boc:operational-onboarding:runs', () => operationalOnboardingService.getOperationalOnboardingRuns());
  ipcMain.handle('boc:operational-onboarding:get-run', (_event, payload = {}) => operationalOnboardingService.getOperationalOnboardingRun(payload.runId || payload.id || payload));
  ipcMain.handle('boc:operational-onboarding:update-step', (_event, payload = {}) => operationalOnboardingService.updateOperationalOnboardingStep(payload));
  ipcMain.handle('boc:operational-onboarding:create-issue', (_event, payload = {}) => operationalOnboardingService.createOperationalOnboardingIssue(payload));
  ipcMain.handle('boc:operational-onboarding:summary', (_event, payload = {}) => operationalOnboardingService.getOperationalOnboardingSummary(payload.runId || payload.id || payload));
  ipcMain.handle('boc:operational-onboarding:complete', (_event, payload = {}) => operationalOnboardingService.completeOperationalOnboardingRun(payload.runId || payload.id || payload));
  ipcMain.handle('boc:operational-onboarding:report', (_event, payload = {}) => operationalOnboardingService.generateOperationalOnboardingReport(payload.runId || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:create', (_event, payload = {}) => realProjectIntakeService.createRealProjectIntake(payload));
  ipcMain.handle('boc:real-project-intake:update', (_event, payload = {}) => realProjectIntakeService.updateRealProjectIntake(payload));
  ipcMain.handle('boc:real-project-intake:get', (_event, payload = {}) => realProjectIntakeService.getRealProjectIntake(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:list', () => realProjectIntakeService.listRealProjectIntakes());
  ipcMain.handle('boc:real-project-intake:validate', (_event, payload = {}) => realProjectIntakeService.validateRealProjectIntake(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:connect-lightbim', (_event, payload = {}) => realProjectIntakeService.connectLightBIMImport(payload));
  ipcMain.handle('boc:real-project-intake:price-readiness', (_event, payload = {}) => realProjectIntakeService.checkPriceProfileReadiness(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:generate-estimate', (_event, payload = {}) => realProjectIntakeService.generateEstimateFromIntake(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:run-pce', (_event, payload = {}) => realProjectIntakeService.runPCEForIntake(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:customer-safety', (_event, payload = {}) => realProjectIntakeService.runCustomerSafetyCheckForIntake(payload));
  ipcMain.handle('boc:real-project-intake:report', (_event, payload = {}) => realProjectIntakeService.createIntakeReport(payload.intakeId || payload.intake_id || payload.id || payload));
  ipcMain.handle('boc:real-project-intake:create-issue', (_event, payload = {}) => realProjectIntakeService.createIntakeIssue(payload));
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
  backupRestoreService = createBackupRestoreService({ app, sqliteService });
  initialMasterDataService = createInitialMasterDataService({ sqliteService, backupRestoreService });
  realPriceCalibrationService = createRealPriceCalibrationService({ sqliteService, backupRestoreService });
  priceWorkbookImportService = createPriceWorkbookImportService({ sqliteService });
  priceCalibrationPriorityService = createPriceCalibrationPriorityService({ sqliteService });
  realPriceCalibrationWorkbenchService = createRealPriceCalibrationWorkbenchService({
    sqliteService,
    realPriceCalibrationService,
    priceCalibrationPriorityService
  });
  unmatchedPriceRecommendationService = createUnmatchedPriceRecommendationService({
    sqliteService,
    priceWorkbookImportService,
    realPriceCalibrationWorkbenchService,
    priceCalibrationPriorityService
  });
  operationalOnboardingService = createOperationalOnboardingService({ sqliteService });
  realProjectIntakeService = createRealProjectIntakeService({ sqliteService });
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
