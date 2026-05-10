const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  calculateFullRemodelingEstimate,
  buildCustomerFullEstimateView,
  buildInternalFullCostView
} = require('../electron/services/fullRemodelingEstimateService');
const { createSqliteService } = require('../electron/services/sqliteService');

function fullInput(overrides = {}) {
  return {
    customerName: 'Full Customer',
    siteName: 'Full Site',
    constructionType: 'full_remodel',
    areaM2: 79,
    areaPyeong: 24,
    roomCount: 3,
    bathroomCount: 1,
    kitchenType: 'l_shape',
    balconyCount: 1,
    customerPriceMultiplier: 1.1,
    selectedProcesses: {
      bathroom: true,
      kitchen: true,
      flooring: true,
      wallpaper: true,
      painting: false,
      carpentry: true,
      electrical: true,
      lighting: true,
      film: true,
      windows: true,
      builtInFurniture: true,
      entrance: true,
      balcony: true
    },
    options: {
      film: { doors: true, frames: true, sash: true, furniture: false },
      windows: { replacement: true, glassReplacement: false, insulation: true },
      builtInFurniture: { closet: true, shoeCabinet: true, pantry: false, storage: false }
    },
    ...overrides
  };
}

function runPureCalculationChecks() {
  const estimate = calculateFullRemodelingEstimate(fullInput());
  assert.ok(Array.isArray(estimate.line_items), 'full remodeling estimate creates line items');
  assert.ok(estimate.line_items.length >= 20, 'full remodeling estimate creates practical line items');
  const groups = new Set(estimate.line_items.map((item) => item.category));
  for (const group of ['철거', '욕실', '주방', '바닥', '도배', '목공', '전기/조명', '필름', '창호', '가구', '마감']) {
    assert.ok(groups.has(group), `${group} group is generated`);
  }
  assert.ok(estimate.revenue > 0, 'revenue is calculated');
  assert.ok(estimate.total_cost > 0, 'cost is calculated');
  assert.ok(Number.isFinite(estimate.expected_margin_rate), 'margin is calculated');
  assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(estimate.pce_decision), 'PCE returns decision');

  const low = calculateFullRemodelingEstimate(fullInput({ customerPriceMultiplier: 0.8 }));
  assert.strictEqual(low.pce_decision, 'BLOCK', 'low margin full remodeling estimate returns BLOCK');
  const go = calculateFullRemodelingEstimate(fullInput({ customerPriceMultiplier: 1.1 }));
  assert.strictEqual(go.pce_decision, 'GO', 'normal full remodeling estimate returns GO');
  const scale = calculateFullRemodelingEstimate(fullInput({ customerPriceMultiplier: 1.22 }));
  assert.strictEqual(scale.pce_decision, 'SCALE', 'high margin full remodeling estimate returns SCALE');

  const customerView = buildCustomerFullEstimateView(estimate);
  assert.ok(!JSON.stringify(customerView).includes('materialCost'), 'customer view hides internal cost');
  const internalView = buildInternalFullCostView(estimate);
  assert.ok(JSON.stringify(internalView).includes('marginRate'), 'internal view shows margin');
}

function runServiceChecks() {
  const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-full-${Date.now()}`);
  const service = createSqliteService({
    app: {
      isPackaged: true,
      getPath: () => tempRoot
    }
  });

  const input = fullInput({ customerPriceMultiplier: 1.1 });
  const preview = service.calculateFullRemodelingEstimatePreview(input);
  assert.ok(preview.estimate.line_items.length > 0, 'preview creates items');

  const ai = service.getAiEstimateIntelligence({
    estimateId: 'FULL-AI-SMOKE',
    input: {
      ...input,
      demolition: { fullDemolition: true },
      selectedProcesses: { ...input.selectedProcesses, bathroom: true, kitchen: true },
      options: { lighting: { downlight: true, indirect: true }, electrical: { upgrade: false } }
    },
    estimate: { line_items: [] },
    persist: true
  });
  assert.ok(ai.warnings.length >= 1, 'AI warnings are generated');

  const saved = service.saveFullRemodelingEstimate(input);
  assert.ok(saved.estimateId, 'full remodeling estimate can be saved');
  const stats = service.getDbStats();
  assert.ok(stats.fullRemodelingEstimateCount >= 1, 'full remodeling estimate row exists');
  assert.ok(stats.fullRemodelingEstimateItemCount >= 1, 'full remodeling estimate items exist');

  const customerPdf = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
  const internalExcel = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
  assert.ok(fs.existsSync(customerPdf.filePath), 'PDF export works');
  assert.ok(fs.statSync(customerPdf.filePath).size > 200, 'PDF is not empty');
  assert.ok(fs.existsSync(internalExcel.filePath), 'Excel export works');

  const contract = service.generateFullRemodelingContract({ estimateId: saved.estimateId, startDate: '2026-05-15' });
  assert.ok(contract.contractId, 'contract generation works');
  const schedule = service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, contractId: contract.contractId, startDate: '2026-05-15' });
  assert.ok(schedule.schedule.items.length >= 5, 'schedule generation works');
  const purchase = service.generateFullRemodelingPurchaseOrder({ estimateId: saved.estimateId, contractId: contract.contractId, requiredDate: '2026-05-14' });
  assert.ok(purchase.purchaseOrder.items.length >= 10, 'purchase order generation works');
}

runPureCalculationChecks();
runServiceChecks();

console.log(JSON.stringify({ ok: true, test: 'full-remodeling-estimate-wizard.smoke' }));
