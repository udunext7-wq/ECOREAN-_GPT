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
const expected = JSON.parse(fs.readFileSync(path.join(fixtureDir, 'price-readiness-impact-expected-results.json'), 'utf8'));

const { service, root } = createTestService('boc-rc035-price-readiness-impact');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const impactService = createPriceReadinessImpactService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const analyses = [];
fixtureFiles.forEach((fileName) => {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), 'utf8'));
  assert.ok(expected.estimate_types.includes(fixture.estimate_type), `${fixture.estimate_type} fixture loads`);
  fixture.scenarios.forEach((scenario) => {
    const analysis = impactService.analyzePriceReadinessImpact({
      estimateType: fixture.estimate_type,
      scenario
    });
    analyses.push(analysis);

    assert.strictEqual(analysis.estimate_type, fixture.estimate_type, `${fixture.estimate_type} analysis returns estimate type`);
    assert.ok(expected.statuses.includes(analysis.price_readiness_status), 'READY/PARTIAL/NEEDS_UPDATE status returned');
    assert.ok(Number.isFinite(analysis.fallback_line_item_count), 'fallback line item count calculated');
    assert.ok(Number.isFinite(analysis.confirmed_line_item_count), 'confirmed line item count calculated');
    assert.ok(Number.isFinite(analysis.margin_amount), 'margin impact amount calculated');
    assert.ok(Number.isFinite(analysis.margin_rate), 'margin impact rate calculated');
    assert.ok(['GO', 'MODIFY', 'SCALE', 'BLOCK'].includes(analysis.pce_decision), 'PCE decision connected');
    assert.ok(['LOW', 'MEDIUM', 'HIGH', 'BLOCKING'].includes(analysis.risk_level), 'risk_level returned');
    assert.ok(['견적 진행 가능', '대표 검토 후 진행', '단가 보정 후 진행', '견적 차단'].includes(analysis.recommended_action), 'recommended_action returned');

    if (analysis.price_readiness_status === 'READY') {
      assert.strictEqual(analysis.risk_level, 'LOW', 'READY risk is LOW');
      assert.strictEqual(analysis.fallback_line_item_count, 0, 'READY has no fallback line items');
    }
    if (analysis.price_readiness_status === 'PARTIAL') {
      assert.ok(['MEDIUM', 'HIGH'].includes(analysis.risk_level), 'PARTIAL risk is MEDIUM or HIGH');
      assert.ok(analysis.ceo_action_required, 'PARTIAL requires CEO review');
    }
    if (analysis.price_readiness_status === 'NEEDS_UPDATE') {
      assert.strictEqual(analysis.risk_level, 'BLOCKING', 'NEEDS_UPDATE risk is BLOCKING');
      assert.strictEqual(analysis.recommended_action, '견적 차단', 'NEEDS_UPDATE blocks estimate');
    }

    const customerPayload = impactService.buildCustomerSafeImpactPayload(analysis);
    const leaks = impactService.inspectForbiddenCustomerPayload(customerPayload);
    assert.deepStrictEqual(leaks, [], 'customer payload does not expose impact/internal data');
  });
});

const bathroom = analyses.filter((item) => item.estimate_type === 'BATHROOM');
const kitchen = analyses.filter((item) => item.estimate_type === 'KITCHEN');
const full = analyses.filter((item) => item.estimate_type === 'FULL_REMODELING');
assert.strictEqual(bathroom.length, 3, 'bathroom price readiness impact analysis works');
assert.strictEqual(kitchen.length, 3, 'kitchen price readiness impact analysis works');
assert.strictEqual(full.length, 3, 'full remodeling price readiness impact analysis works');
assert.ok(kitchen.find((item) => item.price_readiness_status === 'PARTIAL').risk_level === 'HIGH', 'kitchen PARTIAL shows higher review burden');
assert.ok(full.find((item) => item.price_readiness_status === 'PARTIAL').fallback_line_item_count >= 9, 'full remodeling PARTIAL captures LightBIM/PCE quantity risk');

const compared = impactService.compareReadyPartialNeedsUpdateScenarios('BATHROOM');
assert.deepStrictEqual(compared.map((item) => item.price_readiness_status), ['READY', 'PARTIAL', 'NEEDS_UPDATE'], 'scenario comparison returns all statuses');

const coverage = impactService.analyzeEstimatePriceCoverage('INTAKE-FULL_REMODELING-RC035');
assert.strictEqual(coverage.estimate_type, 'FULL_REMODELING', 'estimate coverage infers full remodeling estimate type');

const issue = impactService.createPriceReadinessIssue({
  estimateType: 'KITCHEN',
  severity: 'S3',
  description: '주방 단가/품목 검토 부담'
});
assert.ok(issue.ok && issue.issueId, 'price readiness issue can be recorded');

const report = impactService.createPriceReadinessImpactReport({ analyses });
assert.ok(report.ok, 'impact report generated');
assert.ok(fs.existsSync(report.reportPath), 'impact report file exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-5-price-readiness-impact.smoke',
  estimateTypes: expected.estimate_types,
  statusCount: analyses.length,
  bathroom: bathroom.map((item) => ({ status: item.price_readiness_status, risk: item.risk_level, action: item.recommended_action })),
  kitchen: kitchen.map((item) => ({ status: item.price_readiness_status, risk: item.risk_level, action: item.recommended_action })),
  fullRemodeling: full.map((item) => ({ status: item.price_readiness_status, risk: item.risk_level, action: item.recommended_action })),
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
