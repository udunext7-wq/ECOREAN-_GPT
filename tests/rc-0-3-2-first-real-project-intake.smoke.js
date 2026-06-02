'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');

const dataDir = path.join(__dirname, 'user-test-data', 'rc-0.3.2', 'real-project-intake');
const intakePath = path.join(dataDir, 'first-real-project-intake.sample.json');
const lightbimPath = path.join(dataDir, 'first-real-project-intake-lightbim.sample.json');
const expectedPath = path.join(dataDir, 'first-real-project-intake-expected-results.json');

[intakePath, lightbimPath, expectedPath].forEach((filePath) => {
  assert.ok(fs.existsSync(filePath), `${path.basename(filePath)} fixture loads`);
});

const intakeFixture = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const lightbimFixture = JSON.parse(fs.readFileSync(lightbimPath, 'utf8'));
const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8')).expected;

const { service, root } = createTestService('boc-rc032-first-intake');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const incomplete = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC032-INCOMPLETE',
  customerName: intakeFixture.customer_name,
  customerType: 'TEST'
});
assert.ok(incomplete.ok && incomplete.intakeId, 'draft intake can be created');
assert.strictEqual(incomplete.intake.status, expected.initial_status, 'draft starts as DRAFT');

const incompleteValidation = intakeService.validateRealProjectIntake(incomplete.intakeId);
assert.strictEqual(incompleteValidation.canGenerateEstimate, false, 'incomplete intake is blocked for estimate');
assert.ok(incompleteValidation.missing.some((message) => message.includes('현장명')), 'required fields are validated');

const complete = intakeService.createRealProjectIntake({
  intakeId: intakeFixture.intake_id,
  customerName: intakeFixture.customer_name,
  customerType: intakeFixture.customer_type,
  siteName: intakeFixture.site_name,
  addressSummary: intakeFixture.address_summary,
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
assert.ok(complete.ok, 'customer/site fields can be saved safely');

const completeValidation = intakeService.validateRealProjectIntake(intakeFixture.intake_id);
assert.strictEqual(completeValidation.canGenerateEstimate, true, 'completed intake validates READY_FOR_ESTIMATE');
assert.strictEqual(completeValidation.status, expected.validation_status, 'completed intake status is READY_FOR_ESTIMATE');

const priceReadiness = intakeService.checkPriceProfileReadiness(intakeFixture.intake_id);
assert.ok(expected.price_readiness_allowed.includes(priceReadiness.status), 'price readiness returns status');
assert.ok(priceReadiness.labelKo, 'price readiness returns Korean label');

const imported = service.importLightBIMPayload({
  payload: lightbimFixture,
  sourceFileName: 'first-real-project-intake-lightbim.sample.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM fixture imports');

const connected = intakeService.connectLightBIMImport(intakeFixture.intake_id, imported.importId);
assert.ok(connected.ok, 'LightBIM import connects');
assert.strictEqual(connected.lightbimSummary.suggestedEstimateType, expected.estimate_type, 'LightBIM summary appears with FULL_REMODELING recommendation');
assert.ok(Number(connected.lightbimSummary.spaceCount) >= expected.minimum_space_count, 'LightBIM summary includes expected space count');

const estimate = intakeService.generateEstimateFromIntake(intakeFixture.intake_id);
assert.ok(estimate.ok, 'estimate is generated from intake');
assert.ok(estimate.estimateId, 'estimate ID is generated');
assert.ok(estimate.pce?.decision || estimate.saved?.pce?.decision || estimate.saved?.estimate?.pce?.decision, 'PCE result exists after estimate generation');

const pce = intakeService.runPCEForIntake(intakeFixture.intake_id);
assert.ok(pce.ok && pce.pce, 'PCE can run from intake');

const safety = intakeService.runCustomerSafetyCheckForIntake(intakeFixture.intake_id);
assert.strictEqual(safety.ok, true, 'customer safety passes');
assert.strictEqual(safety.customerPayload.customer_safe, expected.customer_safety, 'customer payload is marked safe');
assert.ok(!JSON.stringify(safety.customerPayload).toLowerCase().includes('detailed_address'), 'safe customer payload hides detailed address');

const leak = intakeService.runCustomerSafetyCheckForIntake(intakeFixture.intake_id, {
  customer_name: intakeFixture.customer_name,
  site_name: intakeFixture.site_name,
  detailed_address: '서울시 테스트구 상세주소 101동 1001호',
  internal_cost: 31000000,
  margin: 9000000,
  pce: { decision: 'SCALE' }
});
assert.strictEqual(leak.blocked, expected.leak_blocks_output, 'injected leak creates S1 issue and blocks output');
assert.ok(leak.issueId, 'S1 issue is recorded for customer leak');
assert.ok(leak.leaks.includes('detailed_address') || leak.leaks.includes('detailed address'), 'detailed address leak is detected');

const report = intakeService.createIntakeReport(intakeFixture.intake_id);
assert.ok(report.ok, 'intake report is generated');
assert.ok(fs.existsSync(report.reportPath), 'intake report file exists');

const intakes = intakeService.listRealProjectIntakes();
assert.ok(intakes.some((row) => row.intake_id === intakeFixture.intake_id), 'list intakes returns created intake');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-2-first-real-project-intake.smoke',
  intakeId: intakeFixture.intake_id,
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceDecision: pce.pce.decision || pce.pce.result || 'UNKNOWN',
  priceReadiness: priceReadiness.status,
  customerSafety: safety.ok,
  leakIssueId: leak.issueId,
  reportPath: report.reportPath,
  finalDecision: expected.final_decision
}, null, 2));
