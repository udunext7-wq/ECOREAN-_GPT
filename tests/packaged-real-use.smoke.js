'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const root = path.resolve(__dirname, '..');
const packagedExe = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const userDataPath = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'ecorean-boc-electron');
const fixturePath = path.join(root, 'tests', 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json');
const mainSource = fs.readFileSync(path.join(root, 'electron', 'main.js'), 'utf8');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function createPackagedService() {
  return createSqliteService({
    app: {
      isPackaged: true,
      getPath(name) {
        if (name === 'userData') return userDataPath;
        return userDataPath;
      }
    }
  });
}

function assertSafePayload(value, label) {
  const serialized = JSON.stringify(value).toLowerCase();
  [
    'internalcost',
    'material_cost',
    'labor_cost',
    'subcontract_cost',
    'margin',
    'pcedecision',
    'purchase',
    'receiving',
    'actual_used',
    'variance',
    'calibration',
    'red_alert',
    'profit',
    'risk_score'
  ].forEach((forbidden) => {
    assert.ok(!serialized.includes(forbidden), `${label} excludes ${forbidden}`);
  });
}

function find(items, predicate, message) {
  const item = items.find(predicate);
  assert.ok(item, message);
  return item;
}

assert.ok(fs.existsSync(packagedExe), 'Packaged executable exists');
assert.ok(mainSource.includes("mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))"), 'Production path loads packaged dist file');
assert.ok(mainSource.includes('if (isDev)') && mainSource.includes("mainWindow.loadURL('http://127.0.0.1:5173')"), 'Dev server URL is gated by dev mode');

const service = createPackagedService();
const statsBefore = service.getDbStats();
assert.ok(statsBefore.dbPaths.project.startsWith(userDataPath), 'Project DB uses packaged userData path');
[
  statsBefore.estimateExportDir,
  statsBefore.contractExportDir,
  statsBefore.scheduleExportDir,
  statsBefore.purchaseOrderExportDir,
  statsBefore.visualizationExportDir,
  statsBefore.boardExportDir,
  statsBefore.reportExportDir,
  statsBefore.lightBimExportDir
].forEach((dirPath) => {
  assert.ok(dirPath.startsWith(path.join(userDataPath, 'export')), `${dirPath} is under packaged userData export`);
  assert.ok(fs.existsSync(dirPath), `${dirPath} exists`);
});

const imported = service.importLightBIMPayload({
  payload,
  sourceFileName: 'packaged-real-use-lightbim.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM JSON imports in packaged userData environment');

const created = service.createEstimateFromLightBIM({
  importId: imported.importId,
  estimateTypeOverride: 'FULL_REMODELING'
});
assert.ok(created.ok, 'Full remodeling estimate draft is created from packaged LightBIM import');
assert.strictEqual(created.estimateType, 'FULL_REMODELING', 'Packaged import detects FULL_REMODELING');
assert.ok(created.preview.estimate.line_items.some((item) => item.quantity_source === 'LIGHTBIM'), 'Internal line items preserve LightBIM quantity source');
assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(created.preview.pce.decision), 'PCE decision exists in packaged estimate preview');

const estimateId = `FULL-PACKAGED-REAL-USE-${Date.now()}`;
const saved = service.saveFullRemodelingEstimate({
  ...created.input,
  estimateId,
  customerName: '패키지 실사용 테스트 고객',
  siteName: '패키지 실사용 테스트 현장',
  lightBimImportId: imported.importId
});
assert.strictEqual(saved.estimateId, estimateId, 'Packaged estimate is saved to userData DB');

const contract = service.generateFullRemodelingContract({
  estimateId,
  startDate: '2026-06-10'
});
assert.ok(contract.contractId, 'Contract is generated in packaged environment');

const schedule = service.generateFullRemodelingSchedule({
  estimateId,
  contractId: contract.contractId,
  startDate: '2026-06-10'
});
assert.ok(schedule.schedule.items.length > 0, 'Schedule is generated in packaged environment');

const purchase = service.generateFullRemodelingPurchaseOrder({
  estimateId,
  contractId: contract.contractId,
  requiredDate: '2026-06-05'
});
const tileOrder = find(purchase.purchaseOrder.items, (item) => item.itemName === '타일', 'Tile purchase item exists');
assert.ok(tileOrder.order_quantity >= tileOrder.base_quantity, 'Purchase order quantity is available with waste factor');

const customerPdf = service.exportFullRemodelingEstimateDocument({
  estimateId,
  documentType: 'customer',
  format: 'pdf'
});
const internalExcel = service.exportFullRemodelingEstimateDocument({
  estimateId,
  documentType: 'internal',
  format: 'xlsx'
});
const contractPdf = service.exportBathroomContractPdf ? null : null;
assert.ok(fs.existsSync(customerPdf.filePath), 'Customer estimate PDF is created under packaged export path');
assert.ok(fs.existsSync(internalExcel.filePath), 'Internal estimate Excel is created under packaged export path');
assert.ok(customerPdf.filePath.startsWith(statsBefore.estimateExportDir), 'Customer PDF uses packaged estimate export directory');
assert.ok(internalExcel.filePath.startsWith(statsBefore.estimateExportDir), 'Internal Excel uses packaged estimate export directory');

const customerMap = service.getLightBIMCustomerProposalMapByEstimate({
  estimateType: created.estimateType,
  estimateId
});
assert.strictEqual(customerMap.customerSafe, true, 'Customer proposal map remains customer-safe in packaged environment');
assertSafePayload(customerMap, 'Packaged customer proposal map');

const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId,
  projectId: estimateId,
  projectName: '패키지 실사용 제안서',
  title: '패키지 고객 제안서',
  printFormat: 'A3_LANDSCAPE',
  estimateSummary: {
    totalAmount: saved.preview?.estimate?.totalCustomerPrice || 0,
    totalCost: saved.preview?.estimate?.totalCost || 0,
    margin: saved.preview?.estimate?.expectedMargin || 0,
    pceDecision: saved.preview?.pce?.decision || created.preview.pce.decision,
    scheduleDays: schedule.schedule.totalDurationDays,
    processGroups: []
  }
});
assert.ok(board.layout.sections.some((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP'), 'Proposal board includes customer map in packaged environment');
assertSafePayload(board.layout.customerPdfPayload, 'Packaged proposal board PDF payload');
const boardPdf = service.exportDesignBoardPdf({ boardId: board.boardId, exportMode: 'CLIENT_PROPOSAL' });
assert.ok(fs.existsSync(boardPdf.filePath), 'Proposal board PDF is created under packaged export path');
assert.ok(boardPdf.filePath.startsWith(statsBefore.boardExportDir), 'Board PDF uses packaged board export directory');

const restartedService = createPackagedService();
const persistedPdf = restartedService.exportFullRemodelingEstimateDocument({
  estimateId,
  documentType: 'customer',
  format: 'pdf'
});
assert.ok(fs.existsSync(persistedPdf.filePath), 'Saved estimate persists after service restart and can export again');
const restartedStats = restartedService.getDbStats();
assert.ok(restartedStats.fullRemodelingEstimateCount >= statsBefore.fullRemodelingEstimateCount + 1, 'Packaged DB persists the saved estimate');

console.log(JSON.stringify({
  ok: true,
  test: 'packaged-real-use.smoke',
  packagedExe,
  userDataPath,
  estimateId,
  pceDecision: created.preview.pce.decision,
  customerPdf: customerPdf.filePath,
  internalExcel: internalExcel.filePath,
  boardPdf: boardPdf.filePath,
  persistedAfterRestart: true
}, null, 2));
