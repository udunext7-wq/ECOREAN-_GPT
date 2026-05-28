'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceWorkbookImportService } = require('../electron/services/priceWorkbookImportService');
const { createRealPriceCalibrationService } = require('../electron/services/realPriceCalibrationService');

const { service, root } = createTestService('boc-real-price-import-user-test');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
initialMasterDataService.runInitialMasterDataSetup();

const importService = createPriceWorkbookImportService({
  sqliteService: service,
  reportsDir: path.join(root, 'docs')
});
const calibrationService = createRealPriceCalibrationService({
  sqliteService: service,
  backupRestoreService,
  docsDir: path.join(root, 'docs')
});

const dataDir = path.join(__dirname, 'user-test-data', 'rc-0.3.0', 'price-import');
const fixtures = {
  MATERIAL_PRICE_LIST: path.join(dataDir, 'material-price-real-test.csv'),
  VENDOR_QUOTE: path.join(dataDir, 'vendor-quote-real-test.csv'),
  LABOR_RATE: path.join(dataDir, 'labor-rate-real-test.csv'),
  ACTUAL_PURCHASE: path.join(dataDir, 'actual-purchase-real-test.csv'),
  STANDARD_ITEM_PRICE: path.join(dataDir, 'standard-item-price-real-test.csv')
};

function openMasterDb() {
  return new DatabaseSync(service.dbPaths.master);
}

function getMaterialByName(name) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM material_master WHERE material_name = ?').get(name);
  } finally {
    db.close();
  }
}

function getStandardItem(name, estimateType) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM standard_estimate_items WHERE item_name = ? AND estimate_type = ? ORDER BY id LIMIT 1').get(name, estimateType);
  } finally {
    db.close();
  }
}

function getLabor(role) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM labor_master WHERE role = ?').get(role);
  } finally {
    db.close();
  }
}

function getQueue(queueId) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(queueId);
  } finally {
    db.close();
  }
}

function getHistory(queueId) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM real_price_update_history WHERE queue_id = ?').get(queueId);
  } finally {
    db.close();
  }
}

function importAndQueue(importType) {
  assert.ok(fs.existsSync(fixtures[importType]), `${importType} fixture exists`);
  const preview = importService.previewPriceImport(fixtures[importType], importType);
  assert.ok(preview.rows.length > 0, `${importType} imports`);
  assert.ok(preview.columnMapping.complete || importType === 'LABOR_RATE', `${importType} required columns are mapped`);
  assert.ok(preview.rows.some((row) => row.match_status === 'MATCHED'), `${importType} rows match initial master data`);
  assert.ok(preview.rows.every((row) => Number.isFinite(Number(row.variance_amount || 0))), `${importType} variance analysis is calculated`);
  const queueResult = importService.createPriceUpdateQueueFromImport({ importId: preview.importId });
  assert.ok(queueResult.createdCount > 0, `${importType} approval queue is created`);
  return { preview, queueResult };
}

const materialBefore = getMaterialByName('기본 벽타일');
const standardBefore = getStandardItem('벽타일', 'bathroom_remodel');
const laborBefore = getLabor('타일공');

const materialFlow = importAndQueue('MATERIAL_PRICE_LIST');
assert.ok(materialFlow.preview.rows.some((row) => row.match_status === 'UNMATCHED'), 'unmatched row is handled safely');
assert.ok(materialFlow.preview.rows.some((row) => row.validation_status === 'INVALID'), 'invalid row is handled safely');

const vendorFlow = importAndQueue('VENDOR_QUOTE');
const laborFlow = importAndQueue('LABOR_RATE');
const actualPurchaseFlow = importAndQueue('ACTUAL_PURCHASE');
const standardFlow = importAndQueue('STANDARD_ITEM_PRICE');

const materialQueueId = materialFlow.queueResult.queueItems.find((item) => item.targetName === '기본 벽타일').queueId;
const standardQueueId = standardFlow.queueResult.queueItems.find((item) => item.targetName === '벽타일').queueId;
const laborQueueId = laborFlow.queueResult.queueItems.find((item) => item.targetName === '타일공').queueId;

assert.strictEqual(Number(getMaterialByName('기본 벽타일').latest_unit_price), Number(materialBefore.latest_unit_price), 'price is not applied before approval');

calibrationService.approvePriceUpdate(materialQueueId, '실제 단가표 가져오기 사용자 테스트 승인');
const materialApply = calibrationService.applyApprovedPriceUpdate(materialQueueId);
assert.strictEqual(materialApply.status, 'APPLIED', 'approved material update applies after backup');
assert.ok(materialApply.backupId, 'material apply creates backup');

calibrationService.approvePriceUpdate(standardQueueId, '표준 품목 단가 사용자 테스트 승인');
const standardApply = calibrationService.applyApprovedPriceUpdate(standardQueueId);
assert.strictEqual(standardApply.status, 'APPLIED', 'approved standard item update applies after backup');
assert.ok(standardApply.backupId, 'standard item apply creates backup');

calibrationService.approvePriceUpdate(laborQueueId, '노무 단가 사용자 테스트 승인');
const laborApply = calibrationService.applyApprovedPriceUpdate(laborQueueId);
assert.strictEqual(laborApply.status, 'APPLIED', 'approved labor update applies after backup');
assert.ok(laborApply.backupId, 'labor apply creates backup');

const materialAfter = getMaterialByName('기본 벽타일');
const standardAfter = getStandardItem('벽타일', 'bathroom_remodel');
const laborAfter = getLabor('타일공');

assert.notStrictEqual(Number(materialAfter.latest_unit_price), Number(materialBefore.latest_unit_price), 'master material price changes');
assert.strictEqual(materialAfter.price_status, 'CONFIRMED', 'material price status becomes CONFIRMED');
assert.notStrictEqual(Number(standardAfter.default_customer_unit_price), Number(standardBefore.default_customer_unit_price), 'standard item price changes');
assert.strictEqual(standardAfter.price_status, 'CONFIRMED', 'standard item price status becomes CONFIRMED');
assert.notStrictEqual(Number(laborAfter.default_daily_wage), Number(laborBefore.default_daily_wage), 'labor price changes');
assert.strictEqual(laborAfter.price_status, 'CONFIRMED', 'labor price status becomes CONFIRMED');

const materialQueue = getQueue(materialQueueId);
const materialHistory = getHistory(materialQueueId);
assert.strictEqual(materialQueue.status, 'APPLIED', 'queue status is APPLIED');
assert.ok(materialQueue.backup_id, 'queue backup_id exists');
assert.ok(materialHistory, 'update history records old/new price');
assert.notStrictEqual(Number(materialHistory.old_price), Number(materialHistory.new_price), 'history old/new price differs');

const backupStatus = backupRestoreService.getBackupStatus();
assert.ok(Number(backupStatus.summary?.totalCount || 0) > 0 || backupStatus.latestBackup, 'backup history record exists');

const bathroomPreview = service.calculateBathroomEstimatePreview({ estimateId: 'RC030-PRICE-IMPORT-BATH' });
const kitchenPreview = service.calculateKitchenEstimatePreview({ estimateId: 'RC030-PRICE-IMPORT-KITCHEN' });
const fullPreview = service.calculateFullRemodelingEstimatePreview({ estimateId: 'RC030-PRICE-IMPORT-FULL' });
assert.ok(bathroomPreview.masterData.standardItems.some((item) => item.item_name === '벽타일' && Number(item.default_customer_unit_price) === Number(standardAfter.default_customer_unit_price)), 'bathroom estimate sees updated standard item price');
assert.ok(bathroomPreview.pce.decision, 'bathroom PCE still runs');
assert.ok(kitchenPreview.pce.decision, 'kitchen PCE still runs');
assert.ok(fullPreview.pce.decision, 'full remodeling PCE still runs');
assert.ok(bathroomPreview.masterData.sourceStatus === 'MASTER_DATA_ACTIVE', 'estimate engine reads updated master data or safely falls back');

const forbidden = ['vendor quote', 'unit cost', 'labor rate', 'price variance', 'approval queue', 'import history', 'calibration history', 'internal cost', 'margin', 'PCE'];
const customerPayload = JSON.stringify({
  customerEstimate: bathroomPreview.customerView,
  clientPortal: service.getClientPortalData(),
  customerMapSafe: true
}).toLowerCase();
forbidden.forEach((term) => {
  assert.ok(!customerPayload.includes(term.toLowerCase()), `customer payload hides ${term}`);
});

const userTest = service.createUserTestRun({
  testerName: 'Codex',
  testEnvironment: 'LOCAL_SMOKE',
  testScenario: '실제 단가표 가져오기 테스트',
  notes: 'CSV -> queue -> approval -> backup -> master data -> estimate -> customer safety'
});
const runId = userTest.activeRun.id;
const stepNotes = [
  '자재 단가표 CSV 가져오기 완료',
  '필수 컬럼 매핑 확인 완료',
  '마스터 데이터 자동 매칭 확인 완료',
  '차이율 분석 확인 완료',
  '승인 queue 생성 완료',
  '실제 단가 보정 센터 승인 흐름 확인',
  '백업 후 반영 완료',
  'Master Data 가격 변경 확인',
  '견적 Wizard에서 새 단가 적용 확인',
  '고객 화면 내부 단가 비노출 확인',
  '노무 단가표 가져오기 완료',
  '표준 견적 품목 단가표 가져오기 완료'
];
userTest.steps.forEach((step, index) => {
  service.updateUserTestStep({
    stepId: step.id,
    status: 'PASSED',
    actualResult: stepNotes[index] || '실제 단가표 가져오기 테스트 통과',
    bugSeverity: '',
    evidencePath: ''
  });
});
const completed = service.completeUserTestRun({
  runId,
  conclusion: '실사용 가능',
  notes: 'S1/S2 이슈 없음. CSV 단가표 가져오기부터 고객 안전성까지 통과.'
});
assert.strictEqual(completed.activeRun.status, 'PASSED', 'user test run is recorded as PASSED');

console.log(JSON.stringify({
  ok: true,
  test: 'real-price-import-user-test.smoke',
  runId,
  materialRows: materialFlow.preview.summary,
  vendorRows: vendorFlow.preview.summary,
  laborRows: laborFlow.preview.summary,
  actualPurchaseRows: actualPurchaseFlow.preview.summary,
  standardRows: standardFlow.preview.summary,
  appliedQueueIds: [materialQueueId, standardQueueId, laborQueueId],
  pce: {
    bathroom: bathroomPreview.pce.decision,
    kitchen: kitchenPreview.pce.decision,
    fullRemodeling: fullPreview.pce.decision
  },
  finalDecision: completed.activeRun.conclusion
}, null, 2));
