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
const fixtureDir = path.join(root, 'tests', 'fixtures', 'lightbim');
const productionUserDataRoot = path.join(process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'), 'ecorean-boc-electron');

const scenarios = [
  {
    key: 'bathroom',
    label: 'Pilot A',
    pilotId: 'ACP-RC034-BATHROOM-PILOT',
    intakeId: 'RPI-RC034-BATHROOM-PILOT',
    customerName: '익명 고객 A',
    siteName: 'RC-0.3.4 욕실 Pilot 현장',
    estimateType: 'BATHROOM',
    areaM2: 5,
    budgetGrade: 'STANDARD',
    constructionScope: ['철거', '욕실', '방수', '타일', '도기', '조명'],
    spaceProgram: [{ name: '욕실', areaM2: 5 }],
    lightbimFixture: 'bathroom-lightbim.sample.json',
    friction: '욕실 단독 Pilot은 필수 접수 항목이 짧아 입력 흐름이 가장 빠름.'
  },
  {
    key: 'kitchen',
    label: 'Pilot B',
    pilotId: 'ACP-RC034-KITCHEN-PILOT',
    intakeId: 'RPI-RC034-KITCHEN-PILOT',
    customerName: '익명 고객 B',
    siteName: 'RC-0.3.4 주방 Pilot 현장',
    estimateType: 'KITCHEN',
    areaM2: 12,
    budgetGrade: 'STANDARD',
    constructionScope: ['철거', '주방 가구', '상판', '싱크볼', '수전', '조명'],
    spaceProgram: [{ name: '주방', areaM2: 12 }],
    lightbimFixture: 'kitchen-lightbim.sample.json',
    friction: '주방 Pilot은 품목 선택과 단가 준비 상태 확인 단계에서 검토 시간이 늘어남.'
  },
  {
    key: 'full-remodeling',
    label: 'Pilot C',
    pilotId: 'ACP-RC034-FULL-PILOT',
    intakeId: 'RPI-RC034-FULL-PILOT',
    customerName: '익명 고객 C',
    siteName: 'RC-0.3.4 전체 리모델링 Pilot 현장',
    estimateType: 'FULL_REMODELING',
    areaM2: 84,
    budgetGrade: 'STANDARD',
    constructionScope: ['철거', '욕실', '주방', '바닥', '도배', '조명'],
    spaceProgram: [
      { name: '거실', areaM2: 24 },
      { name: '주방', areaM2: 10 },
      { name: '욕실', areaM2: 5 },
      { name: '침실', areaM2: 18 }
    ],
    lightbimFixture: 'full-remodeling-lightbim.sample.json',
    friction: '전체 리모델링 Pilot은 LightBIM 수량 검토와 PCE 해석 확인이 가장 중요함.'
  }
];

const { service, root: tempRoot } = createTestService('boc-rc034-pilot-expansion');
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

function assertReportIsAnonymous(reportPath, forbiddenValues) {
  const reportText = fs.readFileSync(reportPath, 'utf8');
  forbiddenValues.forEach((secret) => {
    assert.ok(!reportText.includes(secret), `pilot report does not store raw sensitive value: ${secret}`);
  });
}

function runScenario(scenario) {
  const fixturePath = path.join(fixtureDir, scenario.lightbimFixture);
  assert.ok(fs.existsSync(fixturePath), `${scenario.label} LightBIM fixture exists`);

  const backup = backupRestoreService.createFullUserDataBackup({
    actor: 'CEO',
    notes: `RC-0.3.4 ${scenario.label} expansion pre-pilot backup`
  });
  assert.ok(backup.backupId, `${scenario.label} backup created`);
  assert.ok(fs.existsSync(backup.manifestPath), `${scenario.label} backup manifest exists`);

  const pilot = pilotService.createActualCustomerPilotRun({
    pilotId: scenario.pilotId,
    version: 'RC-0.3.4',
    projectName: scenario.siteName,
    customerName: scenario.customerName,
    customerPhone: `${scenario.key}-phone-secret`,
    customerEmail: `${scenario.key}@example.invalid`,
    detailedAddress: `${scenario.label} 상세주소 원문`,
    memo: `${scenario.label} 고객 메모 원문`
  });
  assert.ok(pilot.ok, `${scenario.label} pilot run can be created`);
  assert.strictEqual(pilot.run.anonymized_customer_name, scenario.customerName, `${scenario.label} anonymized customer is safe`);

  const intake = intakeService.createRealProjectIntake({
    intakeId: scenario.intakeId,
    customerName: scenario.customerName,
    customerType: 'PILOT',
    siteName: scenario.siteName,
    addressSummary: '익명화 주소 요약',
    detailedAddress: `${scenario.label} 상세주소 원문`,
    customerPhone: `${scenario.key}-phone-secret`,
    customerEmail: `${scenario.key}@example.invalid`,
    memo: `${scenario.label} 고객 메모 원문`,
    buildingType: 'APARTMENT',
    floor: '중층',
    elevatorAvailable: true,
    parkingAvailable: true,
    estimateType: scenario.estimateType,
    totalAreaM2: scenario.areaM2,
    budgetGrade: scenario.budgetGrade,
    constructionScope: scenario.constructionScope,
    spaceProgram: scenario.spaceProgram
  });
  assert.ok(intake.ok, `${scenario.label} intake can be created`);

  const linked = pilotService.connectPilotToIntake(scenario.pilotId, scenario.intakeId);
  assert.strictEqual(linked.run.intake_id, scenario.intakeId, `${scenario.label} pilot connects to intake`);

  const validation = intakeService.validateRealProjectIntake(scenario.intakeId);
  assert.strictEqual(validation.canGenerateEstimate, true, `${scenario.label} intake validates`);

  const imported = service.importLightBIMPayload({
    payload: JSON.parse(fs.readFileSync(fixturePath, 'utf8')),
    sourceFileName: `rc-0.3.4-${scenario.key}.lightbim.json`
  });
  assert.ok(imported.ok && imported.importId, `${scenario.label} LightBIM imports`);

  const connected = intakeService.connectLightBIMImport(scenario.intakeId, imported.importId);
  assert.ok(connected.ok, `${scenario.label} LightBIM connects`);

  const priceReadiness = intakeService.checkPriceProfileReadiness(scenario.intakeId);
  assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(priceReadiness.status), `${scenario.label} price readiness returns supported status`);

  const estimate = intakeService.generateEstimateFromIntake(scenario.intakeId);
  assert.ok(estimate.ok && estimate.estimateId, `${scenario.label} estimate can be generated`);
  assert.strictEqual(estimate.estimateType, scenario.estimateType, `${scenario.label} estimate type is preserved`);

  const pce = intakeService.runPCEForIntake(scenario.intakeId);
  const pceDecision = pce.pce?.decision || pce.pce?.result;
  assert.ok(pce.ok && ['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(pceDecision), `${scenario.label} PCE result exists`);

  const safety = intakeService.runCustomerSafetyCheckForIntake(scenario.intakeId);
  assert.strictEqual(safety.ok, true, `${scenario.label} customer safety passes`);

  const leak = intakeService.runCustomerSafetyCheckForIntake(scenario.intakeId, {
    customer_name: scenario.customerName,
    site_name: scenario.siteName,
    detailed_address: `${scenario.label} 상세주소 원문`,
    customer_phone: `${scenario.key}-phone-secret`,
    customer_email: `${scenario.key}@example.invalid`,
    memo: `${scenario.label} 고객 메모 원문`,
    internal_cost: 100,
    margin: 10,
    pce: { decision: pceDecision },
    risk_score: 0.7
  });
  assert.strictEqual(leak.blocked, true, `${scenario.label} leak injection blocks customer output`);
  assert.ok(leak.issueId, `${scenario.label} leak injection creates S1 issue`);

  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'backup', status: 'PASSED', payload: { backupId: backup.backupId } });
  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'intake', status: 'PASSED', payload: { intakeId: scenario.intakeId, customerPhone: `${scenario.key}-phone-secret` } });
  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'lightbim', status: 'PASSED', payload: { lightbimImportId: imported.importId } });
  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'price_readiness', status: 'PASSED', payload: { status: priceReadiness.status } });
  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'estimate_pce', status: 'PASSED', payload: { estimateId: estimate.estimateId, pceDecision } });
  pilotService.recordPilotStep(scenario.pilotId, { stepKey: 'customer_safety', status: 'PASSED', payload: { customerSafety: 'PASSED' } });
  pilotService.createPilotIssue(scenario.pilotId, {
    severity: 'S3',
    screen: 'Actual Customer Pilot Expansion',
    description: scenario.friction,
    status: 'DEFERRED',
    decision: '운영 병목 관찰 항목',
    targetVersion: 'RC-0.3.4'
  });

  pilotService.createActualCustomerPilotRun({
    pilotId: scenario.pilotId,
    version: 'RC-0.3.4',
    intakeId: scenario.intakeId,
    projectName: scenario.siteName,
    anonymizedCustomerName: scenario.customerName,
    lightbimImportId: imported.importId,
    estimateId: estimate.estimateId,
    pceResult: pceDecision,
    customerOutputStatus: 'READY',
    internalOutputStatus: 'READY',
    customerSafetyStatus: 'PASSED'
  });

  const report = pilotService.generateActualCustomerPilotReport(scenario.pilotId);
  assert.ok(report.ok && fs.existsSync(report.reportPath), `${scenario.label} pilot report can be generated`);
  assert.strictEqual(report.finalDecision, '실제 고객 Pilot 가능', `${scenario.label} final decision can be calculated`);
  assertReportIsAnonymous(report.reportPath, [
    `${scenario.key}-phone-secret`,
    `${scenario.key}@example.invalid`,
    `${scenario.label} 상세주소 원문`,
    `${scenario.label} 고객 메모 원문`
  ]);

  return {
    label: scenario.label,
    estimateType: scenario.estimateType,
    pilotId: scenario.pilotId,
    intakeId: scenario.intakeId,
    backupId: backup.backupId,
    lightbimImportId: imported.importId,
    lightbimUsed: true,
    priceReadiness: priceReadiness.status,
    estimateId: estimate.estimateId,
    pceDecision,
    customerOutput: 'READY',
    internalOutput: 'READY',
    privacyAnonymization: 'PASSED',
    customerSafety: 'PASSED',
    friction: scenario.friction,
    finalDecision: report.finalDecision
  };
}

const results = scenarios.map(runScenario);

const reportPath = path.join(reportsDir, 'RC_0_3_4_ACTUAL_CUSTOMER_PILOT_EXPANSION_REPORT.md');
fs.mkdirSync(reportsDir, { recursive: true });
const lines = [
  '# RC-0.3.4 Actual Customer Pilot Expansion Report',
  '',
  `- Pilot 수: ${results.length}`,
  '- 개인정보 익명화 결과: PASSED',
  '- 고객 안전성 결과: PASSED',
  '- 최종 판정: 3개 Pilot 유형 반복 검증 가능',
  '',
  '## Pilot Results',
  '',
  ...results.flatMap((result) => [
    `### ${result.label} / ${result.estimateType}`,
    '',
    `- Pilot ID: \`${result.pilotId}\``,
    `- Intake ID: \`${result.intakeId}\``,
    `- LightBIM 사용 여부: ${result.lightbimUsed ? '사용' : '미사용'}`,
    `- 단가 준비 상태: \`${result.priceReadiness}\``,
    `- Estimate ID: \`${result.estimateId}\``,
    `- PCE 결과: \`${result.pceDecision}\``,
    `- 고객 출력: \`${result.customerOutput}\``,
    `- 내부 출력: \`${result.internalOutput}\``,
    `- 개인정보 익명화: \`${result.privacyAnonymization}\``,
    `- 고객 안전성: \`${result.customerSafety}\``,
    `- 운영 병목: ${result.friction}`,
    ''
  ]),
  '## 우선 수정 후보',
  '',
  '- 실제 고객 추가 Pilot에서 입력 UX 병목을 계속 수집',
  '- 단가 준비 상태가 PARTIAL인 항목의 운영 영향 확인',
  '- 전체 리모델링의 LightBIM 수량 검토 동선 관찰',
  '',
  '## Privacy',
  '',
  '- 실제 연락처, 이메일, 상세주소, 민감 메모의 원본 내용은 이 리포트에 저장하지 않습니다.'
];
fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
assert.ok(fs.existsSync(reportPath), 'expansion report can be generated');
assertReportIsAnonymous(reportPath, [
  'phone-secret',
  '@example.invalid',
  '상세주소 원문',
  '고객 메모 원문'
]);

assert.strictEqual(results.length, 3, 'three pilot scenarios completed');
assert.deepStrictEqual(results.map((result) => result.estimateType), ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'], 'all pilot estimate types are covered');
assert.ok(results.every((result) => result.customerSafety === 'PASSED'), 'all pilot customer safety checks passed');
assert.ok(results.every((result) => result.privacyAnonymization === 'PASSED'), 'all pilot privacy checks passed');
assert.ok(results.every((result) => ['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(result.pceDecision)), 'all pilot PCE decisions exist');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-4-actual-customer-pilot-expansion.smoke',
  pilotCount: results.length,
  results,
  reportPath,
  privacyAnonymization: 'PASSED',
  customerSafety: 'PASSED',
  finalDecision: '3개 Pilot 유형 반복 검증 가능'
}, null, 2));
