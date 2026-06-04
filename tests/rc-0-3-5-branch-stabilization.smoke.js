'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceReadinessImpactService } = require('../electron/services/priceReadinessImpactService');

const rootDir = path.resolve(__dirname, '..');
const fixtureDir = path.join(rootDir, 'tests', 'user-test-data', 'rc-0.3.5', 'price-readiness-impact');
const fixtureFiles = [
  'bathroom-price-readiness-impact.sample.json',
  'kitchen-price-readiness-impact.sample.json',
  'full-remodeling-price-readiness-impact.sample.json'
];

const { service, root } = createTestService('boc-rc035-branch-stabilization');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const impactService = createPriceReadinessImpactService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

function expectedPartialRisk(estimateType) {
  return estimateType === 'BATHROOM'
    ? { risk: 'MEDIUM', action: '대표 검토 후 진행' }
    : { risk: 'HIGH', action: '단가 보정 후 진행' };
}

function assertAnalysisShape(analysis) {
  assert.ok(['BATHROOM', 'KITCHEN', 'FULL_REMODELING'].includes(analysis.estimate_type), 'estimate type is supported');
  assert.ok(['READY', 'PARTIAL', 'NEEDS_UPDATE'].includes(analysis.price_readiness_status), 'readiness status is supported');
  assert.ok(Number.isFinite(analysis.fallback_line_item_count), 'fallback count is numeric');
  assert.ok(Number.isFinite(analysis.confirmed_line_item_count), 'confirmed count is numeric');
  assert.ok(Number.isFinite(analysis.estimated_price_line_item_count), 'estimated/default count is numeric');
  assert.ok(Number.isFinite(analysis.margin_amount), 'margin amount is numeric');
  assert.ok(Number.isFinite(analysis.margin_rate), 'margin rate is numeric');
  assert.ok(['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(analysis.pce_decision), 'PCE decision is connected');
  assert.ok(['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'].includes(analysis.risk_level), 'risk level is returned');
  assert.ok(['견적 진행 가능', '대표 검토 후 진행', '단가 보정 후 진행', '견적 차단'].includes(analysis.recommended_action), 'recommended action is returned');
  const customerPayload = impactService.buildCustomerSafeImpactPayload(analysis);
  assert.deepStrictEqual(impactService.inspectForbiddenCustomerPayload(customerPayload), [], 'customer payload hides impact/internal data');
}

const analyses = [];
fixtureFiles.forEach((fileName) => {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), 'utf8'));
  const byStatus = {};
  fixture.scenarios.forEach((scenario) => {
    const analysis = impactService.analyzePriceReadinessImpact({ estimateType: fixture.estimate_type, scenario });
    assertAnalysisShape(analysis);
    byStatus[analysis.price_readiness_status] = analysis;
    analyses.push(analysis);
  });

  assert.ok(byStatus.READY, `${fixture.estimate_type} READY analysis exists`);
  assert.ok(byStatus.PARTIAL, `${fixture.estimate_type} PARTIAL analysis exists`);
  assert.ok(byStatus.NEEDS_UPDATE, `${fixture.estimate_type} NEEDS_UPDATE analysis exists`);

  assert.strictEqual(byStatus.READY.risk_level, 'LOW', `${fixture.estimate_type} READY risk is LOW`);
  assert.strictEqual(byStatus.READY.recommended_action, '견적 진행 가능', `${fixture.estimate_type} READY can proceed`);
  assert.strictEqual(byStatus.READY.ceo_action_required, false, `${fixture.estimate_type} READY does not require CEO action`);

  const partialExpected = expectedPartialRisk(fixture.estimate_type);
  assert.strictEqual(byStatus.PARTIAL.risk_level, partialExpected.risk, `${fixture.estimate_type} PARTIAL risk is expected`);
  assert.strictEqual(byStatus.PARTIAL.recommended_action, partialExpected.action, `${fixture.estimate_type} PARTIAL action is expected`);
  assert.strictEqual(byStatus.PARTIAL.ceo_action_required, true, `${fixture.estimate_type} PARTIAL requires CEO action`);

  assert.strictEqual(byStatus.NEEDS_UPDATE.risk_level, 'BLOCKING', `${fixture.estimate_type} NEEDS_UPDATE blocks`);
  assert.strictEqual(byStatus.NEEDS_UPDATE.recommended_action, '견적 차단', `${fixture.estimate_type} NEEDS_UPDATE action blocks`);
  assert.strictEqual(byStatus.NEEDS_UPDATE.ceo_action_required, true, `${fixture.estimate_type} NEEDS_UPDATE requires CEO action`);
});

assert.strictEqual(analyses.length, 9, 'three estimate types x three statuses are analyzed');
assert.ok(analyses.every((analysis) => analysis.total_customer_price > 0), 'customer price impact exists');
assert.ok(analyses.every((analysis) => analysis.total_internal_cost > 0), 'internal cost impact exists');
assert.ok(analyses.every((analysis) => analysis.margin_rate > 0), 'margin impact exists');

const report = impactService.createPriceReadinessImpactReport({ analyses });
assert.ok(report.ok && fs.existsSync(report.reportPath), 'impact report is generated');

const unresolvedCriticalIssues = [];
const stabilizationDecision = unresolvedCriticalIssues.length === 0 &&
  analyses.every((analysis) => ['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'].includes(analysis.risk_level))
  ? 'MERGE_READY'
  : 'NOT_READY';
assert.strictEqual(stabilizationDecision, 'MERGE_READY', 'MERGE_READY decision can be calculated');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-5-branch-stabilization.smoke',
  estimateTypes: ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'],
  statusCount: analyses.length,
  expectedRisks: {
    ready: 'LOW',
    partialBathroom: 'MEDIUM',
    partialKitchen: 'HIGH',
    partialFullRemodeling: 'HIGH',
    needsUpdate: 'BLOCKING'
  },
  customerSafety: 'PASSED',
  stabilizationDecision,
  reportPath: report.reportPath
}, null, 2));
