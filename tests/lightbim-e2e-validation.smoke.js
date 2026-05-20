const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  validateLightBIMJSON,
  detectEstimateType,
  createEstimateDraftFromLightBIM
} = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

const fixtureDir = path.join(__dirname, 'fixtures', 'lightbim');

function loadFixture(fileName) {
  return JSON.parse(fs.readFileSync(path.join(fixtureDir, fileName), 'utf8'));
}

function assertPce(preview, label) {
  const decision = preview?.pce?.decision || preview?.estimate?.pce_decision;
  assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(decision), `${label} PCE decision exists`);
}

function assertEstimateOutput(preview, label) {
  assert.ok(preview.estimate.revenue > 0, `${label} estimate calculation runs`);
  assert.ok(preview.customerView, `${label} customer estimate output is ready`);
  assert.ok(preview.internalView, `${label} internal cost output is ready`);
  assert.ok(!JSON.stringify(preview.customerView).includes('materialCost'), `${label} customer output hides internal cost fields`);
  assert.ok(JSON.stringify(preview.internalView).includes('margin'), `${label} internal output includes margin data`);
}

function assertExportReadiness(service, created, label) {
  const input = {
    ...created.input,
    customerName: `${label} 고객`,
    siteName: `${label} 현장`,
    customerPriceMultiplier: Math.max(1.1, Number(created.input.customerPriceMultiplier || 1.1))
  };

  let saved;
  let customerPdf;
  let internalExcel;
  if (created.estimateType === 'BATHROOM') {
    saved = service.saveBathroomEstimate(input);
    customerPdf = service.exportBathroomEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
    internalExcel = service.exportBathroomEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
  } else if (created.estimateType === 'KITCHEN') {
    saved = service.saveKitchenEstimate(input);
    customerPdf = service.exportKitchenEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
    internalExcel = service.exportKitchenEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
  } else {
    saved = service.saveFullRemodelingEstimate(input);
    customerPdf = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
    internalExcel = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
  }

  assert.ok(saved.estimateId, `${label} draft save returns estimate ID`);
  assert.ok(fs.existsSync(customerPdf.filePath), `${label} customer PDF export readiness is confirmed`);
  assert.ok(fs.statSync(customerPdf.filePath).size > 200, `${label} customer PDF is not empty`);
  assert.ok(fs.existsSync(internalExcel.filePath), `${label} internal Excel export readiness is confirmed`);
  return saved.estimateId;
}

function runFlow({ service, fileName, expectedType, label }) {
  const payload = loadFixture(fileName);
  const validation = validateLightBIMJSON(payload);
  assert.strictEqual(validation.ok, true, `${label} LightBIM JSON validates`);
  assert.strictEqual(detectEstimateType(payload), expectedType, `${label} estimate type detected as ${expectedType}`);

  const draft = createEstimateDraftFromLightBIM(payload);
  assert.strictEqual(draft.estimateType, expectedType, `${label} draft created`);
  assert.ok(draft.input.lightBimSource, `${label} draft includes LightBIM source quantities`);

  const imported = service.importLightBIMPayload({ payload, sourceFileName: fileName });
  assert.strictEqual(imported.ok, true, `${label} import succeeds`);

  const created = service.createEstimateFromLightBIM({ importId: imported.importId });
  assert.strictEqual(created.ok, true, `${label} estimate draft created in BOC`);
  assert.strictEqual(created.estimateType, expectedType, `${label} created estimate type matches`);
  assertEstimateOutput(created.preview, label);
  assertPce(created.preview, label);

  const estimateId = assertExportReadiness(service, created, label);
  return {
    fileName,
    estimateType: created.estimateType,
    estimateId,
    pceDecision: created.preview.pce.decision
  };
}

const { service } = createTestService('boc-lightbim-e2e');

const bathroom = runFlow({
  service,
  fileName: 'bathroom-lightbim.sample.json',
  expectedType: 'BATHROOM',
  label: 'Bathroom'
});

const kitchen = runFlow({
  service,
  fileName: 'kitchen-lightbim.sample.json',
  expectedType: 'KITCHEN',
  label: 'Kitchen'
});

const full = runFlow({
  service,
  fileName: 'full-remodeling-lightbim.sample.json',
  expectedType: 'FULL_REMODELING',
  label: 'Full Remodeling'
});

const invalid = validateLightBIMJSON({ schema: 'ECOREAN.LightBIM.v0.1' });
assert.strictEqual(invalid.ok, false, 'Invalid LightBIM JSON returns safe Korean error');
assert.strictEqual(invalid.errorMessage, 'LightBIM JSON 형식이 올바르지 않습니다.');

const missingSpaces = validateLightBIMJSON({
  schema: 'ECOREAN.LightBIM.v0.1',
  project: { name: 'Missing Spaces' },
  quantities: {},
  bocEstimateInput: {},
  aiPromptHints: {}
});
assert.strictEqual(missingSpaces.ok, false, 'Missing spaces returns safe Korean error');
assert.strictEqual(missingSpaces.errorMessage, '공간 정보가 없습니다.');

const manualPreview = service.calculateBathroomEstimatePreview({
  customerName: '수동 견적',
  siteName: '수동 현장',
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
    zenda: false,
    bathtub: false,
    slidingCabinet: false,
    ventilationFanReplace: true,
    lightingReplace: true,
    faucetReplace: true
  }
});
assert.ok(manualPreview.estimate.revenue > 0, 'Existing manual estimate tests still pass');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-e2e-validation.smoke',
  results: [bathroom, kitchen, full]
}));
