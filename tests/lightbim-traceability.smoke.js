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

const { service } = createTestService('boc-lightbim-traceability');
const payload = fixture('full-remodeling-lightbim.sample.json');
const imported = service.importLightBIMPayload({ payload, sourceFileName: 'traceability-full.sample.json' });
assert.ok(imported.ok, 'LightBIM import succeeds');

const draft = createEstimateDraftFromLightBIM(payload);
const reviewedState = [
  'bathroom_tile_area_m2',
  'tile_area_m2',
  'flooring_area_m2',
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
  estimateId: 'FULL-LBIM-TRACE-SMOKE',
  lightBimImportId: imported.importId,
  lightBimQuantityReviewState: reviewedState
});

let trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
assert.ok(trace.summary.totalCount > 0, 'Traceability records are created from LightBIM estimate');
assert.ok(trace.items.some((item) => item.sourceQuantityKey), 'Trace links include source quantity key');
assert.ok(trace.items.some((item) => item.estimateItemName), 'Estimate item is linked');
assert.ok(trace.summary.partialCount > 0 || trace.summary.missingCount > 0, 'Trace starts partial before downstream records');

const schedule = service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, startDate: '2026-05-20' });
trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
assert.ok(trace.items.some((item) => item.scheduleProcessName), 'Schedule item is linked after schedule generation');
assert.ok(schedule.traceabilitySummary.summary.totalCount > 0, 'Schedule generation reports trace summary');

const purchase = service.generateFullRemodelingPurchaseOrder({ estimateId: saved.estimateId, requiredDate: '2026-05-18' });
trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
const linked = find(trace.items, (item) => item.purchaseOrderItemId && item.executionFeedbackId && item.scheduleItemId, 'Full downstream trace exists after PO generation');
assert.strictEqual(linked.traceStatus, 'LINKED', 'Trace becomes LINKED when schedule, purchase order and feedback exist');
assert.ok(purchase.traceabilitySummary.summary.linkedCount > 0, 'Purchase order generation reports linked trace');

const orderItem = find(purchase.purchaseOrder.items, (item) => item.itemName === linked.purchaseItemName, 'Linked PO item exists');
const receiving = service.createMaterialReceivingLog({
  projectId: saved.estimateId,
  purchaseOrderId: purchase.purchaseOrderId,
  receivedItems: [{ itemNameKo: orderItem.itemName, receivedQuantity: orderItem.order_quantity, unit: orderItem.unit }],
  actor: 'CEO'
});
trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
const received = find(trace.items, (item) => item.purchaseItemName === orderItem.itemName, 'Receiving-linked trace exists');
assert.strictEqual(received.receivedQuantity, orderItem.order_quantity, 'Receiving updates traced quantity');
assert.ok(receiving.traceabilitySummary.summary.totalCount > 0, 'Receiving returns trace summary');

const feedback = find(
  service.getLightBIMExecutionFeedbackSummary({ estimateId: saved.estimateId }).items,
  (item) => item.itemName === orderItem.itemName,
  'Execution feedback exists for traced item'
);
service.updateLightBIMActualUsedQuantity({
  feedbackId: feedback.id,
  actualUsedQuantity: Number((feedback.reviewedQuantity * 1.12).toFixed(4)),
  remainingQuantity: 0,
  wasteQuantity: 0,
  reason: '추적 검증 초과 사용',
  confirmedBy: '현장 관리자'
});
trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
const overUsed = find(trace.items, (item) => item.executionFeedbackId === feedback.id, 'Feedback-linked trace exists');
assert.strictEqual(overUsed.traceStatus, 'REVIEW_REQUIRED', 'High variance becomes REVIEW_REQUIRED');
assert.ok(overUsed.actualUsedQuantity > 0 && overUsed.varianceRate > 0.1, 'Actual use and variance are traced');

service.generateLightBIMQuantityCalibration({ feedbackId: feedback.id });
trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
const calibrated = find(trace.items, (item) => item.executionFeedbackId === feedback.id, 'Calibrated trace exists');
assert.ok(calibrated.calibrationRuleId, 'Calibration recommendation is linked to trace');
assert.strictEqual(calibrated.calibrationStatus, 'PENDING_APPROVAL', 'Calibration remains subject to approval');

const bathroomSpace = trace.spaces.find((space) => String(space.spaceName).includes('욕실'));
assert.ok(bathroomSpace && bathroomSpace.items.length > 0, 'Space-based trace summary returns bathroom quantity items');

const portal = service.getClientPortalData({ projectId: saved.estimateId });
const customerPayload = JSON.stringify(portal);
['sourceQuantityKey', 'traceStatus', 'calibrationRuleId', 'lightbim_traceability_links'].forEach((forbidden) => {
  assert.ok(!customerPayload.includes(forbidden), `Customer portal hides ${forbidden}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-traceability.smoke',
  traceCount: trace.summary.totalCount,
  linkedCount: trace.summary.linkedCount,
  reviewRequiredCount: trace.summary.reviewRequiredCount,
  sourceSpace: bathroomSpace.spaceName
}));
