'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');

const FORBIDDEN_CUSTOMER_TERMS = [
  'detailed_address',
  'customer_phone',
  'customer_email',
  'memo',
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
  FORBIDDEN_CUSTOMER_TERMS.forEach((term) => {
    assert.ok(!serialized.includes(term.toLowerCase()), `${label} hides ${term}`);
  });
}

const dataDir = path.join(__dirname, 'user-test-data', 'rc-0.3.2', 'real-project-intake');
const intakeFixture = JSON.parse(fs.readFileSync(path.join(dataDir, 'first-real-project-intake.sample.json'), 'utf8'));
const lightbimFixture = JSON.parse(fs.readFileSync(path.join(dataDir, 'first-real-project-intake-lightbim.sample.json'), 'utf8'));

const { service, root } = createTestService('boc-rc032-stabilization');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const draft = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC032-STABILIZATION-DRAFT',
  customerName: '테스트 고객',
  customerType: 'TEST'
});
assert.ok(draft.ok && draft.intakeId, 'intake draft can be created');

const missingValidation = intakeService.validateRealProjectIntake(draft.intakeId);
assert.strictEqual(missingValidation.canGenerateEstimate, false, 'missing required fields block estimate generation');
const blockedEstimate = intakeService.generateEstimateFromIntake(draft.intakeId);
assert.strictEqual(blockedEstimate.blocked, true, 'estimate generation is blocked when required fields are missing');

const complete = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC032-STABILIZATION',
  customerName: intakeFixture.customer_name,
  customerType: intakeFixture.customer_type,
  customerPhone: '010-0000-0000',
  customerEmail: 'test@example.invalid',
  siteName: intakeFixture.site_name,
  addressSummary: intakeFixture.address_summary,
  detailedAddress: '테스트 상세주소는 고객 payload에 노출되면 안 됩니다.',
  buildingType: intakeFixture.building_type,
  floor: intakeFixture.floor,
  elevatorAvailable: intakeFixture.elevator_available,
  parkingAvailable: intakeFixture.parking_available,
  estimateType: intakeFixture.estimate_type,
  totalAreaM2: intakeFixture.total_area_m2,
  budgetAmount: intakeFixture.budget_amount,
  budgetGrade: intakeFixture.budget_grade,
  desiredStartDate: intakeFixture.desired_start_date,
  desiredEndDate: intakeFixture.desired_end_date,
  constructionScope: intakeFixture.construction_scope,
  spaceProgram: intakeFixture.space_program
});
assert.ok(complete.ok, 'completed intake can be created');

const readyValidation = intakeService.validateRealProjectIntake(complete.intakeId);
assert.strictEqual(readyValidation.status, 'READY_FOR_ESTIMATE', 'completed intake validates READY_FOR_ESTIMATE');

const priceReadiness = intakeService.checkPriceProfileReadiness(complete.intakeId);
assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), 'price readiness returns READY/PARTIAL/NEEDS_UPDATE');
assert.ok(priceReadiness.labelKo, 'price readiness has Korean warning label');

const imported = service.importLightBIMPayload({
  payload: lightbimFixture,
  sourceFileName: 'rc-0.3.2-stabilization.lightbim.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM fixture imports');

const connected = intakeService.connectLightBIMImport(complete.intakeId, imported.importId);
assert.ok(connected.ok, 'LightBIM import can be connected');
assert.ok(connected.lightbimSummary.projectName, 'LightBIM summary includes project name');
assert.ok(Number(connected.lightbimSummary.spaceCount) > 0, 'LightBIM summary includes space count');
assert.ok(Number(connected.lightbimSummary.totalAreaM2) > 0, 'LightBIM summary includes total area');
assert.strictEqual(connected.lightbimSummary.suggestedEstimateType, 'FULL_REMODELING', 'LightBIM summary includes suggested estimate type');
assert.ok(Number.isFinite(Number(connected.lightbimSummary.quantityWarningCount)), 'LightBIM summary includes warning count');

const conflict = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC032-STABILIZATION-CONFLICT',
  customerName: '테스트 고객',
  customerType: 'TEST',
  siteName: 'RC-0.3.2 견적 유형 충돌 테스트',
  estimateType: 'BATHROOM',
  totalAreaM2: 84,
  budgetGrade: 'STANDARD',
  constructionScope: ['bathroom'],
  spaceProgram: ['욕실']
});
const conflictConnect = intakeService.connectLightBIMImport(conflict.intakeId, imported.importId);
assert.ok(conflictConnect.warning.includes('선택한 견적 유형과 LightBIM 추천 유형이 다릅니다.'), 'estimate type mismatch warning appears');
assert.strictEqual(conflictConnect.intake.estimate_type, 'BATHROOM', 'user-selected estimate type is not overwritten');

const estimate = intakeService.generateEstimateFromIntake(complete.intakeId);
assert.ok(estimate.ok && estimate.estimateId, 'estimate can be generated from intake');
assert.ok(estimate.pce?.decision || estimate.saved?.pce?.decision || estimate.saved?.estimate?.pce?.decision, 'PCE result exists');

const pce = intakeService.runPCEForIntake(complete.intakeId);
assert.ok(pce.ok && pce.pce, 'PCE can run');

const safety = intakeService.runCustomerSafetyCheckForIntake(complete.intakeId);
assert.strictEqual(safety.ok, true, 'customer safety passes');
assertCustomerSafe('RC-0.3.2 intake customer payload', safety.customerPayload);

const leak = intakeService.runCustomerSafetyCheckForIntake(complete.intakeId, {
  customer_name: '테스트 고객',
  site_name: 'RC-0.3.2 실제 접수 테스트 현장',
  detailed_address: '고객 출력에 노출되면 안 되는 상세주소',
  customer_phone: '010-0000-0000',
  customer_email: 'test@example.invalid',
  memo: '민감 메모',
  internal_cost: 123,
  margin: 456
});
assert.strictEqual(leak.blocked, true, 'detailed_address leak creates S1 issue and blocks customer output');
assert.ok(leak.issueId, 'leak creates S1 issue');

const report = intakeService.createIntakeReport(complete.intakeId);
assert.ok(report.ok && fs.existsSync(report.reportPath), 'intake report can be generated');

const intakes = intakeService.listRealProjectIntakes();
assert.ok(intakes.some((row) => row.intake_id === complete.intakeId), 'list intakes returns created intake');

const refreshed = intakeService.getRealProjectIntake(complete.intakeId);
const unexpectedCritical = refreshed.issues.filter((issue) => (
  issue.resolution_status === 'OPEN'
  && (issue.severity === 'S1' || issue.severity === 'S2')
  && !String(issue.category || '').includes('CUSTOMER_SAFETY')
));
const stabilizationDecision = unexpectedCritical.length === 0 && safety.ok && estimate.ok ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(stabilizationDecision, 'MERGE_READY', 'stabilization decision returns MERGE_READY when no S1/S2 exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-2-branch-stabilization.smoke',
  intakeId: complete.intakeId,
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceDecision: pce.pce.decision || pce.pce.result || 'UNKNOWN',
  priceReadiness: priceReadiness.status,
  customerSafety: safety.ok,
  leakIssueId: leak.issueId,
  conflictWarning: conflictConnect.warning,
  stabilizationDecision,
  reportPath: report.reportPath
}, null, 2));
