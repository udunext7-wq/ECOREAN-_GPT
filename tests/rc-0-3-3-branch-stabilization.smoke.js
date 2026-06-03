'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createRealProjectIntakeService } = require('../electron/services/realProjectIntakeService');
const { createActualCustomerPilotService } = require('../electron/services/actualCustomerPilotService');

function stabilizationDecision({ finalDecision, reportText, safetyOk, estimateOk, pceOk }) {
  const forbidden = ['010-1234-5678', 'real@example.invalid', '101동 1001호', '실제 고객 메모 원문'];
  const leaked = forbidden.some((term) => reportText.includes(term));
  if (leaked || !safetyOk || !estimateOk || !pceOk) return 'NOT_READY';
  if (finalDecision === '실제 고객 Pilot 가능') return 'MERGE_READY';
  return 'CONDITIONAL_MERGE_READY';
}

const { service, root } = createTestService('boc-rc033-stabilization');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const intakeService = createRealProjectIntakeService({ sqliteService: service, reportsDir: path.join(root, 'docs') });
const pilotService = createActualCustomerPilotService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const backup = backupRestoreService.createFullUserDataBackup({
  actor: 'CEO',
  notes: 'RC-0.3.3 branch stabilization backup'
});
assert.ok(backup.backupId, 'backup can be created');

const pilot = pilotService.createActualCustomerPilotRun({
  pilotId: 'ACP-RC033-STABILIZATION',
  version: 'RC-0.3.3',
  projectName: 'RC-0.3.3 안정화 Pilot 현장',
  customerName: '김대표',
  customerPhone: '010-1234-5678',
  customerEmail: 'real@example.invalid',
  detailedAddress: '서울시 테스트구 상세주소 101동 1001호',
  memo: '실제 고객 메모 원문'
});
assert.ok(pilot.ok, 'pilot run can be created');
assert.strictEqual(pilot.run.anonymized_customer_name, '김**', 'pilot customer name is anonymized');

const intake = intakeService.createRealProjectIntake({
  intakeId: 'RPI-RC033-STABILIZATION',
  customerName: '익명 고객',
  customerType: 'PILOT',
  siteName: 'RC-0.3.3 안정화 Pilot 현장',
  addressSummary: '서울 / 익명화 주소 요약',
  detailedAddress: '서울시 테스트구 상세주소 101동 1001호',
  customerPhone: '010-1234-5678',
  customerEmail: 'real@example.invalid',
  memo: '실제 고객 메모 원문',
  buildingType: 'APARTMENT',
  floor: '중층',
  elevatorAvailable: true,
  parkingAvailable: true,
  estimateType: 'FULL_REMODELING',
  totalAreaM2: 84,
  budgetGrade: 'STANDARD',
  constructionScope: ['철거', '욕실', '주방', '바닥', '도배', '조명'],
  spaceProgram: ['거실', '주방', '욕실', '침실']
});
assert.ok(intake.ok, 'intake can be created');

const linked = pilotService.connectPilotToIntake(pilot.pilotId, intake.intakeId);
assert.strictEqual(linked.run.intake_id, intake.intakeId, 'intake can connect to pilot');

const validation = intakeService.validateRealProjectIntake(intake.intakeId);
assert.strictEqual(validation.canGenerateEstimate, true, 'intake validates for estimate');

const lightBimPath = path.join(__dirname, 'user-test-data', 'rc-0.3.2', 'real-project-intake', 'first-real-project-intake-lightbim.sample.json');
assert.ok(fs.existsSync(lightBimPath), 'LightBIM fixture exists');
const imported = service.importLightBIMPayload({
  payload: JSON.parse(fs.readFileSync(lightBimPath, 'utf8')),
  sourceFileName: 'rc-0.3.3-stabilization.lightbim.json'
});
assert.ok(imported.ok && imported.importId, 'LightBIM fixture imports');

const connected = intakeService.connectLightBIMImport(intake.intakeId, imported.importId);
assert.ok(connected.ok, 'LightBIM can connect');

const priceReadiness = intakeService.checkPriceProfileReadiness(intake.intakeId);
assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), 'price readiness returns supported status');

const estimate = intakeService.generateEstimateFromIntake(intake.intakeId);
assert.ok(estimate.ok && estimate.estimateId, 'estimate can be generated');

const pce = intakeService.runPCEForIntake(intake.intakeId);
assert.ok(pce.ok && pce.pce, 'PCE result exists');

const safety = intakeService.runCustomerSafetyCheckForIntake(intake.intakeId);
assert.strictEqual(safety.ok, true, 'customer safety passes');

const leak = intakeService.runCustomerSafetyCheckForIntake(intake.intakeId, {
  customer_name: '익명 고객',
  site_name: 'RC-0.3.3 안정화 Pilot 현장',
  detailed_address: '서울시 테스트구 상세주소 101동 1001호',
  customer_phone: '010-1234-5678',
  customer_email: 'real@example.invalid',
  memo: '실제 고객 메모 원문',
  internal_cost: 41000000,
  margin: 9000000,
  pce: { decision: 'SCALE' }
});
assert.strictEqual(leak.blocked, true, 'leak injection creates S1 customer-safety block');
assert.ok(leak.issueId, 'leak injection creates S1 intake issue');

pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'backup', status: 'PASSED', payload: { backupId: backup.backupId } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'intake_connection', status: 'PASSED', payload: { intakeId: intake.intakeId } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'privacy_anonymization', status: 'PASSED', payload: { customerPhone: '010-1234-5678' } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'lightbim', status: 'PASSED', payload: { lightbimImportId: imported.importId } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'estimate_pce', status: 'PASSED', payload: { estimateId: estimate.estimateId, pceDecision: pce.pce.decision || pce.pce.result } });
pilotService.recordPilotStep(pilot.pilotId, { stepKey: 'customer_safety', status: 'PASSED', payload: { customerSafety: 'PASSED' } });
pilotService.createPilotIssue(pilot.pilotId, {
  severity: 'S4',
  screen: 'Pilot report',
  description: '안정화 smoke에서 기록한 비차단 확인 항목입니다.',
  status: 'DEFERRED',
  decision: '후속 Pilot 중 계속 관찰',
  targetVersion: 'RC-0.3.3'
});

pilotService.createActualCustomerPilotRun({
  pilotId: pilot.pilotId,
  version: 'RC-0.3.3',
  intakeId: intake.intakeId,
  projectName: 'RC-0.3.3 안정화 Pilot 현장',
  anonymizedCustomerName: '익명 고객',
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceResult: pce.pce.decision || pce.pce.result,
  customerOutputStatus: 'READY',
  internalOutputStatus: 'READY',
  customerSafetyStatus: 'PASSED'
});

const report = pilotService.generateActualCustomerPilotReport(pilot.pilotId);
assert.ok(report.ok && fs.existsSync(report.reportPath), 'pilot report can be generated');
assert.strictEqual(report.finalDecision, '실제 고객 Pilot 가능', 'final decision can be calculated');

const reportText = fs.readFileSync(report.reportPath, 'utf8');
['010-1234-5678', 'real@example.invalid', '101동 1001호', '실제 고객 메모 원문'].forEach((secret) => {
  assert.ok(!reportText.includes(secret), `report blocks raw sensitive value: ${secret}`);
});
['internal cost', 'margin', 'vendor data', 'approval queue', 'risk_score'].forEach((term) => {
  assert.ok(!JSON.stringify(safety.customerPayload).toLowerCase().includes(term), `customer payload hides ${term}`);
});

const decision = stabilizationDecision({
  finalDecision: report.finalDecision,
  reportText,
  safetyOk: safety.ok,
  estimateOk: estimate.ok,
  pceOk: pce.ok
});
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision returns MERGE_READY when no S1/S2 remains');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-3-branch-stabilization.smoke',
  pilotId: pilot.pilotId,
  backupId: backup.backupId,
  intakeId: intake.intakeId,
  lightbimImportId: imported.importId,
  estimateId: estimate.estimateId,
  pceDecision: pce.pce.decision || pce.pce.result,
  priceReadiness: priceReadiness.status,
  customerSafety: 'PASSED',
  reportPath: report.reportPath,
  stabilizationDecision: decision
}, null, 2));
