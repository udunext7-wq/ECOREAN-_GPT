const { app, BrowserWindow, ipcMain } = require('electron');
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
  ipcMain.handle('boc:bathroom-estimate:calculate', (_event, payload) => sqliteService.calculateBathroomEstimatePreview(payload));
  ipcMain.handle('boc:bathroom-estimate:save', (_event, payload) => sqliteService.saveBathroomEstimate(payload));
  ipcMain.handle('boc:bathroom-estimate:export', (_event, payload) => sqliteService.exportBathroomEstimateDocument(payload));
  ipcMain.handle('boc:bathroom-contract:generate', (_event, payload) => sqliteService.generateBathroomContract(payload));
  ipcMain.handle('boc:bathroom-contract:export-pdf', (_event, payload) => sqliteService.exportBathroomContractPdf(payload));
  ipcMain.handle('boc:bathroom-schedule:generate', (_event, payload) => sqliteService.generateBathroomSchedule(payload));
  ipcMain.handle('boc:bathroom-purchase-order:generate', (_event, payload) => sqliteService.generateBathroomPurchaseOrder(payload));
  ipcMain.handle('boc:execution:readiness', (_event, payload) => sqliteService.getProjectExecutionReadiness(payload));
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
  ipcMain.handle('boc:permissions:get', () => sqliteService.getPermissionAdminData());
  ipcMain.handle('boc:portfolio:get', () => sqliteService.getPortfolioDashboardData());
  ipcMain.handle('boc:crew:get', () => sqliteService.getCrewDashboardData());
  ipcMain.handle('boc:finance:get', () => sqliteService.getCompanyFinanceDashboardData());
  ipcMain.handle('boc:sales:get', () => sqliteService.getSalesPipelineData());
  ipcMain.handle('boc:sales:lead:create', (_event, payload) => sqliteService.createLead(payload));
  ipcMain.handle('boc:sales:lead:update-status', (_event, payload) => sqliteService.updateLeadStatus(payload));
  ipcMain.handle('boc:profit:get', () => sqliteService.getProfitGenerationData());
  ipcMain.handle('boc:profit:override', (_event, payload) => sqliteService.overrideProfitDecision(payload));
  ipcMain.handle('boc:client-contract:get', () => sqliteService.getClientContractData());
  ipcMain.handle('boc:client-contract:approve', (_event, payload) => sqliteService.approveContract(payload));
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
