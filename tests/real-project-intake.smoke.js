'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');

const { service, root } = createTestService('boc-real-project-intake');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const draft = intakeService.createRealProjectIntake({
  customerName: 'RC-0.3.2 테스트 고객',
  customerType: 'TEST'
});
assert.ok(draft.ok && draft.intakeId, 'intake draft can be created');
assert.strictEqual(draft.intake.status, 'DRAFT', 'incomplete intake can be saved as DRAFT');

const blockedValidation = intakeService.validateRealProjectIntake(draft.intakeId);
assert.strictEqual(blockedValidation.canGenerateEstimate, false, 'validation blocks missing required fields for estimate');
assert.ok(blockedValidation.missing.length > 0, 'missing required fields are reported');

const updated = intakeService.updateRealProjectIntake(draft.intakeId, {
  customerName: 'RC-0.3.2 테스트 고객',
  customerType: 'TEST',
  siteName: 'RC-0.3.2 실제 프로젝트 접수 테스트 현장',
  addressSummary: '서울 / 테스트 주소',
  buildingType: '아파트',
  floor: '중층',
  elevatorAvailable: true,
  parkingAvailable: true,
  estimateType: 'FULL_REMODELING',
  totalAreaM2: 48.5,
  budgetAmount: 45000000,
  budgetGrade: 'STANDARD',
  desiredStartDate: '2026-06-10',
  desiredEndDate: '2026-07-20',
  constructionScope: ['철거', '설비', '방수', '타일', '목공', '전기', '도배', '바닥', '마감'],
  spaceProgram: ['욕실', '주방', '거실', '침실', '현관']
});
assert.ok(updated.ok, 'full remodeling intake can be updated');

const readyValidation = intakeService.validateRealProjectIntake(draft.intakeId);
assert.strictEqual(readyValidation.canGenerateEstimate, true, 'full remodeling intake validates as READY_FOR_ESTIMATE');
assert.strictEqual(readyValidation.status, 'READY_FOR_ESTIMATE', 'ready intake status is set');

const lightBimPath = path.join(__dirname, 'user-test-data', 'rc-0.3.1', 'first-operational-onboarding', 'first-project-lightbim.sample.json');
assert.ok(fs.existsSync(lightBimPath), 'LightBIM fixture exists');
const lightBimPayload = JSON.parse(fs.readFileSync(lightBimPath, 'utf8'));
const imported = service.importLightBIMPayload({ payload: lightBimPayload, sourceFileName: 'rc-0.3.2-intake.lightbim.json' });
assert.ok(imported.ok && imported.importId, 'LightBIM fixture imports');

const connected = intakeService.connectLightBIMImport(draft.intakeId, imported.importId);
assert.ok(connected.ok, 'LightBIM import can be connected');
assert.strictEqual(connected.lightbimSummary.importId, imported.importId, 'LightBIM summary returns connected import');

const priceReadiness = intakeService.checkPriceProfileReadiness(draft.intakeId);
assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), 'price readiness returns READY/PARTIAL/NEEDS_UPDATE');
assert.ok(priceReadiness.labelKo, 'price readiness returns Korean label');

const estimate = intakeService.generateEstimateFromIntake(draft.intakeId);
assert.ok(estimate.ok, 'estimate can be generated from intake');
assert.ok(estimate.estimateId, 'generated estimate id exists');
assert.ok(estimate.pce?.decision || estimate.saved?.pce?.decision || estimate.saved?.estimate?.pce?.decision, 'PCE result exists');

const pce = intakeService.runPCEForIntake(draft.intakeId);
assert.ok(pce.ok && pce.pce, 'runPCEForIntake returns existing PCE result');

const safety = intakeService.runCustomerSafetyCheckForIntake(draft.intakeId);
assert.strictEqual(safety.ok, true, 'customer safety check passes for safe payload');
assert.strictEqual(safety.customerPayload.customer_safe, true, 'customer-safe payload is marked safe');

const leak = intakeService.runCustomerSafetyCheckForIntake(draft.intakeId, {
  customer_name: 'RC-0.3.2 테스트 고객',
  site_name: 'RC-0.3.2 실제 프로젝트 접수 테스트 현장',
  margin: 1200000,
  internal_cost: 30000000
});
assert.strictEqual(leak.blocked, true, 'customer leak creates S1 issue and blocks output');
assert.ok(leak.issueId, 'customer leak creates intake issue');

const report = intakeService.createIntakeReport(draft.intakeId);
assert.ok(report.ok, 'intake report is generated');
assert.ok(fs.existsSync(report.reportPath), 'intake report file exists');

const intakes = intakeService.listRealProjectIntakes();
assert.ok(intakes.some((item) => item.intake_id === draft.intakeId), 'list intakes returns created intake');

console.log('RC-0.3.2 real project intake smoke passed');
