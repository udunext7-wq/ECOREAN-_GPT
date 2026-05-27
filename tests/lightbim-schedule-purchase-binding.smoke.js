'use strict';

const assert = require('assert');
const path = require('path');
const { createEstimateDraftFromLightBIM } = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', 'lightbim', name));
}

function find(items, predicate, message) {
  const item = items.find(predicate);
  assert.ok(item, message);
  return item;
}

const { service } = createTestService('boc-lightbim-execution-binding');
const draft = createEstimateDraftFromLightBIM(fixture('full-remodeling-lightbim.sample.json'));
const confirmedBasis = [
  'bathroom_tile_area_m2',
  'tile_area_m2',
  'wallpaper_area_m2',
  'painting_area_m2',
  'ceiling_area_m2',
  'baseboard_length_m',
  'molding_length_m'
].reduce((state, key) => ({
  ...state,
  [key]: { reviewedStatus: 'CONFIRMED', quantitySource: 'LIGHTBIM' }
}), {});

const saved = service.saveFullRemodelingEstimate({
  ...draft.input,
  estimateId: 'FULL-LBIM-EXEC-SMOKE',
  manualQuantityOverrides: { flooring_area_m2: 70 },
  lightBimQuantityReviewState: {
    ...confirmedBasis,
    flooring_area_m2: { reviewedStatus: 'OVERRIDDEN', quantitySource: 'USER', currentQuantity: 70, overrideReason: '현장 검토 수량' }
  }
});
assert.ok(saved.estimateId, 'LightBIM based estimate is saved');

const scheduleResult = service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, startDate: '2026-05-20' });
const schedule = scheduleResult.schedule;
const bathroomSchedule = find(schedule.items, (item) => item.processName === '욕실', 'Bathroom schedule item exists');
const wallpaperSchedule = find(schedule.items, (item) => item.processName === '도배', 'Wallpaper schedule item exists');
const flooringSchedule = find(schedule.items, (item) => item.processName === '바닥', 'Flooring schedule item exists');
assert.strictEqual(bathroomSchedule.quantity_source, 'LIGHTBIM_REVIEWED', 'Schedule uses reviewed LightBIM tile quantity');
assert.strictEqual(bathroomSchedule.durationDays, 2, 'Tile schedule duration uses 15 m2/day productivity');
assert.strictEqual(wallpaperSchedule.durationDays, 4, 'Wallpaper schedule duration uses 40 m2/day productivity');
assert.strictEqual(flooringSchedule.quantity, 70, 'Schedule uses reviewed override flooring quantity');
assert.strictEqual(flooringSchedule.quantity_source, 'USER_REVIEW', 'Reviewed override has schedule priority');
assert.strictEqual(flooringSchedule.durationDays, 2, 'Flooring duration uses override quantity');
assert.ok(schedule.quantitySummary.lightbim_quantity_used, 'Schedule records LightBIM quantity summary');

const purchaseResult = service.generateFullRemodelingPurchaseOrder({ estimateId: saved.estimateId, requiredDate: '2026-05-18' });
const purchase = purchaseResult.purchaseOrder;
const tileOrder = find(purchase.items, (item) => item.itemName === '타일', 'Tile order exists');
const flooringOrder = find(purchase.items, (item) => String(item.itemName).startsWith('바닥재'), 'Flooring order exists');
assert.strictEqual(tileOrder.base_quantity, 29.4, 'Tile order uses reviewed LightBIM base quantity');
assert.strictEqual(tileOrder.order_quantity, 32.34, 'Tile order applies ten percent waste factor');
assert.strictEqual(tileOrder.waste_factor, 1.1, 'Tile waste factor stored');
assert.strictEqual(flooringOrder.base_quantity, 70, 'Flooring order uses reviewed user quantity');
assert.strictEqual(flooringOrder.order_quantity, 73.5, 'Flooring order applies five percent waste factor');
assert.strictEqual(flooringOrder.quantity_source, 'USER_REVIEW', 'Purchase order preserves override source');

const receiving = service.createMaterialReceivingLog({
  projectId: saved.estimateId,
  purchaseOrderId: purchaseResult.purchaseOrderId,
  receivedItems: [{
    itemNameKo: flooringOrder.itemName,
    receivedQuantity: 70,
    unit: flooringOrder.unit
  }],
  actor: 'CEO'
});
assert.strictEqual(receiving.shortageCount, 1, 'Material receiving compares against ordered quantity baseline');
assert.strictEqual(receiving.shortages[0].orderedQuantity, flooringOrder.order_quantity, 'Receiving uses purchase order quantity');
assert.strictEqual(receiving.shortages[0].expectedQuantitySource, 'USER_REVIEW', 'Receiving stores baseline quantity source');
assert.ok(receiving.shortages[0].lightBimBaseline, 'Receiving marks LightBIM based baseline');

const fallbackInput = { ...draft.input, lightBimSource: null, manualQuantityOverrides: {}, estimateId: 'FULL-DEFAULT-EXEC-SMOKE' };
const fallbackSaved = service.saveFullRemodelingEstimate(fallbackInput);
const fallbackPurchase = service.generateFullRemodelingPurchaseOrder({ estimateId: fallbackSaved.estimateId }).purchaseOrder;
assert.ok(fallbackPurchase.items.every((item) => item.quantity_source === 'ESTIMATE'), 'Missing LightBIM quantity falls back to estimate quantities');

const criticalInput = JSON.parse(JSON.stringify(draft.input));
criticalInput.estimateId = 'FULL-CRITICAL-EXEC-SMOKE';
criticalInput.lightBimSource.quantityBasis.warnings = [{
  code: 'INVALID_POLYGON',
  severity: 'CRITICAL',
  message: 'flooring_area_m2 도면 형상을 검토하세요.'
}];
const criticalSaved = service.saveFullRemodelingEstimate(criticalInput);
assert.throws(
  () => service.generateFullRemodelingPurchaseOrder({ estimateId: criticalSaved.estimateId }),
  /중요 수량 경고/,
  'Pending critical review warning prevents purchase order finalization'
);

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-schedule-purchase-binding.smoke',
  scheduleItemCount: schedule.items.length,
  purchaseOrderItemCount: purchase.items.length,
  tileOrderQuantity: tileOrder.order_quantity,
  receivingSource: receiving.shortages[0].expectedQuantitySource
}));
