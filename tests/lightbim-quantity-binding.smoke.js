const assert = require('assert');
const path = require('path');

const {
  createEstimateDraftFromLightBIM
} = require('../electron/services/lightBimImportService');
const {
  calculateBathroomEstimate
} = require('../electron/services/bathroomEstimateService');
const {
  calculateKitchenEstimate
} = require('../electron/services/kitchenEstimateService');
const {
  calculateFullRemodelingEstimate
} = require('../electron/services/fullRemodelingEstimateService');

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', 'lightbim', name));
}

function findItem(estimate, predicate) {
  const item = estimate.line_items.find(predicate);
  assert.ok(item, 'Expected estimate line item to exist');
  return item;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const bathroomPayload = fixture('bathroom-lightbim.sample.json');
const bathroomDraft = createEstimateDraftFromLightBIM(bathroomPayload);
const bathroomEstimate = calculateBathroomEstimate(bathroomDraft.input);
const bathroomTile = findItem(bathroomEstimate, (item) => item.itemName === '타일 부자재');
assert.strictEqual(bathroomTile.quantity, 25.6, 'Bathroom estimate uses LightBIM bathroom tile quantity');
assert.strictEqual(bathroomTile.quantity_source, 'LIGHTBIM', 'Bathroom tile item marks LIGHTBIM source');
const bathroomCeiling = findItem(bathroomEstimate, (item) => item.itemName === '욕실 천장');
assert.strictEqual(bathroomCeiling.quantity, 4.8, 'Bathroom ceiling quantity uses LightBIM ceiling area');
assert.strictEqual(bathroomCeiling.unit, '㎡', 'Bathroom ceiling switches to area unit when LightBIM is bound');

const kitchenPayload = clone(fixture('kitchen-lightbim.sample.json'));
delete kitchenPayload.quantities.process_quantities.estimated_kitchen_length_mm;
delete kitchenPayload.bocEstimateInput.spaces[0].estimated_kitchen_length_mm;
kitchenPayload.quantities.process_quantities.kitchen_wall_tile_area_m2 = 4.5;
const kitchenDraft = createEstimateDraftFromLightBIM(kitchenPayload);
const kitchenEstimate = calculateKitchenEstimate(kitchenDraft.input);
const kitchenTile = findItem(kitchenEstimate, (item) => item.itemName === '주방 벽타일');
assert.strictEqual(kitchenTile.quantity, 4.5, 'Kitchen estimate uses LightBIM kitchen wall tile area');
assert.strictEqual(kitchenTile.quantity_source, 'LIGHTBIM', 'Kitchen wall tile item marks LIGHTBIM source');
const kitchenCabinet = findItem(kitchenEstimate, (item) => item.itemName.startsWith('하부장'));
assert.ok(kitchenCabinet.quantity >= 5.9 && kitchenCabinet.quantity <= 6.1, 'Kitchen length fallback from perimeter works');
assert.strictEqual(kitchenCabinet.quantity_source, 'LIGHTBIM', 'Kitchen length fallback is treated as LightBIM source');
assert.ok(kitchenDraft.input.lightBimSource.warnings.some((warning) => warning.code === 'ESTIMATED_KITCHEN_LENGTH'), 'Kitchen length fallback warning is generated');

const fullPayload = clone(fixture('full-remodeling-lightbim.sample.json'));
fullPayload.quantities.process_quantities.bathroom_tile_area_m2 = 25.4;
fullPayload.quantities.process_quantities.kitchen_wall_tile_area_m2 = 4.2;
fullPayload.quantities.process_quantities.estimated_kitchen_length_mm = 3400;
const fullDraft = createEstimateDraftFromLightBIM(fullPayload);
const fullEstimate = calculateFullRemodelingEstimate(fullDraft.input);
const flooring = findItem(fullEstimate, (item) => item.itemName.startsWith('바닥재'));
assert.strictEqual(flooring.quantity, 58.6, 'Full remodeling flooring uses LightBIM flooring_area_m2');
const wallpaper = findItem(fullEstimate, (item) => item.itemName === '실크벽지');
assert.strictEqual(wallpaper.quantity, 132.5, 'Full remodeling wallpaper uses LightBIM wallpaper_area_m2');
const painting = findItem(fullEstimate, (item) => item.itemName === '도장재/퍼티');
assert.strictEqual(painting.quantity, 31.2, 'Full remodeling painting uses LightBIM painting_area_m2');
const baseboard = findItem(fullEstimate, (item) => item.itemName === '걸레받이/부자재');
assert.strictEqual(baseboard.quantity, 58.3, 'Full remodeling baseboard uses LightBIM baseboard_length_m');
assert.strictEqual(baseboard.unit, 'm', 'Full remodeling baseboard uses length unit');
assert.ok(fullEstimate.line_items.some((item) => item.quantity_source === 'LIGHTBIM'), 'Line items include quantity_source = LIGHTBIM');

const defaultBathroom = calculateBathroomEstimate({ customerName: '기본', siteName: '기본' });
const defaultTile = findItem(defaultBathroom, (item) => item.itemName === '타일 부자재');
assert.strictEqual(defaultTile.quantity_source, 'DEFAULT', 'Missing quantity_basis falls back to DEFAULT');

const overrideBathroom = calculateBathroomEstimate({
  ...bathroomDraft.input,
  manualQuantityOverrides: {
    bathroom_tile_area_m2: 30
  }
});
const overrideTile = findItem(overrideBathroom, (item) => item.itemName === '타일 부자재');
assert.strictEqual(overrideTile.quantity, 30, 'User override changes quantity');
assert.strictEqual(overrideTile.quantity_source, 'USER', 'User override marks quantity_source = USER');
assert.strictEqual(overrideTile.original_lightbim_quantity, 25.6, 'Original LightBIM quantity is preserved');

const smallerPayload = clone(bathroomPayload);
smallerPayload.quantities.process_quantities.tile_area_m2 = 10;
const smallerDraft = createEstimateDraftFromLightBIM(smallerPayload);
const smallerEstimate = calculateBathroomEstimate(smallerDraft.input);
assert.ok(smallerEstimate.revenue < bathroomEstimate.revenue, 'PCE inputs recalculate after LightBIM-bound quantity changes total revenue');
assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(smallerEstimate.pce_decision), 'PCE decision exists after LightBIM-bound estimate calculation');
assert.ok(bathroomEstimate.quantity_source_summary.lightbim_bound_item_count > 0, 'Quantity source summary counts LightBIM-bound items');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-quantity-binding.smoke',
  bathroomTileQuantity: bathroomTile.quantity,
  kitchenTileQuantity: kitchenTile.quantity,
  fullFlooringQuantity: flooring.quantity,
  pceDecision: smallerEstimate.pce_decision
}));
