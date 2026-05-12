const assert = require('assert');
const { createTestService } = require('./execution-test-helpers');

const { service } = createTestService('boc-vendor-price-intelligence');

let saved = service.saveMaterialPriceHistory({
  materialCategory: 'tile',
  materialName: '600각 포세린 타일',
  specification: '600x600',
  brand: 'UNKNOWN',
  vendorId: 'VENDOR-A',
  vendorName: '타일테스트A',
  quotedUnitPrice: 10000,
  actualUnitPrice: 10000,
  unit: 'EA',
  sourceType: 'QUOTE',
  recordedAt: '2026-05-01T00:00:00.000Z'
});
assert.ok(saved.priceHistoryId, 'Material price history can be saved');

saved = service.saveMaterialPriceHistory({
  materialCategory: 'tile',
  materialName: '600각 포세린 타일',
  specification: '600x600',
  brand: 'UNKNOWN',
  vendorId: 'VENDOR-A',
  vendorName: '타일테스트A',
  quotedUnitPrice: 10000,
  actualUnitPrice: 11200,
  unit: 'EA',
  sourceType: 'PURCHASE',
  recordedAt: '2026-05-02T00:00:00.000Z'
});

service.saveMaterialPriceHistory({
  materialCategory: 'tile',
  materialName: '600각 포세린 타일',
  specification: '600x600',
  brand: 'UNKNOWN',
  vendorId: 'VENDOR-B',
  vendorName: '타일테스트B',
  quotedUnitPrice: 9600,
  actualUnitPrice: 9600,
  unit: 'EA',
  sourceType: 'QUOTE',
  recordedAt: '2026-05-02T01:00:00.000Z'
});

let data = service.getVendorPriceIntelligenceData();
assert.ok(data.priceHistory.length >= 3, 'Material price history is returned');
assert.ok(data.comparisons.length >= 1, 'Vendor price comparison works');
assert.ok(data.reliabilityScores.length >= 1, 'Vendor reliability score calculated');
assert.ok(data.alerts.some((alert) => alert.alert_type === 'PRICE_INCREASE'), 'Price increase creates alert');
assert.ok(data.alerts.some((alert) => alert.alert_type === 'QUOTE_ACTUAL_VARIANCE'), 'Quote vs actual variance creates alert');
assert.ok(data.recommendations.length >= 1, 'Estimate update recommendation created');

const pending = data.recommendations.find((row) => row.status === 'PENDING_APPROVAL');
assert.ok(pending, 'Pending recommendation exists');
service.decideVendorPriceRecommendation({
  recommendationId: pending.id,
  decision: 'APPROVED',
  actor: 'CEO',
  reasonKo: 'smoke approve vendor price recommendation'
});

const preview = service.calculateBathroomEstimatePreview({
  estimateId: 'VENDOR-INTEL-NEXT-EST',
  customerPriceMultiplier: 1.35
});
assert.ok(preview.calibration.applied, 'Approved recommendation affects estimate pricing through calibration rule');
assert.ok(preview.calibration.rules.some((rule) => String(rule.id).startsWith('VENDOR-')), 'Vendor recommendation is linked to estimate calibration');

const recommendation = service.getVendorSelectionRecommendation({
  materialName: '600각 포세린 타일',
  specification: '600x600'
});
assert.ok(recommendation.recommendedVendor, 'Vendor recommendation returns best candidate');

const imported = service.importMaterialPriceHistoryCsv({
  csvText: [
    'material_name,specification,brand,vendor_name,quoted_unit_price,actual_unit_price,unit,recorded_at',
    '타일 본드,20kg,UNKNOWN,부자재테스트,15000,15000,포,2026-05-03T00:00:00.000Z'
  ].join('\n')
});
assert.strictEqual(imported.importedCount, 1, 'CSV import parses valid rows');

data = service.getVendorPriceIntelligenceData();
assert.ok(data.summary.priceHistoryCount >= 4, 'Vendor intelligence center summary loads');

const dashboard = service.getDashboardData();
assert.ok(dashboard.vendorPriceIntelligenceSummary, 'CEO Dashboard vendor summary loads');
assert.ok(Number(dashboard.vendorPriceIntelligenceSummary.priceHistoryCount) >= 4, 'CEO Dashboard vendor summary has price history count');

const stats = service.getDbStats();
assert.ok(stats.materialPriceHistoryCount >= 4, 'material_price_history table has rows');
assert.ok(stats.vendorReliabilityScoreCount >= 1, 'vendor_reliability_scores table has rows');
assert.ok(stats.vendorPriceAlertCount >= 1, 'vendor_price_alerts table has rows');
assert.ok(stats.vendorPriceRecommendationCount >= 1, 'vendor_price_recommendations table has rows');

console.log('vendor-price-intelligence smoke passed');
