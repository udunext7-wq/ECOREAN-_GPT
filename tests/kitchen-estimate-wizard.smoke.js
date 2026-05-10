const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  calculateKitchenEstimate,
  buildCustomerKitchenEstimateView,
  buildInternalKitchenCostView
} = require('../electron/services/kitchenEstimateService');
const { createSqliteService } = require('../electron/services/sqliteService');

function kitchenInput(overrides = {}) {
  return {
    customerName: 'Kitchen Customer',
    siteName: 'Kitchen Site',
    constructionType: 'kitchen_remodel',
    kitchenType: 'l_shape',
    kitchenLengthMm: 3300,
    ceilingHeightMm: 2300,
    demolitionIncluded: true,
    expansionIncluded: false,
    upperCabinetLengthMm: 3300,
    lowerCabinetLengthMm: 3300,
    tallCabinet: true,
    pantry: false,
    island: false,
    doorFinish: 'pet',
    countertopType: 'artificial_marble',
    handleType: 'hidden',
    customerPriceMultiplier: 1.1,
    options: {
      sinkBowlReplace: true,
      faucetReplace: true,
      hoodReplace: true,
      cooktopReplace: false,
      outletAdd: true,
      indirectLighting: false,
      electricalUpgrade: true,
      wallTile: true,
      floorFinishConnection: true,
      wallpaperConnection: false,
      ceilingFinish: false,
      moldingFinish: true
    },
    ...overrides
  };
}

function runPureCalculationChecks() {
  const estimate = calculateKitchenEstimate(kitchenInput());
  assert.ok(Array.isArray(estimate.line_items), 'kitchen estimate creates line items');
  assert.ok(estimate.line_items.length >= 12, 'kitchen estimate creates enough practical line items');
  assert.ok(estimate.revenue > 0, 'revenue is calculated');
  assert.ok(estimate.total_cost > 0, 'cost is calculated');
  assert.ok(Number.isFinite(estimate.expected_margin_rate), 'margin rate is calculated');
  assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(estimate.pce_decision), 'PCE returns decision');

  const low = calculateKitchenEstimate(kitchenInput({ customerPriceMultiplier: 0.75 }));
  assert.strictEqual(low.pce_decision, 'BLOCK', 'low margin kitchen estimate returns BLOCK');

  const go = calculateKitchenEstimate(kitchenInput({ customerPriceMultiplier: 1.1 }));
  assert.strictEqual(go.pce_decision, 'GO', 'normal kitchen estimate returns GO');

  const scale = calculateKitchenEstimate(kitchenInput({ customerPriceMultiplier: 1.25 }));
  assert.strictEqual(scale.pce_decision, 'SCALE', 'high margin kitchen estimate returns SCALE');

  const customerView = buildCustomerKitchenEstimateView(estimate);
  assert.ok(!JSON.stringify(customerView).includes('materialCost'), 'customer kitchen view hides internal cost');

  const internalView = buildInternalKitchenCostView(estimate);
  assert.ok(JSON.stringify(internalView).includes('marginRate'), 'internal kitchen view shows margin');
}

function runServiceChecks() {
  const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-kitchen-${Date.now()}`);
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => tempRoot
    }
  });

  const input = kitchenInput({ customerPriceMultiplier: 1.1 });
  const preview = service.calculateKitchenEstimatePreview(input);
  assert.ok(preview.estimate.line_items.length > 0, 'preview creates items');

  const ai = service.getAiEstimateIntelligence({
    estimateId: 'KIT-AI-SMOKE',
    input: kitchenInput({
      options: {
        ...input.options,
        hoodReplace: true,
        indirectLighting: true,
        electricalUpgrade: false
      },
      island: true,
      kitchenType: 'island',
      countertopType: 'ceramic'
    }),
    persist: true
  });
  assert.ok(ai.warnings.length >= 3, 'AI warnings are generated for kitchen risk conditions');

  const saved = service.saveKitchenEstimate(input);
  assert.ok(saved.estimateId, 'kitchen estimate can be saved');
  const stats = service.getDbStats();
  assert.ok(stats.kitchenEstimateCount >= 1, 'kitchen estimate row exists');
  assert.ok(stats.kitchenEstimateItemCount >= 1, 'kitchen estimate items exist');

  const customerPdf = service.exportKitchenEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
  const internalExcel = service.exportKitchenEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
  assert.ok(fs.existsSync(customerPdf.filePath), 'kitchen customer PDF export works');
  assert.ok(fs.statSync(customerPdf.filePath).size > 200, 'kitchen customer PDF is not empty');
  assert.ok(fs.existsSync(internalExcel.filePath), 'kitchen internal Excel export works');

  const contract = service.generateKitchenContract({ estimateId: saved.estimateId, startDate: '2026-05-10' });
  assert.ok(contract.contractId, 'kitchen contract generation works');

  const schedule = service.generateKitchenSchedule({ estimateId: saved.estimateId, contractId: contract.contractId, startDate: '2026-05-10' });
  assert.ok(schedule.schedule.items.length >= 5, 'kitchen schedule generation works');

  const purchase = service.generateKitchenPurchaseOrder({ estimateId: saved.estimateId, contractId: contract.contractId, requiredDate: '2026-05-09' });
  assert.ok(purchase.purchaseOrder.items.length >= 5, 'kitchen purchase order generation works');
}

runPureCalculationChecks();
runServiceChecks();

console.log(JSON.stringify({ ok: true, test: 'kitchen-estimate-wizard.smoke' }));
