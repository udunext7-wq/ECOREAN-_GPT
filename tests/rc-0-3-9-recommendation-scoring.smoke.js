'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const {
  BASE_WEIGHTS,
  normalizeItemName,
  normalizeUnit,
  normalizeSpec,
  calculateVendorWeight,
  calculateHistoryWeight,
  calculatePriceVarianceScore,
  calculateFinalRecommendationScore,
  createRecommendationScoringService
} = require('../electron/services/recommendationScoringService');

const projectRoot = path.join(__dirname, '..');
const { service, root } = createTestService('boc-rc039-recommendation-scoring');
const reportsDir = path.join(root, 'reports');
const scoringService = createRecommendationScoringService({
  sqliteService: service,
  reportsDir
});

assert.ok(fs.existsSync(path.join(projectRoot, 'electron/services/recommendationScoringService.js')), 'recommendation scoring service exists');
assert.strictEqual(normalizeItemName('Ceramic Tile'), '세라믹타일', 'item name synonyms are normalized');
assert.strictEqual(normalizeUnit('㎡'), 'M2', 'square meter unit is normalized');
assert.strictEqual(normalizeUnit('pcs'), 'EA', 'piece unit is normalized');
assert.strictEqual(normalizeSpec('300 × 600 millimeters'), '300x600mm', 'specification is normalized');

const vendorExact = calculateVendorWeight(
  { item_name: '욕실 타일', vendor_name: '한빛자재' },
  { target_name: '욕실 타일', vendor_name: '한빛자재' }
);
const vendorNeutral = calculateVendorWeight(
  { item_name: '욕실 타일', vendor_name: '' },
  { target_name: '욕실 타일', vendor_name: '한빛자재' }
);
assert.ok(vendorExact > vendorNeutral, 'matching vendor receives a higher score');
assert.strictEqual(vendorNeutral, 50, 'missing vendor receives a neutral score');

const historyApproved = calculateHistoryWeight({}, {}, { approved: 2, rejected: 0 });
const historyNeutral = calculateHistoryWeight({}, {}, {});
const historyRejected = calculateHistoryWeight({}, {}, { approved: 0, rejected: 2 });
assert.ok(historyApproved > historyNeutral && historyNeutral > historyRejected, 'approval and rejection history changes history score safely');

assert.strictEqual(calculatePriceVarianceScore(105, 100), 100, 'small price variance is safe');
assert.strictEqual(calculatePriceVarianceScore(250, 100), 0, 'extreme price variance is penalized');

const importRow = {
  item_name: 'Ceramic Tile 300x600',
  category: '타일',
  process: '욕실 벽타일',
  unit: '㎡',
  spec: '300 × 600 mm',
  brand: '테스트브랜드',
  price: 30000,
  vendor_name: '한빛자재'
};
const masterItem = {
  target_name: '세라믹 타일 300x600',
  category: '타일',
  process: '욕실 벽타일',
  unit: 'M2',
  spec: '300x600mm',
  brand: '테스트브랜드',
  current_price: 29000,
  vendor_name: '한빛자재'
};

const fixtureScores = [
  { compatibilityScore: 93, confidence: 'HIGH' },
  { compatibilityScore: 66, confidence: 'MEDIUM' },
  { compatibilityScore: 54, confidence: 'LOW' },
  { compatibilityScore: 0, confidence: 'NO_MATCH' }
].map((fixture) => calculateFinalRecommendationScore({
  importRow,
  masterItem,
  compatibilityScore: fixture.compatibilityScore,
  history: { approved: 1, rejected: 0 }
}));

assert.deepStrictEqual(
  fixtureScores.map((score) => score.final_score),
  [93, 66, 54, 0],
  'RC-0.3.8 confidence fixture scores remain stable'
);
assert.deepStrictEqual(
  fixtureScores.map((score) => score.confidence_level),
  ['HIGH', 'MEDIUM', 'LOW', 'NO_MATCH'],
  'HIGH, MEDIUM, LOW, and NO_MATCH classifications are reproduced'
);
[
  'name_score',
  'category_score',
  'unit_score',
  'spec_score',
  'vendor_score',
  'history_score',
  'price_score',
  'final_score',
  'confidence_level',
  'recommendation_reason'
].forEach((field) => assert.ok(Object.hasOwn(fixtureScores[0], field), `score breakdown contains ${field}`));

const vendorOnly = calculateFinalRecommendationScore({
  importRow: {
    item_name: '은하 항법 모듈',
    category: '우주',
    unit: 'BOX',
    spec: 'ZX9',
    vendor_name: '한빛자재',
    price: 1
  },
  masterItem: {
    target_name: '욕실 벽타일',
    category: '타일',
    unit: 'M2',
    spec: '300x600mm',
    vendor_name: '한빛자재',
    current_price: 29000
  },
  compatibilityScore: 95
});
assert.notStrictEqual(vendorOnly.confidence_level, 'HIGH', 'vendor score alone cannot promote a weak identity match to HIGH');

const database = new DatabaseSync(service.dbPaths.master);
const timestamp = new Date().toISOString();
database.prepare(`
  INSERT INTO material_master (
    id, material_category, material_name, specification, brand, unit,
    default_unit_price, latest_unit_price, recommended_vendor, applied_process,
    is_active, created_at, updated_at, price_status, source_marker
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'CONFIRMED', 'RC_0_3_9_TEST')
`).run(
  'RC039-MAT-1',
  '타일',
  'RC039 세라믹 타일',
  '300x600mm',
  '테스트브랜드',
  'M2',
  29000,
  29000,
  '한빛자재',
  '욕실 벽타일',
  timestamp,
  timestamp
);
const readMasterPrice = () => Number(database.prepare('SELECT latest_unit_price FROM material_master WHERE id = ?').get('RC039-MAT-1').latest_unit_price);
const masterPriceBefore = readMasterPrice();

const approvedRule = scoringService.saveScoringRule({
  ruleId: 'RC039-APPROVED-1',
  ruleType: 'APPROVED_PATTERN',
  vendorName: '한빛자재',
  pattern: '세라믹 타일',
  weight: 5,
  direction: 'BOOST',
  status: 'ACTIVE'
});
const rejectedRule = scoringService.saveScoringRule({
  ruleId: 'RC039-REJECTED-1',
  ruleType: 'REJECTED_PATTERN',
  vendorName: '한빛자재',
  pattern: '항법 모듈',
  weight: 8,
  direction: 'PENALTY',
  status: 'ACTIVE'
});
scoringService.saveScoringRule({
  ruleId: 'RC039-SYNONYM-1',
  ruleType: 'ITEM_SYNONYM',
  pattern: 'countertop=상판',
  weight: 0,
  direction: 'NEUTRAL',
  status: 'ACTIVE'
});
scoringService.saveScoringRule({
  ruleId: 'RC039-UNIT-1',
  ruleType: 'UNIT_ALIAS',
  pattern: '헤베=M2',
  weight: 0,
  direction: 'NEUTRAL',
  status: 'ACTIVE'
});
assert.strictEqual(scoringService.listScoringRules().length, 4, 'scoring rules can be listed');
assert.strictEqual(approvedRule.status, 'ACTIVE', 'approved pattern rule is active');
assert.strictEqual(rejectedRule.direction, 'PENALTY', 'rejected pattern rule applies a penalty');
assert.strictEqual(readMasterPrice(), masterPriceBefore, 'changing recommendation rules does not change Master Data');
const unitAliasScore = scoringService.scoreCandidate({
  importRow: { ...importRow, unit: '헤베' },
  masterItem,
  compatibilityScore: 66
});
assert.strictEqual(unitAliasScore.unit_score, 100, 'active unit alias rule affects recommendation scoring');

const deactivated = scoringService.setScoringRuleStatus('RC039-REJECTED-1', 'INACTIVE');
assert.strictEqual(deactivated.status, 'INACTIVE', 'scoring rule can be deactivated');
assert.strictEqual(readMasterPrice(), masterPriceBefore, 'rule status change does not change Master Data');

const summary = scoringService.getScoringSummary();
assert.deepStrictEqual(summary.weights, BASE_WEIGHTS, 'configured weight breakdown is exposed');
assert.strictEqual(summary.masterDataProtection, 'PASSED', 'scoring summary reports Master Data protection');

const customerPayload = scoringService.buildCustomerSafeScoringPayload();
assert.deepStrictEqual(scoringService.inspectForbiddenCustomerPayload(customerPayload), [], 'customer payload hides scoring and internal data');

const report = scoringService.createScoringReport();
assert.ok(report.ok && fs.existsSync(report.reportPath), 'scoring report is generated');
const finalMasterPrice = readMasterPrice();
database.close();

const legacyOutput = execFileSync(
  process.execPath,
  [path.join(__dirname, 'rc-0-3-8-unmatched-price-recommendation.smoke.js')],
  { cwd: projectRoot, encoding: 'utf8' }
);
assert.ok(legacyOutput.includes('"approved": "APPROVED"'), 'recommendation approval still works');
assert.ok(legacyOutput.includes('"queueStatus": "PENDING_REVIEW"'), 'queue linkage remains PENDING_REVIEW');
assert.ok(legacyOutput.includes('"masterPriceUnchanged": true'), 'approval and queue linkage do not change Master Data');
assert.ok(legacyOutput.includes('"customerSafety": "PASSED"'), 'legacy recommendation customer safety remains intact');

const entryPointSources = [
  'ui/app/pricing/UnmatchedPriceRecommendationCenterView.tsx',
  'ui/app/master/MasterDataCenterView.tsx',
  'ui/app/pricing/RealPriceCalibrationWorkbenchView.tsx',
  'ui/app/dashboard/CeoDashboard.tsx',
  'ui/components/modals/DetailDrawer.tsx'
].map((file) => fs.readFileSync(path.join(projectRoot, file), 'utf8'));
entryPointSources.forEach((source, index) => {
  assert.ok(
    source.includes('recommendationScoringRules') || source.includes('RecommendationScoringRulesView'),
    `internal scoring rules entry point ${index + 1} is connected`
  );
});

const customerViewSources = [
  'ui/app/client/ClientPortalCenterView.tsx',
  'ui/app/lightbim/LightBIMCustomerProposalMapView.tsx',
  'ui/app/board/BoardGenerationCenterView.tsx'
].map((file) => fs.readFileSync(path.join(projectRoot, file), 'utf8').toLowerCase());
customerViewSources.forEach((source) => {
  ['recommendationscoringrules', 'recommendation scoring', 'vendor_score', 'history_score', 'score breakdown'].forEach((term) => {
    assert.ok(!source.includes(term), `customer screen does not expose scoring data: ${term}`);
  });
});

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-9-recommendation-scoring.smoke',
  confidence: fixtureScores.map((score) => ({
    score: score.final_score,
    level: score.confidence_level
  })),
  vendor: {
    exact: vendorExact,
    neutral: vendorNeutral,
    vendorOnlyConfidence: vendorOnly.confidence_level
  },
  history: {
    approved: historyApproved,
    neutral: historyNeutral,
    rejected: historyRejected
  },
  rules: summary,
  masterDataUnchanged: finalMasterPrice === masterPriceBefore,
  legacyApprovalQueueSafety: 'PASSED',
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
