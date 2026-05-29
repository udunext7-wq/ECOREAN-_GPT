'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const {
  DEFAULT_ONBOARDING_STEPS,
  createOperationalOnboardingService
} = require('../electron/services/operationalOnboardingService');

const { service, root } = createTestService('boc-operational-onboarding');
const reportDir = path.join(root, 'docs');
const onboardingService = createOperationalOnboardingService({ sqliteService: service, reportsDir: reportDir });

const run = onboardingService.createOperationalOnboardingRun('RC-0.3.1', '전체 운영 데이터 입력 테스트');
assert.ok(run.id, 'onboarding run can be created');
assert.strictEqual(run.steps.length, 12, 'default 12 steps are created');
assert.strictEqual(DEFAULT_ONBOARDING_STEPS.length, 12, 'default step definition has 12 entries');

let updatedRun = onboardingService.updateOperationalOnboardingStep(run.id, 'backup_full', 'PASSED', {
  actualResult: '전체 백업 생성 확인',
  note: '테스트 백업 통과'
});
assert.strictEqual(updatedRun.steps.find((step) => step.step_key === 'backup_full').status, 'PASSED', 'step can be marked PASSED');

updatedRun = onboardingService.updateOperationalOnboardingStep(run.id, 'material_price_import', 'FAILED', {
  actualResult: '테스트 실패 기록',
  issueSeverity: 'S2',
  note: '매칭 실패 재현'
});
assert.strictEqual(updatedRun.steps.find((step) => step.step_key === 'material_price_import').status, 'FAILED', 'step can be marked FAILED');

const s2Issue = onboardingService.createOperationalOnboardingIssue(run.id, 'material_price_import', {
  severity: 'S2',
  screen: '단가표 일괄 가져오기',
  description: '정상 CSV 행이 승인 대기 큐로 생성되지 않음',
  reproductionSteps: '자재 단가표 CSV 가져오기 후 승인 대기 생성',
  decision: '수정 후 재검토'
});
assert.ok(s2Issue.issueId, 'S2 issue can be recorded');

const blockedComplete = onboardingService.completeOperationalOnboardingRun(run.id);
assert.strictEqual(blockedComplete.ok, false, 'S1/S2 issue prevents completion');
assert.strictEqual(blockedComplete.decisionKo, '수정 후 재검토', 'blocking decision is returned');

const secondRun = onboardingService.createOperationalOnboardingRun('RC-0.3.1', 'S3 이슈 유예 테스트');
onboardingService.createOperationalOnboardingIssue(secondRun.id, 'output_check', {
  severity: 'S3',
  screen: '출력 확인',
  description: '버튼 문구가 다소 혼동됨',
  decision: '후속 개선',
  status: 'DEFERRED'
});
const secondSummary = onboardingService.getOperationalOnboardingSummary(secondRun.id);
assert.strictEqual(secondSummary.deferredLowerIssueCount, 1, 'S3 issue can be deferred');

const cleanRun = onboardingService.createOperationalOnboardingRun('RC-0.3.1', '완료 테스트');
DEFAULT_ONBOARDING_STEPS.forEach((step) => {
  onboardingService.updateOperationalOnboardingStep(cleanRun.id, step.key, 'PASSED', { actualResult: '통과' });
});
const cleanSummary = onboardingService.getOperationalOnboardingSummary(cleanRun.id);
assert.strictEqual(cleanSummary.passedCount, 12, 'summary returns passed counts');
assert.strictEqual(cleanSummary.failedCount, 0, 'summary returns failed counts');
assert.strictEqual(cleanSummary.blockedCount, 0, 'summary returns blocked counts');

const completion = onboardingService.completeOperationalOnboardingRun(cleanRun.id);
assert.strictEqual(completion.ok, true, 'clean onboarding run can be completed');
assert.strictEqual(completion.decisionKo, '운영 시작 가능', 'clean run returns operation-ready decision');

const report = onboardingService.generateOperationalOnboardingReport(cleanRun.id);
assert.ok(fs.existsSync(report.reportPath), 'onboarding report is generated');

const dashboardTypeSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'src', 'types', 'dashboard.ts'), 'utf8');
const entryPanelSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', 'estimate', 'EstimateEntryPanel.tsx'), 'utf8');
assert.ok(dashboardTypeSource.includes('operationalOnboarding'), 'navigation route enum exists');
assert.ok(entryPanelSource.includes('RC-0.3.1 운영 데이터 입력'), 'navigation label exists');

const clientPortalSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
const forbiddenCustomerTerms = ['operationalOnboarding', '운영 데이터 입력', 'onboarding issue', 'backup paths'];
forbiddenCustomerTerms.forEach((term) => {
  assert.ok(!clientPortalSource.includes(term), `customer payload does not expose onboarding issue details: ${term}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'operational-data-onboarding.smoke',
  runId: run.id,
  cleanRunId: cleanRun.id,
  defaultStepCount: DEFAULT_ONBOARDING_STEPS.length,
  reportPath: report.reportPath,
  finalDecision: completion.decisionKo
}, null, 2));
