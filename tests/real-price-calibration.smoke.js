'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealPriceCalibrationService, calculatePriceVariance } = require('../electron/services/realPriceCalibrationService');

const { service, root } = createTestService('boc-real-price-calibration');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
initialMasterDataService.runInitialMasterDataSetup();

const calibrationService = createRealPriceCalibrationService({
  sqliteService: service,
  backupRestoreService,
  docsDir: path.join(root, 'docs')
});

function openMasterDb() {
  return new DatabaseSync(service.dbPaths.master);
}

function getMaterial(materialId) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM material_master WHERE id = ?').get(materialId);
  } finally {
    db.close();
  }
}

function getLabor(laborId) {
  const db = openMasterDb();
  try {
    return db.prepare('SELECT * FROM labor_master WHERE id = ?').get(laborId);
  } finally {
    db.close();
  }
}

const needsUpdate = calibrationService.getNeedsUpdatePriceItems();
assert.ok(needsUpdate.count > 0, 'NEEDS_UPDATE price items can be listed');
assert.ok(needsUpdate.grouped.material.length > 0, 'material needs update items are grouped');
assert.ok(needsUpdate.grouped.labor.length > 0, 'labor needs update items are grouped');

const priority = calibrationService.getPriceUpdatePriorityList();
assert.ok(priority.high.length > 0, 'priority list classifies HIGH items');
assert.ok(priority.medium.length > 0 || priority.low.length > 0, 'priority list classifies MEDIUM/LOW items');

const materialTarget = needsUpdate.grouped.material.find((item) => String(item.targetName).includes('벽타일')) || needsUpdate.grouped.material[0];
const vendorQuote = calibrationService.createVendorQuotePriceUpdate({
  targetType: 'MATERIAL',
  targetId: materialTarget.targetId,
  targetName: materialTarget.targetName,
  proposedPrice: materialTarget.currentPrice + 5000,
  unit: materialTarget.unit,
  vendorName: 'RC 단가 테스트 업체',
  evidenceNote: '업체 견적서 기준'
});
assert.strictEqual(vendorQuote.queueItem.status, 'PENDING_REVIEW', 'vendor quote update creates pending queue item');
assert.strictEqual(vendorQuote.queueItem.price_source, 'VENDOR_QUOTE', 'vendor quote source is recorded');

const actualPurchase = calibrationService.createActualPurchasePriceUpdate({
  targetType: 'MATERIAL',
  targetId: materialTarget.targetId,
  targetName: materialTarget.targetName,
  proposedPrice: materialTarget.currentPrice + 8000,
  actualPurchasePrice: materialTarget.currentPrice + 8000,
  quantity: 10,
  totalAmount: (materialTarget.currentPrice + 8000) * 10,
  unit: materialTarget.unit,
  vendorName: 'RC 실제 매입 업체',
  evidenceNote: '발주/입고 실매입 기준'
});
assert.strictEqual(actualPurchase.queueItem.status, 'PENDING_REVIEW', 'actual purchase update creates pending queue item');
assert.strictEqual(actualPurchase.queueItem.price_source, 'ACTUAL_PURCHASE', 'actual purchase source is recorded');

const laborTarget = needsUpdate.grouped.labor[0];
const laborRate = calibrationService.createLaborRateUpdate({
  targetId: laborTarget.targetId,
  role: laborTarget.targetName,
  targetName: laborTarget.targetName,
  proposedDailyWage: laborTarget.currentPrice + 20000,
  evidenceNote: '현장 기공 일당 확인'
});
assert.strictEqual(laborRate.queueItem.status, 'PENDING_REVIEW', 'labor rate update creates pending queue item');
assert.strictEqual(laborRate.queueItem.target_type, 'LABOR', 'labor target type is recorded');

const variance = calculatePriceVariance(100000, 120000);
assert.strictEqual(variance.varianceAmount, 20000, 'variance amount works');
assert.ok(variance.varianceRate > 0.19 && variance.varianceRate < 0.21, 'variance rate works');
assert.strictEqual(calculatePriceVariance(0, 10000).labelKo, '신규 입력', 'zero current price is 신규 입력');

const approved = calibrationService.approvePriceUpdate(vendorQuote.queueId, '대표 승인');
assert.strictEqual(approved.status, 'APPROVED', 'approve update changes status to APPROVED');

const rejected = calibrationService.rejectPriceUpdate(actualPurchase.queueId, '다른 견적서 확인 필요');
assert.strictEqual(rejected.status, 'REJECTED', 'reject update changes status to REJECTED');

let rejectedApplyBlocked = false;
try {
  calibrationService.applyApprovedPriceUpdate(actualPurchase.queueId);
} catch (error) {
  rejectedApplyBlocked = true;
}
assert.strictEqual(rejectedApplyBlocked, true, 'rejected updates cannot apply');

let pendingApplyBlocked = false;
try {
  calibrationService.applyApprovedPriceUpdate(laborRate.queueId);
} catch (error) {
  pendingApplyBlocked = true;
}
assert.strictEqual(pendingApplyBlocked, true, 'pending updates cannot apply');

const beforeMaterial = getMaterial(materialTarget.targetId);
const applied = calibrationService.applyApprovedPriceUpdate(vendorQuote.queueId);
assert.strictEqual(applied.status, 'APPLIED', 'apply approved update changes status to APPLIED');
assert.ok(applied.backupId, 'apply approved update creates backup record');

const afterMaterial = getMaterial(materialTarget.targetId);
assert.strictEqual(Number(afterMaterial.latest_unit_price), Number(vendorQuote.queueItem.proposed_price), 'master data price updates after apply');
assert.strictEqual(afterMaterial.price_status, 'CONFIRMED', 'master data price status becomes CONFIRMED');
assert.notStrictEqual(Number(beforeMaterial.latest_unit_price), Number(afterMaterial.latest_unit_price), 'material price actually changes');

calibrationService.approvePriceUpdate(laborRate.queueId, '노무 단가 승인');
const appliedLabor = calibrationService.applyApprovedPriceUpdate(laborRate.queueId);
assert.strictEqual(appliedLabor.status, 'APPLIED', 'approved labor update can apply');
assert.strictEqual(getLabor(laborTarget.targetId).price_status, 'CONFIRMED', 'labor price status becomes CONFIRMED');

const history = calibrationService.getPriceUpdateHistory();
assert.ok(history.some((item) => item.queue_id === vendorQuote.queueId), 'update history records old/new price');

const report = calibrationService.createPriceCalibrationReport();
assert.ok(fs.existsSync(report.reportPath), 'price calibration report is generated');

const preview = service.calculateBathroomEstimatePreview({ estimateId: 'REAL-PRICE-PREVIEW' });
assert.ok(preview.masterData, 'estimate engine can read updated master price or safely fallback');
assert.strictEqual(preview.masterData.sourceStatus, 'MASTER_DATA_ACTIVE', 'estimate wizard uses master data active state');

const customerEstimateSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
assert.ok(!customerEstimateSource.includes('realPriceCalibration') && !customerEstimateSource.includes('실제 단가 보정'), 'customer payload does not expose internal price calibration data');

const summary = calibrationService.getRealPriceCalibrationSummary();
assert.ok(summary.appliedCount >= 2, 'summary includes applied count');

console.log(JSON.stringify({
  ok: true,
  test: 'real-price-calibration.smoke',
  needsUpdateCount: needsUpdate.count,
  highPriorityCount: priority.high.length,
  appliedCount: summary.appliedCount,
  materialPrice: afterMaterial.latest_unit_price,
  reportPath: report.reportPath
}, null, 2));
