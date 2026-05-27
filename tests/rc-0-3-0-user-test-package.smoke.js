'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'ui/app/release/UserTestCenterView.tsx',
  'docs/RC_0_3_0_USER_TEST_CHECKLIST.md',
  'docs/RC_0_3_0_BUG_REPORT_TEMPLATE.md',
  'docs/RC_0_3_0_ACCEPTANCE_CRITERIA.md',
  'docs/RC_0_3_0_USER_TEST_REPORT.md',
  'tests/user-test-data/rc-0.3.0/user-test-scenarios.sample.json',
  'tests/user-test-data/rc-0.3.0/sample-test-run.json',
  'tests/user-test-data/rc-0.3.0/sample-bug-report.json'
];

requiredFiles.forEach((relativePath) => {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} exists`);
});

const scenarios = JSON.parse(fs.readFileSync(path.join(root, 'tests/user-test-data/rc-0.3.0/user-test-scenarios.sample.json'), 'utf8'));
assert.strictEqual(scenarios.releaseVersion, 'RC-0.3.0', 'Fixture targets RC-0.3.0');
assert.strictEqual(scenarios.steps.length, 12, 'Package defines twelve business verification steps');

const uiSource = fs.readFileSync(path.join(root, 'ui/app/release/UserTestCenterView.tsx'), 'utf8');
['사용자 테스트 센터', '실행 체크리스트', '문서 및 샘플 데이터', '테스트 판정 완료'].forEach((text) => {
  assert.ok(uiSource.includes(text), `User Test Center includes ${text}`);
});

const { service } = createTestService('boc-rc-0-3-0-user-test-package');
const empty = service.getUserTestCenterData();
assert.strictEqual(empty.releaseVersion, 'RC-0.3.0', 'Center identifies release version');
assert.strictEqual(empty.steps.length, 12, 'Preview checklist is available before a run begins');
assert.ok(empty.emptyMessageKo.includes('시작된 사용자 테스트'), 'Safe empty state is available');

let runData = service.createUserTestRun({
  testerName: '릴리스 검증 담당자',
  testEnvironment: 'Windows Desktop / Local DB',
  notes: 'RC 사용자 테스트 스모크'
});
assert.ok(runData.activeRun.id, 'Test run is created');
assert.strictEqual(runData.activeRun.status, 'IN_PROGRESS', 'New run is in progress');
assert.strictEqual(runData.steps.length, 12, 'Run creates all steps');

const premature = service.completeUserTestRun({ runId: runData.activeRun.id });
assert.strictEqual(premature.ok, false, 'Incomplete run cannot be finalized');
assert.strictEqual(premature.errorMessage, '완료되지 않은 테스트 단계가 있습니다.', 'Incomplete verdict has safe Korean error');

runData.steps.forEach((step) => {
  const update = service.updateUserTestStep({
    stepId: step.id,
    status: 'PASSED',
    actualResult: `${step.taskName} 확인 완료`,
    evidencePath: `evidence/${step.stepCode}.png`
  });
  assert.strictEqual(update.ok, true, `${step.stepCode} result is saved`);
});

const passed = service.completeUserTestRun({
  runId: runData.activeRun.id,
  conclusion: '사용자 흐름 검증 완료',
  notes: '고객 데이터 차단 포함 확인'
});
assert.strictEqual(passed.ok, true, 'Completed run accepts verdict');
assert.strictEqual(passed.activeRun.status, 'PASSED', 'Passing run stores PASSED verdict');
assert.strictEqual(passed.summary.passedCount, 12, 'All workflow steps pass');

runData = service.createUserTestRun({
  testerName: '결함 기록 담당자',
  testEnvironment: 'Windows Desktop / Local DB'
});
service.updateUserTestStep({
  stepId: runData.steps[0].id,
  status: 'FAILED',
  actualResult: 'JSON 파일 생성 실패',
  bugSeverity: 'HIGH',
  evidencePath: 'evidence/BUG-RC030-001.png'
});
runData.steps.slice(1).forEach((step) => {
  service.updateUserTestStep({ stepId: step.id, status: 'PASSED', actualResult: '통과' });
});
const failed = service.completeUserTestRun({ runId: runData.activeRun.id, conclusion: '보완 필요' });
assert.strictEqual(failed.activeRun.status, 'FAILED', 'Failed step affects final verdict');
assert.strictEqual(failed.steps[0].bugSeverity, 'HIGH', 'Defect severity is preserved');

const stats = service.getDbStats();
assert.ok(stats.userTestRunCount >= 2, 'Run records persist in DB');
assert.ok(stats.userTestStepCount >= 24, 'Step records persist in DB');

console.log(JSON.stringify({
  releaseVersion: passed.releaseVersion,
  stepCount: passed.steps.length,
  passedVerdict: passed.activeRun.status,
  failedVerdict: failed.activeRun.status,
  runRecords: stats.userTestRunCount,
  stepRecords: stats.userTestStepCount
}, null, 2));
