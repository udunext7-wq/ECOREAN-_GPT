const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const {
  validateLightBIMJSON,
  detectEstimateType,
  createEstimateDraftFromLightBIM
} = require('../electron/services/lightBimImportService');

const exportPath = path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json');
assert.ok(fs.existsSync(exportPath), 'real MiniCAD LightBIM export JSON exists');

const payload = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
const validation = validateLightBIMJSON(payload);
assert.strictEqual(validation.ok, true, 'real MiniCAD export validates through BOC import service');
assert.strictEqual(detectEstimateType(payload), 'FULL_REMODELING', 'real MiniCAD export detects FULL_REMODELING');

const draft = createEstimateDraftFromLightBIM(payload);
assert.strictEqual(draft.estimateType, 'FULL_REMODELING', 'real MiniCAD export creates full remodeling draft');
assert.ok(draft.input.areaM2 > 0, 'draft includes total area');
assert.ok(draft.input.bathroomCount >= 1, 'draft includes bathroom count');
assert.strictEqual(draft.input.selectedProcesses.kitchen, true, 'draft detects kitchen process');
assert.strictEqual(draft.input.selectedProcesses.bathroom, true, 'draft detects bathroom process');
assert.ok(draft.input.selectedProcesses.flooring, 'draft maps flooring process quantity');
assert.ok(draft.input.lightBimSource.processQuantities.flooring_area_m2 > 0, 'draft includes selected process quantities');

const { service } = createTestService('boc-real-minicad-lightbim');
const imported = service.importLightBIMPayload({ payload, sourceFileName: 'real-minicad-export.lightbim.json' });
assert.strictEqual(imported.ok, true, 'real MiniCAD export imports into BOC');
assert.ok(imported.importId, 'import record is created');

const created = service.createEstimateFromLightBIM({ importId: imported.importId });
assert.strictEqual(created.ok, true, 'estimate draft is created from real MiniCAD export');
assert.strictEqual(created.estimateType, 'FULL_REMODELING', 'created estimate type is full remodeling');
assert.ok(created.estimateId, 'created estimate ID exists');
assert.ok(created.preview.estimate.revenue > 0, 'estimate calculation runs');
assert.ok(created.preview.estimate.total_cost > 0, 'estimate cost calculation runs');
assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(created.preview.pce.decision), 'PCE decision exists');
assert.ok(created.preview.customerView, 'customer output readiness exists');
assert.ok(created.preview.internalView, 'internal output readiness exists');

const saved = service.saveFullRemodelingEstimate({
  ...created.input,
  customerName: '실제 MiniCAD 검증 고객',
  siteName: '실제 MiniCAD 검증 현장',
  customerPriceMultiplier: Math.max(1.12, Number(created.input.customerPriceMultiplier || 1.12))
});
assert.ok(saved.estimateId, 'draft save returns final estimate ID');

const customerPdf = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'customer', format: 'pdf' });
const internalExcel = service.exportFullRemodelingEstimateDocument({ estimateId: saved.estimateId, documentType: 'internal', format: 'xlsx' });
assert.ok(fs.existsSync(customerPdf.filePath), 'customer PDF export readiness is confirmed');
assert.ok(fs.statSync(customerPdf.filePath).size > 200, 'customer PDF is not empty');
assert.ok(fs.existsSync(internalExcel.filePath), 'internal Excel export readiness is confirmed');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-real-minicad-import.smoke',
  detectedEstimateType: created.estimateType,
  draftEstimateId: created.estimateId,
  savedEstimateId: saved.estimateId,
  pceDecision: created.preview.pce.decision,
  customerOutputReady: true,
  internalOutputReady: true
}));
