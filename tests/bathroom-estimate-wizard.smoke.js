const assert = require('assert');
const path = require('path');
const { calculateBathroomEstimate, buildCustomerEstimateView, buildInternalCostView } = require('../electron/services/bathroomEstimateService');
const { createSqliteService } = require('../electron/services/sqliteService');

function baseInput(overrides = {}) {
  return {
    customerName: '테스트 고객',
    siteName: '테스트 욕실 현장',
    bathroomCount: 1,
    bathroomAreaM2: 4.2,
    ceilingHeightMm: 2200,
    demolitionIncluded: true,
    constructionMethod: 'bond',
    waterproofMethod: 'liquid',
    tileWallType: 'ceramic_300x600',
    tileFloorType: 'porcelain_600',
    fixtureGrade: 'basic',
    options: {
      showerBooth: true,
      zenda: true,
      bathtub: false,
      slidingCabinet: false,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    ...overrides
  };
}

function runPureCalculationChecks() {
  const estimate = calculateBathroomEstimate(baseInput());
  assert.ok(Array.isArray(estimate.line_items), 'line items should be array');
  assert.ok(estimate.line_items.length >= 10, 'basic bathroom estimate creates valid line items');
  assert.ok(estimate.revenue > 0, 'revenue is greater than 0');
  assert.ok(estimate.total_cost > 0, 'total cost is greater than 0');
  assert.ok(Number.isFinite(estimate.expected_margin_rate), 'margin rate is calculated');

  const lowMargin = calculateBathroomEstimate(baseInput({ customerPriceMultiplier: 0.75 }));
  assert.strictEqual(lowMargin.pce_decision, 'BLOCK', 'low margin estimate returns BLOCK');

  const normalMargin = calculateBathroomEstimate(baseInput({ customerPriceMultiplier: 1.05 }));
  assert.strictEqual(normalMargin.pce_decision, 'GO', 'normal margin estimate returns GO');

  const highMargin = calculateBathroomEstimate(baseInput({ customerPriceMultiplier: 1.25 }));
  assert.strictEqual(highMargin.pce_decision, 'SCALE', 'high margin estimate returns SCALE');

  const customerView = buildCustomerEstimateView(estimate);
  assert.ok(!JSON.stringify(customerView).includes('materialCost'), 'customer view hides internal cost');

  const internalView = buildInternalCostView(estimate);
  assert.ok(JSON.stringify(internalView).includes('expectedMargin'), 'internal view shows margin and cost');
}

function runDatabaseSaveCheck() {
  const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-bathroom-${Date.now()}`);
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => tempRoot
    }
  });

  const saved = service.saveBathroomEstimate(baseInput({ customerPriceMultiplier: 1.05 }));
  assert.ok(saved.estimateId, 'estimate can be saved');
  const stats = service.getDbStats();
  assert.ok(stats.bathroomEstimateCount >= 1, 'bathroom estimate row exists');
  assert.ok(stats.bathroomEstimateItemCount >= 1, 'bathroom estimate item rows exist');
}

runPureCalculationChecks();
runDatabaseSaveCheck();

console.log(JSON.stringify({ ok: true, test: 'bathroom-estimate-wizard.smoke' }));
