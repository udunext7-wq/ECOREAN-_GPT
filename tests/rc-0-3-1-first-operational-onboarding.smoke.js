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
const {
  DEFAULT_ONBOARDING_STEPS,
  createOperationalOnboardingService
} = require('../electron/services/operationalOnboardingService');

const FORBIDDEN_CUSTOMER_TERMS = [
  'cost',
  'margin',
  'pce',
  'vendor',
  'labor',
  'purchase',
  'receiving',
  'actual_used',
  'variance',
  'calibration',
  'backup path',
  'onboarding issue',
  'internal',
  'profit',
  'risk_score'
];

function assertCustomerSafe(label, payload) {
  const serialized = JSON.stringify(payload).toLowerCase();
  FORBIDDEN_CUSTOMER_TERMS.forEach((term) => {
    assert.ok(!serialized.includes(term.toLowerCase()), `${label} hides ${term}`);
  });
}

function openMasterDb(service) {
  return new DatabaseSync(service.dbPaths.master);
}

function getMaterial(service, name) {
  const db = openMasterDb(service);
  try {
    return db.prepare('SELECT * FROM material_master WHERE material_name = ?').get(name);
  } finally {
    db.close();
  }
}

function getLabor(service, role) {
  const db = openMasterDb(service);
  try {
    return db.prepare('SELECT * FROM labor_master WHERE role = ?').get(role);
  } finally {
    db.close();
  }
}

function countMaster(service, tableName) {
  const db = openMasterDb(service);
  try {
    return Number(db.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count || 0);
  } finally {
    db.close();
  }
}

function findQueueItem(queueResult, targetName) {
  const item = queueResult.queueItems.find((entry) => entry.targetName === targetName);
  assert.ok(item, `${targetName} queue item exists`);
  return item;
}

function mark(onboardingService, runId, stepKey, actualResult, note = '') {
  return onboardingService.updateOperationalOnboardingStep(runId, stepKey, 'PASSED', { actualResult, note });
}

const { service, root } = createTestService('boc-rc031-first-onboarding');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const workbookService = createPriceWorkbookImportService({ sqliteService: service, reportsDir: path.join(root, 'docs') });
const calibrationService = createRealPriceCalibrationService({ sqliteService: service, backupRestoreService, docsDir: path.join(root, 'docs') });
const onboardingService = createOperationalOnboardingService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

const dataDir = path.join(__dirname, 'user-test-data', 'rc-0.3.1', 'first-operational-onboarding');
const vendorFixturePath = path.join(dataDir, 'vendor-first-onboarding.sample.json');
const materialCsvPath = path.join(dataDir, 'material-price-first-onboarding.csv');
const laborCsvPath = path.join(dataDir, 'labor-rate-first-onboarding.csv');
const lightBimPath = path.join(dataDir, 'first-project-lightbim.sample.json');
const expectedPath = path.join(dataDir, 'first-operational-onboarding-expected-results.json');

[vendorFixturePath, materialCsvPath, laborCsvPath, lightBimPath, expectedPath].forEach((filePath) => {
  assert.ok(fs.existsSync(filePath), `${path.basename(filePath)} exists`);
});

const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8')).expected;
const run = onboardingService.createOperationalOnboardingRun('RC-0.3.1', '첫 운영 데이터 입력 테스트');
assert.ok(run.id, 'onboarding run can be created for RC-0.3.1');
assert.strictEqual(run.steps.length, expected.onboarding_step_count, 'default 12 steps exist');

const fullBackup = backupRestoreService.createFullUserDataBackup({ notes: 'RC-0.3.1 첫 운영 데이터 입력 테스트 사전 백업' });
assert.ok(fullBackup.backupId, 'full backup can be created');
assert.ok(fs.existsSync(fullBackup.manifestPath), 'backup manifest exists');
assert.ok(fullBackup.backupPath.includes(`${path.sep}backups${path.sep}`), 'backup path is under userData/backups');
mark(onboardingService, run.id, 'backup_full', `전체 백업 생성: ${fullBackup.backupId}`, fullBackup.backupPath);

const seedResult = initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });
assert.ok(seedResult.ok && seedResult.results.some((item) => item.seedType === 'PROCESS' && item.insertedCount + item.skippedCount > 0), 'initial master data setup returns process records');
assert.ok(countMaster(service, 'process_master') > 0, 'process master exists');
assert.ok(countMaster(service, 'material_master') > 0, 'material master exists');
assert.ok(countMaster(service, 'labor_master') > 0, 'labor master exists');
assert.ok(countMaster(service, 'standard_estimate_items') > 0, 'standard estimate items exist');
assert.ok(countMaster(service, 'estimate_default_packages') > 0, 'estimate default packages exist');
assert.ok(calibrationService.getNeedsUpdatePriceItems().items.length > 0, 'NEEDS_UPDATE items are visible');
mark(onboardingService, run.id, 'initial_master_status', '초기 기준 데이터와 NEEDS_UPDATE 항목 확인 완료');

const vendorFixture = JSON.parse(fs.readFileSync(vendorFixturePath, 'utf8'));
const vendorResults = vendorFixture.vendors.map((vendor, index) => service.createMasterDataItem({
  type: 'vendor',
  payload: { id: `VEN-RC031-FIRST-${index + 1}`, ...vendor }
}));
assert.ok(vendorResults.every((result) => result.id), 'vendor data can be entered or simulated');
mark(onboardingService, run.id, 'vendor_entry', `${vendorResults.length}개 업체 입력 완료`);

const materialBefore = getMaterial(service, '기본 벽타일');
const laborBefore = getLabor(service, '타일공');
assert.ok(materialBefore && laborBefore, 'target material and labor rows exist before import');

const materialPreview = workbookService.previewPriceImport(materialCsvPath, 'MATERIAL_PRICE_LIST');
assert.ok(materialPreview.columnMapping.complete, 'material price required columns are mapped');
assert.ok(materialPreview.rows.length >= 6, 'material price CSV imports');
assert.ok(materialPreview.summary.matchedCount >= expected.material_price_import_matched_min, 'material rows match master data');
assert.ok(materialPreview.rows.some((row) => row.match_status === 'UNMATCHED'), 'unmatched material row is safely marked');
assert.ok(materialPreview.rows.every((row) => Number.isFinite(Number(row.variance_amount || 0))), 'material variance analysis works');
const materialQueue = workbookService.createPriceUpdateQueueFromImport({ importId: materialPreview.importId });
assert.ok(materialQueue.createdCount > 0, 'material price queue is created');
assert.strictEqual(Number(getMaterial(service, '기본 벽타일').latest_unit_price), Number(materialBefore.latest_unit_price), 'material price is not applied before approval');
mark(onboardingService, run.id, 'material_price_import', `자재 CSV ${materialPreview.summary.matchedCount}건 자동 매칭, ${materialQueue.createdCount}건 승인 대기 생성`);

const laborPreview = workbookService.previewPriceImport(laborCsvPath, 'LABOR_RATE');
assert.ok(laborPreview.rows.length >= 5, 'labor price CSV imports');
assert.ok(laborPreview.summary.matchedCount >= expected.labor_rate_import_matched_min, 'labor rows match master data');
assert.ok(laborPreview.rows.every((row) => Number.isFinite(Number(row.variance_amount || 0))), 'labor variance analysis works');
const laborQueue = workbookService.createPriceUpdateQueueFromImport({ importId: laborPreview.importId });
assert.ok(laborQueue.createdCount > 0, 'labor price queue is created');
assert.strictEqual(Number(getLabor(service, '타일공').default_daily_wage), Number(laborBefore.default_daily_wage), 'labor price is not applied before approval');
mark(onboardingService, run.id, 'labor_rate_import', `노무 CSV ${laborPreview.summary.matchedCount}건 자동 매칭, ${laborQueue.createdCount}건 승인 대기 생성`);

const materialQueueId = findQueueItem(materialQueue, '기본 벽타일').queueId;
const laborQueueId = findQueueItem(laborQueue, '타일공').queueId;
calibrationService.approvePriceUpdate(materialQueueId, 'RC-0.3.1 첫 운영 데이터 입력 테스트 승인');
const materialApply = calibrationService.applyApprovedPriceUpdate(materialQueueId);
assert.strictEqual(materialApply.status, 'APPLIED', 'approved material price can be applied after backup');
assert.ok(materialApply.backupId, 'material apply creates backup');
calibrationService.approvePriceUpdate(laborQueueId, 'RC-0.3.1 첫 운영 노무 단가 승인');
const laborApply = calibrationService.applyApprovedPriceUpdate(laborQueueId);
assert.strictEqual(laborApply.status, 'APPLIED', 'approved labor price can be applied after backup');
assert.ok(laborApply.backupId, 'labor apply creates backup');

const materialAfter = getMaterial(service, '기본 벽타일');
const laborAfter = getLabor(service, '타일공');
assert.notStrictEqual(Number(materialAfter.latest_unit_price), Number(materialBefore.latest_unit_price), 'master material price changes');
assert.notStrictEqual(Number(laborAfter.default_daily_wage), Number(laborBefore.default_daily_wage), 'master labor price changes');
mark(onboardingService, run.id, 'price_approval_apply', `단가 승인/반영 완료: ${materialQueueId}, ${laborQueueId}`);

const lightBimPayload = JSON.parse(fs.readFileSync(lightBimPath, 'utf8'));
const imported = service.importLightBIMPayload({ payload: lightBimPayload, sourceFileName: 'first-project-lightbim.sample.json' });
assert.ok(imported.ok && imported.importId, 'first LightBIM project import works');
const created = service.createEstimateFromLightBIM({ importId: imported.importId, estimateTypeOverride: 'FULL_REMODELING' });
assert.ok(created.ok, 'first LightBIM estimate draft is created');
assert.strictEqual(created.estimateType, expected.lightbim_estimate_type, 'first estimate type is FULL_REMODELING');
mark(onboardingService, run.id, 'first_project_create', 'RC-0.3.1 첫 운영 테스트 프로젝트 생성 시뮬레이션 완료');
mark(onboardingService, run.id, 'lightbim_import', `LightBIM importId ${imported.importId} 가져오기 완료`);

const reviewData = service.getLightBIMQuantityReviews({ estimateType: created.estimateType, estimateId: created.estimateId });
assert.ok(reviewData.summary.totalCount > 0, 'quantity review records are created');
assert.ok(created.preview?.estimate?.line_items?.length > 0, 'estimate line items exist');
assert.ok(created.preview?.pce?.decision || created.preview?.estimate?.pce?.decision, 'estimate/PCE runs');

const saved = service.saveFullRemodelingEstimate({
  ...created.input,
  estimateId: 'RC031-FIRST-OPERATIONAL-PROJECT',
  customerName: 'RC-0.3.1 첫 운영 고객',
  siteName: 'RC-0.3.1 첫 운영 테스트 현장',
  lightBimImportId: imported.importId,
  customerPriceMultiplier: 1.18
});
assert.ok(saved.estimateId, 'first project estimate is saved');
mark(onboardingService, run.id, 'estimate_pce', `견적/PCE 확인 완료: ${created.preview.pce?.decision || created.preview.estimate?.pce?.decision}`);

const customerPdf = service.exportFullRemodelingEstimateDocument({
  estimateId: saved.estimateId,
  documentType: 'customer',
  format: 'pdf'
});
const internalExcel = service.exportFullRemodelingEstimateDocument({
  estimateId: saved.estimateId,
  documentType: 'internal',
  format: 'xlsx'
});
assert.ok(fs.existsSync(customerPdf.filePath), 'customer estimate output works');
assert.ok(fs.existsSync(internalExcel.filePath), 'internal cost output works');
mark(onboardingService, run.id, 'output_check', '고객용 PDF 및 내부 원가표 Excel 출력 확인');

const contract = service.generateFullRemodelingContract({ estimateId: saved.estimateId, startDate: '2026-06-10' });
service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, contractId: contract.contractId, startDate: '2026-06-10' });
const portal = service.getClientPortalData({ projectId: saved.estimateId });
const customerMap = service.getLightBIMCustomerProposalMapByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  title: 'RC-0.3.1 첫 운영 고객 제안서',
  projectName: 'RC-0.3.1 첫 운영 테스트 현장',
  estimateSummary: {
    totalAmount: saved.estimate?.totals?.customerTotal || 42000000,
    totalCost: saved.estimate?.totals?.internalCost || 31000000,
    margin: 11000000,
    pceDecision: 'SCALE',
    processGroups: [{ processKo: '전체 리모델링', amount: 42000000, internalCost: 31000000, margin: 11000000 }]
  }
});
assert.strictEqual(portal.customerSafe, true, 'client portal is marked customer-safe');
assert.strictEqual(customerMap.customerSafe, true, 'customer proposal map is marked safe');
assert.ok(board.layout.customerPdfPayload, 'proposal board customer payload exists');
assertCustomerSafe('Customer Portal', portal);
assertCustomerSafe('Customer Estimate', portal.estimateView);
assertCustomerSafe('Customer Contract Section', portal.contractView);
assertCustomerSafe('Customer Proposal Map', customerMap);
assertCustomerSafe('Proposal Board Payload', board.layout.customerPdfPayload);
mark(onboardingService, run.id, 'customer_safety_check', '고객용 화면 내부정보 비노출 확인 완료');

const issueResult = onboardingService.createOperationalOnboardingIssue(run.id, 'issue_backlog', {
  severity: 'S4',
  screen: '릴리스 검증',
  description: 'Vite bundle size warning은 비차단 경고로 유지',
  reproductionSteps: 'npm run build:ui',
  decision: 'RC-0.3.1 이후 최적화 후보',
  targetVersion: 'RC-0.3.1',
  status: 'DEFERRED'
});
assert.ok(issueResult.issueId, 'issues are recorded into RC-0.3.1 onboarding issue log');
mark(onboardingService, run.id, 'issue_backlog', '비차단 경고를 RC-0.3.1 수정 후보로 기록');

const completion = onboardingService.completeOperationalOnboardingRun(run.id);
assert.strictEqual(completion.ok, true, 'all-pass run can be completed as 운영 시작 가능');
assert.strictEqual(completion.decisionKo, '운영 시작 가능', 'final operational start decision is available');
const report = onboardingService.generateOperationalOnboardingReport(run.id);
assert.ok(fs.existsSync(report.reportPath), 'onboarding report is generated');

const blockedRun = onboardingService.createOperationalOnboardingRun('RC-0.3.1', 'S1/S2 차단 판정 테스트');
onboardingService.createOperationalOnboardingIssue(blockedRun.id, 'customer_safety_check', {
  severity: 'S1',
  screen: '고객 포털',
  description: '고객 화면 내부정보 노출 가정 테스트',
  decision: '수정 후 재검토'
});
const blockedCompletion = onboardingService.completeOperationalOnboardingRun(blockedRun.id);
assert.strictEqual(blockedCompletion.ok, false, 'S1/S2 issue prevents final operational start decision');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-1-first-operational-onboarding.smoke',
  onboardingRunId: run.id,
  backupId: fullBackup.backupId,
  materialImport: materialPreview.summary,
  laborImport: laborPreview.summary,
  appliedQueueIds: [materialQueueId, laborQueueId],
  importId: imported.importId,
  estimateId: saved.estimateId,
  pceDecision: created.preview.pce?.decision || created.preview.estimate?.pce?.decision,
  customerSafety: true,
  issueId: issueResult.issueId,
  finalDecision: completion.decisionKo,
  reportPath: report.reportPath
}, null, 2));
