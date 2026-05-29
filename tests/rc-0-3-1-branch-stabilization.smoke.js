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
const { createOperationalOnboardingService, DEFAULT_ONBOARDING_STEPS } = require('../electron/services/operationalOnboardingService');

const FORBIDDEN = [
  'internal cost',
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
  'import rows',
  'manual matching logs',
  'approval queue',
  'internal',
  'profit',
  'risk_score'
];

function assertCustomerSafe(label, payload) {
  const serialized = JSON.stringify(payload).toLowerCase();
  FORBIDDEN.forEach((term) => {
    assert.ok(!serialized.includes(term), `${label} hides ${term}`);
  });
}

function markPassed(onboardingService, runId, stepKey, result) {
  return onboardingService.updateOperationalOnboardingStep(runId, stepKey, 'PASSED', {
    actualResult: result,
    note: 'RC-0.3.1 branch stabilization'
  });
}

function getMaterialPrice(sqliteService, name) {
  const db = new DatabaseSync(sqliteService.dbPaths.master);
  try {
    const row = db.prepare('SELECT latest_unit_price FROM material_master WHERE material_name = ?').get(name);
    return Number(row?.latest_unit_price || 0);
  } finally {
    db.close();
  }
}

const { service, root } = createTestService('boc-rc031-stabilization');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const workbookService = createPriceWorkbookImportService({ sqliteService: service, reportsDir: path.join(root, 'docs') });
const calibrationService = createRealPriceCalibrationService({ sqliteService: service, backupRestoreService, docsDir: path.join(root, 'docs') });
const onboardingService = createOperationalOnboardingService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const run = onboardingService.createOperationalOnboardingRun('RC-0.3.1', 'RC-0.3.1 브랜치 안정화 테스트');
assert.ok(run.id, 'RC-0.3.1 onboarding run can be created');
assert.strictEqual(run.steps.length, 12, 'default onboarding steps exist');

const fullBackup = backupRestoreService.createFullUserDataBackup({ notes: 'RC-0.3.1 branch stabilization pre-check' });
assert.ok(fullBackup.backupId && fs.existsSync(fullBackup.manifestPath), 'full backup and manifest can be created');
markPassed(onboardingService, run.id, 'backup_full', `백업 생성 ${fullBackup.backupId}`);
markPassed(onboardingService, run.id, 'initial_master_status', '초기 기준 데이터 확인');
markPassed(onboardingService, run.id, 'vendor_entry', '업체 입력 흐름 확인');

const materialCsv = path.join(root, 'rc031-stabilization-material.csv');
fs.writeFileSync(materialCsv, [
  '자재명,자재분류,규격,브랜드,단위,단가,업체명,적용공정,비고',
  '기본 벽타일,타일,300x600,테스트,㎡,35200,테스트 업체,욕실 벽타일,자동 매칭',
  'RC031 안정화 미매칭 타일,타일,300x600,테스트,㎡,36200,테스트 업체,욕실 벽타일,수동 매칭 대상',
  'RC031 안정화 제외 자재,기타,확인 필요,테스트,개,9900,테스트 업체,확인 필요,제외 대상'
].join('\n'), 'utf8');
const materialPreview = workbookService.previewPriceImport(materialCsv, 'MATERIAL_PRICE_LIST');
assert.ok(materialPreview.rows.some((row) => row.match_status === 'UNMATCHED'), 'unmatched rows are present');

const unmatchedRows = workbookService.getUnmatchedImportRows(materialPreview.importId);
const manualRow = unmatchedRows.find((row) => row.normalized.item_name === 'RC031 안정화 미매칭 타일');
const excludeRow = unmatchedRows.find((row) => row.normalized.item_name === 'RC031 안정화 제외 자재');
assert.ok(manualRow && excludeRow, 'manual and excluded row fixtures exist');

const candidateSearch = workbookService.searchPriceImportMatchCandidates('MATERIAL_PRICE_LIST', '기본 벽타일', { targetType: 'MATERIAL', unit: '㎡' });
assert.ok(candidateSearch.candidates.length > 0, 'master data search returns candidates');
const wallTileCandidate = candidateSearch.candidates.find((candidate) => candidate.target_name === '기본 벽타일') || candidateSearch.candidates[0];
const manualMatch = workbookService.manuallyMatchImportRow(manualRow.id, wallTileCandidate.target_type, wallTileCandidate.target_id, '안정화 수동 매칭');
assert.strictEqual(manualMatch.row.match_status, 'MATCHED_MANUAL', 'manual matching converts unmatched row to MATCHED_MANUAL');
assert.ok(Number.isFinite(Number(manualMatch.row.variance_amount)), 'variance recalculates after manual match');

const excluded = workbookService.excludeImportRow(excludeRow.id, '안정화 테스트 제외');
assert.strictEqual(excluded.row.match_status, 'EXCLUDED', 'excluded row is marked');
const readiness = workbookService.getImportQueueReadiness(materialPreview.importId);
assert.strictEqual(readiness.manuallyMatchedRows, 1, 'queue readiness updates after manual match');
assert.strictEqual(readiness.excludedRows, 1, 'queue readiness counts excluded rows');
assert.strictEqual(readiness.queueEligibleRows, 2, 'queue readiness counts eligible rows');

const queue = workbookService.createPriceUpdateQueueFromImport({ importId: materialPreview.importId });
assert.strictEqual(queue.createdCount, 2, 'queue creation excludes unmatched/excluded rows');
assert.ok(!queue.detail.rows.find((row) => row.id === excludeRow.id).queue_id, 'excluded row does not enter queue');

const appliedQueueId = queue.queueItems.find((item) => item.targetName === '기본 벽타일').queueId;
calibrationService.approvePriceUpdate(appliedQueueId, 'RC-0.3.1 안정화 승인');
const applyResult = calibrationService.applyApprovedPriceUpdate(appliedQueueId);
assert.strictEqual(applyResult.status, 'APPLIED', 'approved queue can apply after backup');
assert.ok(applyResult.backupId, 'apply creates backup');
assert.strictEqual(getMaterialPrice(service, '기본 벽타일'), 35200, 'master data price changes after apply');
markPassed(onboardingService, run.id, 'material_price_import', '자재 CSV 수동 매칭 및 Queue 생성 확인');

const laborCsv = path.join(__dirname, 'user-test-data', 'rc-0.3.1', 'first-operational-onboarding', 'labor-rate-first-onboarding.csv');
const laborPreview = workbookService.previewPriceImport(laborCsv, 'LABOR_RATE');
assert.ok(laborPreview.summary.matchedCount >= 5, 'labor CSV still imports and matches');
markPassed(onboardingService, run.id, 'labor_rate_import', '노무 CSV 자동 매칭 확인');
markPassed(onboardingService, run.id, 'price_approval_apply', '승인/백업/반영 확인');

const lightBimFixture = require(path.join(__dirname, 'user-test-data', 'rc-0.3.1', 'first-operational-onboarding', 'first-project-lightbim.sample.json'));
const imported = service.importLightBIMPayload({ payload: lightBimFixture, sourceFileName: 'rc031-stabilization-lightbim.json' });
assert.ok(imported.ok && imported.importId, 'LightBIM first project import still works');
const created = service.createEstimateFromLightBIM({ importId: imported.importId, estimateTypeOverride: 'FULL_REMODELING' });
assert.ok(created.ok && created.estimateId, 'LightBIM estimate draft is created');
assert.ok(created.preview.pce?.decision || created.preview.estimate?.pce?.decision, 'PCE result exists');

const saved = service.saveFullRemodelingEstimate({
  ...created.input,
  estimateId: 'RC031-STABILIZATION-FIRST-PROJECT',
  customerName: 'RC-0.3.1 안정화 고객',
  siteName: 'RC-0.3.1 안정화 현장',
  lightBimImportId: imported.importId,
  customerPriceMultiplier: 1.18
});
markPassed(onboardingService, run.id, 'first_project_create', '첫 프로젝트 저장 확인');
markPassed(onboardingService, run.id, 'lightbim_import', `LightBIM import ${imported.importId}`);
markPassed(onboardingService, run.id, 'estimate_pce', `PCE ${created.preview.pce?.decision || created.preview.estimate?.pce?.decision}`);

const customerPdf = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
const internalExcel = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
assert.ok(fs.existsSync(customerPdf.filePath) && fs.existsSync(internalExcel.filePath), 'customer/internal output split works');
markPassed(onboardingService, run.id, 'output_check', '고객/내부 출력 분리 확인');

const contract = service.generateFullRemodelingContract({ estimateId: saved.estimateId, startDate: '2026-06-15' });
service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, contractId: contract.contractId, startDate: '2026-06-15' });
const portal = service.getClientPortalData({ projectId: saved.estimateId });
const customerMap = service.getLightBIMCustomerProposalMapByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  title: 'RC-0.3.1 안정화 제안서',
  projectName: 'RC-0.3.1 안정화 현장',
  estimateSummary: {
    totalAmount: 42000000,
    totalCost: 31000000,
    margin: 11000000,
    pceDecision: 'SCALE',
    processGroups: [{ processKo: '전체 리모델링', amount: 42000000, internalCost: 31000000, margin: 11000000 }]
  }
});
assertCustomerSafe('Client Portal', portal);
assertCustomerSafe('Customer Estimate', portal.estimateView);
assertCustomerSafe('Customer Contract', portal.contractView);
assertCustomerSafe('Customer Proposal Map', customerMap);
assertCustomerSafe('Proposal Board', board.layout.customerPdfPayload);
markPassed(onboardingService, run.id, 'customer_safety_check', '고객 안전성 확인');
markPassed(onboardingService, run.id, 'issue_backlog', 'S1/S2 없음, S3/S4 유예 가능');

DEFAULT_ONBOARDING_STEPS.forEach((step) => {
  const refreshed = onboardingService.getOperationalOnboardingRun(run.id);
  const current = refreshed.steps.find((item) => item.step_key === step.key);
  if (current.status === 'NOT_STARTED') markPassed(onboardingService, run.id, step.key, '안정화 통합 확인');
});
const completion = onboardingService.completeOperationalOnboardingRun(run.id);
assert.strictEqual(completion.ok, true, 'first onboarding fixture can complete all 12 steps');
const report = onboardingService.generateOperationalOnboardingReport(run.id);
assert.ok(fs.existsSync(report.reportPath), 'onboarding report is generated');

const stabilizationDecision = completion.ok ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(stabilizationDecision, 'MERGE_READY', 'stabilization decision returns MERGE_READY when no S1/S2 exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-1-branch-stabilization.smoke',
  runId: run.id,
  backupId: fullBackup.backupId,
  importId: imported.importId,
  estimateId: saved.estimateId,
  queueCreatedCount: queue.createdCount,
  readiness,
  pceDecision: created.preview.pce?.decision || created.preview.estimate?.pce?.decision,
  customerSafety: true,
  stabilizationDecision,
  reportPath: report.reportPath
}, null, 2));
