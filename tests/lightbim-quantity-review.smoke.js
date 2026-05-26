const assert = require('assert');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', 'lightbim', name));
}

const { service } = createTestService('boc-lightbim-quantity-review');
const payload = fixture('full-remodeling-lightbim.sample.json');
const imported = service.importLightBIMPayload({ payload, sourceFileName: 'full-remodeling-lightbim.sample.json' });
assert.ok(imported.ok, 'LightBIM import succeeds');

const created = service.createEstimateFromLightBIM({ importId: imported.importId, estimateTypeOverride: 'FULL_REMODELING' });
assert.ok(created.ok, 'Estimate draft is created from LightBIM');
assert.ok(created.quantityReviewSummary.totalCount > 0, 'Reviews are created from LightBIM-bound line items');

let reviewData = service.getLightBIMQuantityReviews({ estimateType: created.estimateType, estimateId: created.estimateId });
assert.ok(reviewData.reviews.length > 0, 'Review list loads');
assert.ok(reviewData.summary.pendingCount > 0, 'Quantity review summary returns counts');
const baseline = service.recalculateEstimateAfterQuantityReview({ estimateType: created.estimateType, estimateId: created.estimateId });
assert.strictEqual(baseline.before.revenue, created.preview.estimate.revenue, 'Review baseline keeps the full imported estimate revenue');

const first = reviewData.reviews[0];
const confirmed = service.confirmLightBIMQuantityReview({ reviewId: first.id });
assert.strictEqual(confirmed.review.reviewedStatus, 'CONFIRMED', 'Confirm review changes status to CONFIRMED');

const target = reviewData.reviews.find((review) => Number(review.lightBimQuantity || 0) > 0 && Number(review.currentQuantity || 0) > 0) || reviewData.reviews[1];
const missingReason = service.updateLightBIMQuantityReview({ reviewId: target.id, quantity: Number(target.currentQuantity || 1) + 1 });
assert.strictEqual(missingReason.ok, false, 'Override requires reason');
assert.strictEqual(missingReason.errorMessage, '수량 수정 사유를 입력하세요.');

const overridden = service.updateLightBIMQuantityReview({
  reviewId: target.id,
  quantity: Number(target.currentQuantity || 1) + 5,
  reason: '현장 실측 보정'
});
assert.strictEqual(overridden.ok, true, 'Override succeeds with reason');
assert.strictEqual(overridden.review.quantitySource, 'USER', 'Override quantity changes source to USER');
assert.strictEqual(overridden.review.reviewedStatus, 'OVERRIDDEN', 'Override marks status OVERRIDDEN');

const lightBimApplied = service.applyLightBIMQuantityReview({ reviewId: target.id });
assert.strictEqual(lightBimApplied.review.quantitySource, 'LIGHTBIM', 'Apply LightBIM quantity restores LIGHTBIM source');

const defaultApplied = service.resetLightBIMQuantityReviewToDefault({ reviewId: target.id });
assert.strictEqual(defaultApplied.review.quantitySource, 'DEFAULT', 'Reset to default restores DEFAULT source');

const recalcTarget = reviewData.reviews.find((review) => review.id !== first.id && review.id !== target.id) || target;
service.updateLightBIMQuantityReview({
  reviewId: recalcTarget.id,
  quantity: Number(recalcTarget.currentQuantity || 1) * 2,
  reason: '재계산 테스트'
});
const recalculated = service.recalculateEstimateAfterQuantityReview({ estimateType: created.estimateType, estimateId: created.estimateId });
assert.ok(recalculated.after.revenue !== recalculated.before.revenue, 'Recalculation changes estimate totals');
assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(recalculated.pce.decision), 'PCE reruns after recalculation');

const critical = service.createLightBIMQuantityReviews({
  importId: imported.importId,
  estimateType: 'FULL_REMODELING',
  estimateId: 'CRITICAL-REVIEW-TEST',
  lineItems: [{
    id: 'CRITICAL-ZERO-FLOOR',
    category: '바닥',
    itemName: '바닥재',
    quantity: 0,
    unit: '㎡',
    customerUnitPrice: 100000,
    materialCost: 0,
    laborCost: 0,
    subcontractCost: 0,
    quantity_source: 'DEFAULT',
    quantity_basis_key: 'flooring_area_m2'
  }],
  quantityBasis: { flooring_area_m2: 0 }
});
assert.strictEqual(critical.criticalUnresolvedCount, 1, 'Critical unresolved warning is detected');

const customerRow = recalculated.customerView[0];
assert.ok(customerRow.itemName, 'Customer view contains item name');
assert.strictEqual(customerRow.reviewedStatus, undefined, 'Customer view hides review metadata');
assert.strictEqual(customerRow.quantitySource, undefined, 'Customer view hides quantity source metadata');

const internalRow = recalculated.internalView[0];
assert.ok(internalRow.quantitySource, 'Internal view includes review metadata');
assert.ok(internalRow.reviewedStatus, 'Internal view includes review status');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-quantity-review.smoke',
  estimateType: created.estimateType,
  reviewCount: reviewData.reviews.length,
  pceDecision: recalculated.pce.decision
}));
