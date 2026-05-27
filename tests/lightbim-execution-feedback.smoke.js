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

function receive(service, projectId, purchaseOrderId, item, quantity) {
  return service.createMaterialReceivingLog({
    projectId,
    purchaseOrderId,
    receivedItems: [{ itemNameKo: item.itemName, receivedQuantity: quantity, unit: item.unit }],
    actor: 'CEO'
  });
}

const { service } = createTestService('boc-lightbim-execution-feedback');
const draft = createEstimateDraftFromLightBIM(fixture('full-remodeling-lightbim.sample.json'));
const confirmedKeys = [
  'bathroom_tile_area_m2',
  'tile_area_m2',
  'flooring_area_m2',
  'wallpaper_area_m2',
  'painting_area_m2',
  'ceiling_area_m2',
  'baseboard_length_m',
  'molding_length_m'
];
const lightBimQuantityReviewState = confirmedKeys.reduce((state, key) => ({
  ...state,
  [key]: { reviewedStatus: 'CONFIRMED', quantitySource: 'LIGHTBIM' }
}), {});

const saved = service.saveFullRemodelingEstimate({
  ...draft.input,
  estimateId: 'FULL-LBIM-FEEDBACK-SMOKE',
  lightBimQuantityReviewState
});
const purchaseResult = service.generateFullRemodelingPurchaseOrder({
  estimateId: saved.estimateId,
  requiredDate: '2026-05-24'
});
let feedback = purchaseResult.executionFeedback;
assert.ok(feedback.summary.totalCount > 0, 'Feedback records are created from LightBIM based purchase order');

const tile = find(feedback.items, (item) => item.itemName === '타일', 'Tile feedback exists');
const flooring = find(feedback.items, (item) => String(item.itemName).startsWith('바닥재'), 'Flooring feedback exists');
const ceiling = find(feedback.items, (item) => String(item.itemName).includes('천장'), 'Ceiling feedback exists');
assert.strictEqual(tile.lightBimQuantity, 29.4, 'Feedback stores LightBIM planned quantity');
assert.strictEqual(tile.reviewedQuantity, 29.4, 'Feedback stores reviewed quantity');
assert.strictEqual(tile.purchaseOrderQuantity, 32.34, 'Feedback stores purchase order quantity including waste');

const shortageReceipt = receive(service, saved.estimateId, purchaseResult.purchaseOrderId, tile, tile.purchaseOrderQuantity - 2);
assert.ok(shortageReceipt.executionFeedback.summary.shortageCount > 0, 'Receiving shortage updates feedback');
feedback = service.getLightBIMExecutionFeedbackSummary({ estimateId: saved.estimateId });
assert.strictEqual(find(feedback.items, (item) => item.id === tile.id, 'Short tile row exists').feedbackStatus, 'SHORTAGE', 'Receiving shortage becomes SHORTAGE');

receive(service, saved.estimateId, purchaseResult.purchaseOrderId, flooring, flooring.purchaseOrderQuantity);
const matched = service.updateLightBIMActualUsedQuantity({
  feedbackId: flooring.id,
  actualUsedQuantity: Number((flooring.reviewedQuantity * 1.04).toFixed(4)),
  wasteQuantity: 0,
  reason: '정상 시공 허용 편차',
  confirmedBy: '현장 관리자'
});
assert.strictEqual(matched.feedback.feedbackStatus, 'MATCHED', 'Five percent or less variance becomes MATCHED');
assert.ok(Math.abs(matched.feedback.varianceRate) <= 0.05, 'Variance rate is calculated from reviewed quantity');

receive(service, saved.estimateId, purchaseResult.purchaseOrderId, tile, 6);
const overUsed = service.updateLightBIMActualUsedQuantity({
  feedbackId: tile.id,
  actualUsedQuantity: Number((tile.reviewedQuantity * 1.12).toFixed(4)),
  remainingQuantity: 0,
  wasteQuantity: 0,
  reason: '현장 절단 손실 증가',
  confirmedBy: '현장 관리자'
});
assert.ok(['OVER_USED', 'WASTE_HIGH'].includes(overUsed.feedback.feedbackStatus), 'More than ten percent overuse is flagged');

receive(service, saved.estimateId, purchaseResult.purchaseOrderId, ceiling, ceiling.purchaseOrderQuantity);
const leftover = service.updateLightBIMActualUsedQuantity({
  feedbackId: ceiling.id,
  actualUsedQuantity: Number((ceiling.reviewedQuantity * 0.8).toFixed(4)),
  remainingQuantity: Number((ceiling.purchaseOrderQuantity * 0.15).toFixed(4)),
  wasteQuantity: 0,
  reason: '시공 후 잔량 확인',
  confirmedBy: '현장 관리자'
});
assert.strictEqual(leftover.feedback.feedbackStatus, 'UNDER_USED', 'High leftover requires review');

const calibration = service.generateLightBIMQuantityCalibration({ feedbackId: tile.id });
assert.strictEqual(calibration.estimateCalibrationRule.status, 'PENDING_APPROVAL', 'Estimate calibration requires approval');
assert.strictEqual(calibration.purchaseCalibrationRule.status, 'PENDING_APPROVAL', 'Purchase waste factor recommendation requires approval');
assert.ok(
  Number(calibration.purchaseCalibrationRule.recommended_waste_factor) > Number(calibration.purchaseCalibrationRule.current_waste_factor),
  'Overuse recommends a higher purchase waste factor'
);

const closing = service.getProjectClosingCenterData({ projectId: saved.estimateId, skipRefresh: true });
assert.ok(closing.executionFeedbackSummary.summary.totalCount > 0, 'Project closing reads execution feedback summary');
assert.ok(closing.executionFeedbackSummary.purchaseCalibrationRules.length > 0, 'Project closing can see purchase calibration candidates');

const tower = service.getCeoControlTowerData();
assert.ok(tower.decisions.some((item) => item.sourceModule === 'LightBIMExecutionFeedback'), 'CEO decision queue receives quantity variance warning');
assert.ok(tower.redAlerts.some((item) => item.sourceModule === 'LightBIMExecutionFeedback'), 'CEO RED ALERT receives high variance event');

const portal = service.getClientPortalData({ projectId: saved.estimateId });
const customerPayload = JSON.stringify(portal);
['actualUsedQuantity', 'varianceRate', 'purchaseCalibrationRules', 'lightbim_execution_quantity_feedback'].forEach((forbidden) => {
  assert.ok(!customerPayload.includes(forbidden), `Customer portal hides ${forbidden}`);
});

const closed = service.closeLightBIMExecutionFeedback({ feedbackId: flooring.id });
assert.strictEqual(closed.feedbackStatus, 'CLOSED', 'Feedback can be confirmed and closed');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-execution-feedback.smoke',
  feedbackCount: feedback.summary.totalCount,
  tileVarianceRate: overUsed.feedback.varianceRate,
  matchedStatus: matched.feedback.feedbackStatus,
  calibrationStatus: calibration.purchaseCalibrationRule.status
}));
