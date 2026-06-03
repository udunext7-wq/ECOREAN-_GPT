'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');
const { createActualCustomerPilotService } = require('../electron/services/actualCustomerPilotService');

const root = path.resolve(__dirname, '..');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const manifestPath = path.join(root, 'release', 'RC-0.3.3', 'RELEASE_MANIFEST.json');
const lightbimPath = path.join(root, 'tests', 'user-test-data', 'rc-0.3.2', 'real-project-intake', 'first-real-project-intake-lightbim.sample.json');
const productionUserDataRoot = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'ecorean-boc-electron');

assert.ok(fs.existsSync(exePath), 'packaged exe exists');
assert.ok(fs.existsSync(manifestPath), 'RC-0.3.3 manifest exists');
assert.ok(fs.existsSync(lightbimPath), 'LightBIM fixture exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.3', 'manifest version is RC-0.3.3');
assert.strictEqual(manifest.tag, 'v0.3.3-rc', 'manifest tag is v0.3.3-rc');
assert.strictEqual(manifest.privacy_anonymization_status, 'PASSED', 'manifest privacy anonymization status is PASSED');

const { service, root: tempRoot } = createTestService('boc-rc033-packaged-actual-customer-pilot');
const app = {
  isPackaged: true,
  getPath: (name) => (name === 'userData' ? productionUserDataRoot : tempRoot)
};
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const reportsDir = path.join(tempRoot, 'docs');
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir });
const pilotService = createActualCustomerPilotService({ sqliteService: service, reportsDir });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const backup = backupRestoreService.createFullUserDataBackup({
  actor: 'CEO',
  notes: 'RC-0.3.3 packaged actual customer pilot smoke pre-run backup'
});
assert.ok(backup.backupId && backup.backupId.startsWith('FULL-'), 'full backup is created before pilot');
assert.ok(fs.existsSync(backup.manifestPath), 'backup manifest exists');
assert.ok(backup.backupPath.startsWith(path.join(productionUserDataRoot, 'backups')), 'backup path is under userData/backups');
assert.ok(backupRestoreService.listBackups().some((row) => row.backupId === backup.backupId), 'backup_history record exists');

const pilot = pilotService.createActualCustomerPilotRun({
  pilotId: 'ACP-RC033-PACKAGED-PILOT',
  version: 'RC-0.3.3',
  projectName: 'RC-0.3.3 패키지 Pilot 현장',
  customerName: '익명 고객 A',
  customerPhone: '010-9876-5432',
  customerEmail: 'packaged-pilot@example.invalid',
  detailedAddress: '서울시 테스트구 상세주소 202동 2002호',
  memo: '패키지 Pilot 고객 메모 원문'
});
assert.ok(pilot.ok && pilot.pilotId, 'pilot run can be created');
assert.strictEqual(pilot.run.anonymized_customer_name, '익명 고객 A', 'test anonymized customer name is preserved safely');

const intakeId = 'RPI-RC033-PACKAGED-PILOT';
const intake = intakeService.createRealProjectIntake({
  intakeId,
  customerName: '익명 고객 A',
  customerType: 'PILOT',
  siteName: 'RC-0.3.3 패키지 Pilot 현장',
  addressSummary: '서울 테스트 권역',
  detailedAddress: '서울시 테스트구 상세주소 202동 2002호',
  customerPhone: '010-9876-5432',
  customerEmail: 'packaged-pilot@example.invalid',
  memo: '패키지 Pilot 고객 메모 원문',
  buildingType: 'APARTMENT',
  floor: '중층',
  elevatorAvailable: true,
  parkingAvailable: true,
  estimateType: 'FULL_REMODELING',
  totalAreaM2: 84,
  budgetGrade: 'STANDARD',
  constructionScope: ['철거', '욕실', '주방', '바닥', '도배', '조명'],
  spaceProgram: [
    { name: '거실', areaM2: 24 },
    { name: '주방', areaM2: 10 },
    { name: '욕실', areaM2: 5 },
    { name: '침실', areaM2: 18 }
  ]
});
assert.ok(intake.ok, 'anonymized intake can be created');

const linked = pilotService.connectPilotToIntake(pilot.pilotId, intakeId);
assert.strictEqual(linked.run.intake_id, intakeId, 'pilot can connect to intake');

const validation = intakeService.validateRealProjectIntake(intakeId);
assert.strictEqual(validation.canGenerateEstimate, true, 'intake validates for estimate generation');

const imported = service.importLightBIMPayload({
  payload: JSON.parse(fs.readFileSync(lightbimPath, 'utf8')),
  sourceFileName: 'rc-0.3.3-packaged-pilot.lightbim.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM can import');

const connected = intakeService.connectLightBIMImport(intakeId, imported.importId);
assert.ok(connected.ok, 'LightBIM can connect to intake');
assert.ok(connected.lightbimSummary.projectName, 'LightBIM summary includes project name');
assert.ok(Number(connected.lightbimSummary.spaceCount) > 0, 'LightBIM summary includes space count');

const priceReadiness = intakeService.checkPriceProfileReadiness(intakeId);
assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), 'price readiness returns supported status');

const estimate = intakeService.generateEstimateFromIntake(intakeId);
assert.ok(estimate.ok && estimate.estimateId, 'estimate can be generated');

const pce = intakeService.runPCEForIntake(intakeId);
const pceDecision = pce.pce?.decision || pce.pce?.result;
assert.ok(pce.ok && ['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(pceDecision), 'PCE result exists');

const safety = intakeService.runCustomerSafetyCheckForIntake(intakeId);
assert.strictEqual(safety.ok, true, 'customer safety passes for sanitized output');
assert.strictEqual(safety.blocked, false, 'customer output is not blocked for safe payload');

const leak = intakeService.runCustomerSafetyCheckForIntake(intakeId, {
  customer_name: '익명 고객 A',
  site_name: 'RC-0.3.3 패키지 Pilot 현장',
  detailed_address: '서울시 테스트구 상세주소 202동 2002호',
  customer_phone: '010-9876-5432',
  customer_email: 'packaged-pilot@example.invalid',
  memo: '패키지 Pilot 고객 메모 원문',
  internal_cost: 42000000,
  margin: 8000000,
  pce: { decision: 'SCALE' },
  risk_score: 0.6
});
assert.strictEqual(leak.blocked, true, 'sensitive/internal leak is blocked');
assert.ok(leak.issueId, 'S1 issue is created for leak injection');

pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'backup', status: 'PASSED', payload: { backupId: backup.backupId } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'intake', status: 'PASSED', payload: { intakeId, customerPhone: '010-9876-5432' } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'lightbim', status: 'PASSED', payload: { lightbimImportId: imported.importId } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'price_readiness', status: 'PASSED', payload: { status: priceReadiness.status } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'estimate_pce', status: 'PASSED', payload: { estimateId: estimate.estimateId, pceDecision } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'customer_safety', status: 'PASSED', payload: { customerSafety: 'PASSED' } });

pilotService.createActualCustomerPilotRun({
  pilotId: pilot.pilotId,
  version: 'RC-0.3.3',
  intakeId,
  projectName: 'RC-0.3.3 패키지 Pilot 현장',
  anonymizedCustomerName: '익명 고객 A',
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceResult: pceDecision,
  customerOutputStatus: 'READY',
  internalOutputStatus: 'READY',
  customerSafetyStatus: 'PASSED'
});

const report = pilotService.generateActualCustomerPilotReport(pilot.pilotId);
assert.ok(report.ok && fs.existsSync(report.reportPath), 'pilot report can be generated');
assert.strictEqual(report.finalDecision, '실제 고객 Pilot 가능', 'final decision can be calculated');

const reportText = fs.readFileSync(report.reportPath, 'utf8');
['010-9876-5432', 'packaged-pilot@example.invalid', '202동 2002호', '패키지 Pilot 고객 메모 원문'].forEach((secret) => {
  assert.ok(!reportText.includes(secret), `pilot report does not store raw sensitive value: ${secret}`);
});

const restartedPilotService = createActualCustomerPilotService({ sqliteService: service, reportsDir });
const restartedIntakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir });
const persistedSummary = restartedPilotService.getActualCustomerPilotSummary(pilot.pilotId);
const persistedIntake = restartedIntakeService.getRealProjectIntake(intakeId);
const persistedBackup = backupRestoreService.listBackups().some((row) => row.backupId === backup.backupId);
assert.strictEqual(persistedSummary.finalDecision, '실제 고객 Pilot 가능', 'pilot run persists after service restart simulation');
assert.ok(persistedIntake && persistedIntake.intake_id === intakeId, 'intake persists after service restart simulation');
assert.ok(persistedBackup, 'backup record persists after service restart simulation');
assert.ok(fs.existsSync(report.reportPath), 'pilot report persists after service restart simulation');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-3-packaged-actual-customer-pilot-run.smoke',
  packagedExe: exePath,
  backupId: backup.backupId,
  backupManifestPath: backup.manifestPath,
  pilotId: pilot.pilotId,
  intakeId,
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceDecision,
  priceReadiness: priceReadiness.status,
  customerOutput: 'READY',
  internalOutput: 'READY',
  privacyAnonymization: 'PASSED',
  customerSafety: 'PASSED',
  restartPersistence: 'PASSED',
  reportPath: report.reportPath,
  finalDecision: report.finalDecision
}, null, 2));

