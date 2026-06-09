'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const implementationSmoke = path.join(__dirname, 'rc-0-3-8-unmatched-price-recommendation.smoke.js');
const servicePath = path.join(root, 'electron', 'services', 'unmatchedPriceRecommendationService.js');
const viewPath = path.join(root, 'ui', 'app', 'pricing', 'UnmatchedPriceRecommendationCenterView.tsx');

assert.ok(fs.existsSync(servicePath), 'recommendation service exists');
assert.ok(fs.existsSync(viewPath), 'recommendation view exists');
assert.ok(fs.existsSync(implementationSmoke), 'implementation smoke exists');

const output = execFileSync(process.execPath, [implementationSmoke], {
  cwd: root,
  encoding: 'utf8'
}).trim();
const result = JSON.parse(output);

assert.strictEqual(result.ok, true, 'recommendation implementation smoke passes');
assert.deepStrictEqual(result.confidence, {
  high: 93,
  medium: 66,
  low: 54,
  noMatch: 0
}, 'confidence boundaries remain stable without fixture changes');
assert.deepStrictEqual(result.decisions, {
  approved: 'APPROVED',
  rejected: 'REJECTED',
  deferred: 'DEFERRED'
}, 'approve, reject, and defer remain available');
assert.ok(result.queueId, 'approved recommendation links to a price queue');
assert.strictEqual(result.queueStatus, 'PENDING_REVIEW', 'linked queue remains pending review');
assert.strictEqual(result.masterPriceUnchanged, true, 'recommendation approval and queue link do not change Master Data');
assert.strictEqual(result.customerSafety, 'PASSED', 'customer payload hides recommendation and internal data');
assert.ok(fs.existsSync(result.reportPath), 'recommendation report is generated');

const serviceSource = fs.readFileSync(servicePath, 'utf8');
[
  'getUnmatchedPriceRecommendationSummary',
  'listUnmatchedImportRows',
  'getRecommendationCandidates',
  'createRecommendationForRow',
  'approveRecommendation',
  'rejectRecommendation',
  'deferRecommendation',
  'linkRecommendationToPriceQueue',
  'createUnmatchedPriceRecommendationReport'
].forEach((method) => {
  assert.ok(serviceSource.includes(method), `service exposes ${method}`);
});

const viewSource = fs.readFileSync(viewPath, 'utf8');
assert.ok(viewSource.includes('추천할 미매칭 항목이 없습니다.'), 'empty state exists');
assert.ok(viewSource.includes('추천 승인이나 Queue 연결만으로 Master Data 가격은 변경되지 않습니다.'), 'Master Data safety notice exists');

const entryPointFiles = [
  'ui/app/dashboard/CeoDashboard.tsx',
  'ui/components/modals/DetailDrawer.tsx',
  'ui/app/pricing/PriceWorkbookImportCenterView.tsx',
  'ui/app/pricing/RealPriceCalibrationWorkbenchView.tsx',
  'ui/app/pricing/PriceCalibrationPriorityCenterView.tsx',
  'ui/app/master/MasterDataCenterView.tsx'
];
entryPointFiles.forEach((relativePath) => {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.ok(
    source.includes('unmatchedPriceRecommendation') || source.includes('UnmatchedPriceRecommendationCenterView'),
    `internal entry point is connected: ${relativePath}`
  );
});

const customerViewFiles = [
  'ui/app/client/ClientPortalCenterView.tsx',
  'ui/app/lightbim/LightBIMCustomerProposalMapView.tsx',
  'ui/app/board/BoardGenerationCenterView.tsx'
];
const forbiddenTerms = [
  'unmatched_price_recommendations',
  'recommendation_score',
  'confidence_level',
  'candidate_master_item',
  'suggested_price',
  'approval_status'
];
customerViewFiles.forEach((relativePath) => {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8').toLowerCase();
  forbiddenTerms.forEach((term) => {
    assert.ok(!source.includes(term), `customer screen hides ${term}: ${relativePath}`);
  });
});

const unresolvedCriticalIssues = [];
const decision = unresolvedCriticalIssues.length === 0
  && result.masterPriceUnchanged
  && result.customerSafety === 'PASSED'
  && result.queueStatus === 'PENDING_REVIEW'
  ? 'MERGE_READY'
  : 'NOT_READY';
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision is MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-8-branch-stabilization.smoke',
  implementationSmoke: 'PASSED',
  confidence: result.confidence,
  decisions: result.decisions,
  queueStatus: result.queueStatus,
  masterDataProtection: 'PASSED',
  customerSafety: result.customerSafety,
  entryPoints: entryPointFiles.length,
  reportGeneration: 'PASSED',
  decision
}, null, 2));
