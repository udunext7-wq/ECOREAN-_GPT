const assert = require('assert');
const {
  validateLightBIMJSON,
  detectEstimateType,
  createEstimateDraftFromLightBIM,
  saveLightBIMImportRecord
} = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

function createPayload({ spaces, estimateType = '' }) {
  const totalArea = spaces.reduce((sum, space) => sum + Number(space.area_m2 || 0), 0);
  return {
    schema: 'ECOREAN.LightBIM.v0.1',
    project: {
      schema_version: '0.1',
      name: 'LightBIM Smoke Test'
    },
    quantities: {
      total_floor_area_m2: totalArea,
      total_ceiling_area_m2: totalArea,
      total_wall_area_m2: totalArea * 2.4,
      total_net_wall_area_m2: totalArea * 2.1,
      total_perimeter_m: spaces.reduce((sum, space) => sum + Number(space.perimeter_m || 0), 0),
      door_count: 2,
      window_count: 1,
      process_quantities: {
        flooring_area_m2: totalArea,
        wallpaper_area_m2: totalArea * 2,
        painting_area_m2: totalArea,
        ceiling_area_m2: totalArea,
        baseboard_length_m: 20,
        molding_length_m: 20,
        tile_area_m2: spaces.some((space) => String(space.type).toUpperCase().includes('BATH')) ? 16 : 0
      }
    },
    bocEstimateInput: {
      estimate_type: estimateType,
      area_m2: totalArea,
      spaces
    },
    aiPromptHints: {
      room_list: spaces.map((space) => space.name),
      negative_constraints: ['Do not invent windows.']
    }
  };
}

const bathroomPayload = createPayload({
  spaces: [{ id: 'S-BATH-1', name: '욕실1', type: 'BATHROOM', area_m2: 4.8, perimeter_m: 9 }]
});
const kitchenPayload = createPayload({
  spaces: [{ id: 'S-KIT-1', name: '주방', type: 'KITCHEN', area_m2: 7.2, perimeter_m: 11 }]
});
const fullPayload = createPayload({
  spaces: [
    { id: 'S-LIV-1', name: '거실', type: 'LIVING', area_m2: 24, perimeter_m: 20 },
    { id: 'S-KIT-1', name: '주방', type: 'KITCHEN', area_m2: 8, perimeter_m: 12 },
    { id: 'S-BATH-1', name: '욕실', type: 'BATHROOM', area_m2: 4.5, perimeter_m: 9 },
    { id: 'S-BED-1', name: '침실', type: 'BEDROOM', area_m2: 12, perimeter_m: 14 }
  ]
});

const validation = validateLightBIMJSON(bathroomPayload);
assert.strictEqual(validation.ok, true, 'Valid LightBIM JSON validates successfully');

const invalid = validateLightBIMJSON({ schema: 'BROKEN' });
assert.strictEqual(invalid.ok, false, 'Invalid JSON returns safe error');
assert.strictEqual(invalid.errorMessage, 'LightBIM JSON 형식이 올바르지 않습니다.');

assert.strictEqual(detectEstimateType(bathroomPayload), 'BATHROOM', 'Bathroom-only LightBIM JSON detects BATHROOM');
assert.strictEqual(detectEstimateType(kitchenPayload), 'KITCHEN', 'Kitchen LightBIM JSON detects KITCHEN');
assert.strictEqual(detectEstimateType(fullPayload), 'FULL_REMODELING', 'Multi-space JSON detects FULL_REMODELING');

const bathroomDraft = createEstimateDraftFromLightBIM(bathroomPayload);
assert.ok(bathroomDraft.summary.totalAreaM2 > 0, 'Quantity summary is parsed');
assert.strictEqual(bathroomDraft.estimateType, 'BATHROOM', 'Bathroom draft input is created');
assert.ok(bathroomDraft.input.bathroomAreaM2 > 0, 'Bathroom draft has area');

const kitchenDraft = createEstimateDraftFromLightBIM(kitchenPayload);
assert.strictEqual(kitchenDraft.estimateType, 'KITCHEN', 'Kitchen draft input is created');
assert.ok(kitchenDraft.input.kitchenLengthMm >= 1800, 'Kitchen draft has length');

const fullDraft = createEstimateDraftFromLightBIM(fullPayload);
assert.strictEqual(fullDraft.estimateType, 'FULL_REMODELING', 'Full remodeling draft input is created');
assert.ok(fullDraft.input.selectedProcesses.flooring, 'Full remodeling selected processes are mapped');

const record = saveLightBIMImportRecord(bathroomPayload, bathroomDraft);
assert.strictEqual(record.status, 'SUCCESS', 'Import record shape is generated');

const { service } = createTestService('boc-lightbim-import');
const imported = service.importLightBIMPayload({ payload: bathroomPayload, sourceFileName: 'bathroom-lightbim.json' });
assert.ok(imported.importId, 'Import record is saved');

const createdBathroom = service.createEstimateFromLightBIM({ importId: imported.importId });
assert.strictEqual(createdBathroom.ok, true, 'Bathroom estimate draft is created through BOC service');
assert.strictEqual(createdBathroom.estimateType, 'BATHROOM');
assert.ok(createdBathroom.preview.estimate.revenue > 0);

const createdKitchen = service.createEstimateFromLightBIM({ payload: kitchenPayload, estimateTypeOverride: 'KITCHEN' });
assert.strictEqual(createdKitchen.ok, true, 'Kitchen estimate draft is created through BOC service');
assert.strictEqual(createdKitchen.estimateType, 'KITCHEN');

const createdFull = service.createEstimateFromLightBIM({ payload: fullPayload, estimateTypeOverride: 'FULL_REMODELING' });
assert.strictEqual(createdFull.ok, true, 'Full remodeling estimate draft is created through BOC service');
assert.strictEqual(createdFull.estimateType, 'FULL_REMODELING');

const manualBathroom = service.calculateBathroomEstimatePreview({ ...bathroomDraft.input, customerName: '수동 테스트' });
assert.ok(manualBathroom.estimate.revenue > 0, 'Existing manual estimate flow still works');

console.log('LightBIM import smoke tests passed');
