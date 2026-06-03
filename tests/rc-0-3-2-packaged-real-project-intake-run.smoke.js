'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');

const root = path.resolve(__dirname, '..');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const manifestPath = path.join(root, 'release', 'RC-0.3.2', 'RELEASE_MANIFEST.json');
const lightbimPath = path.join(root, 'tests', 'user-test-data', 'rc-0.3.2', 'real-project-intake', 'first-real-project-intake-lightbim.sample.json');
const productionUserDataRoot = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'ecorean-boc-electron');

assert.ok(fs.existsSync(exePath), 'packaged exe exists');
assert.ok(fs.existsSync(manifestPath), 'RC-0.3.2 manifest exists');
assert.ok(fs.existsSync(lightbimPath), 'LightBIM intake fixture exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.2', 'manifest version is RC-0.3.2');
assert.strictEqual(manifest.tag, 'v0.3.2-rc', 'manifest tag is v0.3.2-rc');

const { service, root: tempRoot } = createTestService('boc-rc032-packaged-intake-run');
const app = {
  isPackaged: true,
  getPath: (name) => (name === 'userData' ? productionUserDataRoot : tempRoot)
};
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const intakeReportsDir = path.join(tempRoot, 'docs');
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: intakeReportsDir });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const backup = backupRestoreService.createFullUserDataBackup({
  actor: 'CEO',
  notes: 'RC-0.3.2 packaged real project intake smoke pre-run backup'
});
assert.ok(backup.backupId && backup.backupId.startsWith('FULL-'), 'full backup is created before intake run');
assert.ok(fs.existsSync(backup.manifestPath), 'backup manifest exists');
assert.ok(backup.backupPath.startsWith(path.join(productionUserDataRoot, 'backups')), 'backup path is under userData/backups');
assert.ok(backupRestoreService.listBackups().some((row) => row.backupId === backup.backupId), 'backup_history record exists');

const draft = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC032-PACKAGED-DRAFT',
  customerName: '테스트 고객',
  customerType: 'TEST'
});
assert.ok(draft.ok, 'intake draft can be created');

const blocked = intakeService.validateRealProjectIntake(draft.intakeId);
assert.strictEqual(blocked.canGenerateEstimate, false, 'missing required fields block estimate generation');

const intakeId = 'RPI-RC032-PACKAGED-REAL-TEST';
const complete = intakeService.createRealProjectIntake({
  intakeId,
  customerName: '테스트 고객',
  customerType: 'TEST',
  siteName: 'RC-0.3.2 패키지 접수 테스트 현장',
  addressSummary: '서울 테스트 권역',
  buildingType: 'APARTMENT',
  floor: '10F',
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
assert.ok(complete.ok, 'customer/site fields can be saved safely');

const ready = intakeService.validateRealProjectIntake(intakeId);
assert.strictEqual(ready.canGenerateEstimate, true, 'completed intake validates');
assert.strictEqual(ready.status, 'READY_FOR_ESTIMATE', 'completed intake is ready for estimate');

const priceReadiness = intakeService.checkPriceProfileReadiness(intakeId);
assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), 'price readiness returns supported status');
assert.ok(priceReadiness.labelKo, 'price readiness includes Korean label');

const imported = service.importLightBIMPayload({
  payload: JSON.parse(fs.readFileSync(lightbimPath, 'utf8')),
  sourceFileName: 'first-real-project-intake-lightbim.sample.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM fixture imports');

const connected = intakeService.connectLightBIMImport(intakeId, imported.importId);
assert.ok(connected.ok, 'LightBIM can connect to intake');
assert.ok(connected.lightbimSummary.projectName, 'LightBIM project name appears');
assert.ok(Number(connected.lightbimSummary.spaceCount) > 0, 'LightBIM space count appears');
assert.ok(Number(connected.lightbimSummary.totalAreaM2) > 0, 'LightBIM total area appears');
assert.ok(connected.lightbimSummary.suggestedEstimateType, 'LightBIM suggested estimate type appears');

const estimate = intakeService.generateEstimateFromIntake(intakeId);
assert.ok(estimate.ok && estimate.estimateId, 'estimate can be generated from intake');
assert.ok(estimate.saved?.estimate || estimate.saved, 'estimate payload exists');

const pce = intakeService.runPCEForIntake(intakeId);
assert.ok(pce.ok && pce.pce, 'PCE result exists');
assert.ok(['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(pce.pce.decision || pce.pce.result), 'PCE decision is supported');

const safety = intakeService.runCustomerSafetyCheckForIntake(intakeId);
assert.strictEqual(safety.ok, true, 'customer safety passes');
const customerPayloadText = JSON.stringify(safety.customerPayload).toLowerCase();
[
  'detailed_address',
  'customer_phone',
  'customer_email',
  'memo',
  'internal cost',
  'margin',
  'pce',
  'vendor',
  'approval queue',
  'risk_score'
].forEach((term) => {
  assert.ok(!customerPayloadText.includes(term), `customer payload hides ${term}`);
});

const leak = intakeService.runCustomerSafetyCheckForIntake(intakeId, {
  customer_name: '테스트 고객',
  site_name: 'RC-0.3.2 패키지 접수 테스트 현장',
  detailed_address: '서울시 테스트구 상세주소 101동 1001호',
  customer_phone: '010-0000-0000',
  customer_email: 'test@example.invalid',
  memo: '고객 메모',
  internal_cost: 100,
  margin: 10,
  pce: { decision: 'SCALE' }
});
assert.strictEqual(leak.blocked, true, 'customer safety blocks sensitive fields');
assert.ok(leak.issueId, 'S1 issue is created for sensitive leak');

const report = intakeService.createIntakeReport(intakeId);
assert.ok(report.ok, 'intake report can be generated');
assert.ok(fs.existsSync(report.reportPath), 'intake report file exists');

const restartedIntakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: intakeReportsDir });
const persisted = restartedIntakeService.getRealProjectIntake(intakeId);
assert.ok(persisted && persisted.intake_id === intakeId, 'intake data persists after service restart simulation');
assert.ok(restartedIntakeService.listRealProjectIntakes().some((row) => row.intake_id === intakeId), 'created intake appears after restart simulation');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-2-packaged-real-project-intake-run.smoke',
  packagedExe: exePath,
  backupId: backup.backupId,
  backupManifestPath: backup.manifestPath,
  intakeId,
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceDecision: pce.pce.decision || pce.pce.result,
  priceReadiness: priceReadiness.status,
  customerSafety: 'PASSED',
  reportPath: report.reportPath,
  restartPersistence: 'PASSED',
  finalDecision: '패키지 접수 흐름 사용 가능'
}, null, 2));
