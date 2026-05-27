'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');

const fixturePath = path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json');
const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const { service } = createTestService('boc-lightbim-release-flow');

function find(items, predicate, message) {
  const item = items.find(predicate);
  assert.ok(item, message);
  return item;
}

function assertSafePayload(value, label) {
  const serialized = JSON.stringify(value).toLowerCase();
  [
    'internalcost',
    'material_cost',
    'labor_cost',
    'subcontract_cost',
    'margin',
    'pcedecision',
    'purchase',
    'receiving',
    'actual_used',
    'variance',
    'calibration',
    'red_alert',
    'risk_score'
  ].forEach((forbidden) => {
    assert.ok(!serialized.includes(forbidden), `${label} excludes ${forbidden}`);
  });
}

const imported = service.importLightBIMPayload({ payload, sourceFileName: 'real-minicad-release-flow.json' });
assert.ok(imported.ok && imported.importId, 'Real MiniCAD LightBIM JSON imports into BOC');

const created = service.createEstimateFromLightBIM({
  importId: imported.importId,
  estimateTypeOverride: 'FULL_REMODELING'
});
assert.ok(created.ok, 'Full remodeling estimate draft is created');
assert.strictEqual(created.estimateType, 'FULL_REMODELING', 'Full remodeling type is detected');
assert.ok(created.preview.estimate.line_items.some((item) => item.quantity_source === 'LIGHTBIM'), 'LightBIM quantities bind to line items');

const reviewData = service.getLightBIMQuantityReviews({
  estimateType: created.estimateType,
  estimateId: created.estimateId
});
assert.ok(reviewData.summary.totalCount > 0, 'Quantity review records are created');
const overrideTarget = find(
  reviewData.reviews,
  (review) => review.quantityBasisKey === 'flooring_area_m2',
  'Flooring review item is available for override'
);
for (const review of reviewData.reviews.filter((item) => item.id !== overrideTarget.id && item.reviewedStatus === 'PENDING')) {
  service.confirmLightBIMQuantityReview({ reviewId: review.id });
}
const overridden = service.updateLightBIMQuantityReview({
  reviewId: overrideTarget.id,
  quantity: Number(overrideTarget.currentQuantity || 0) + 1,
  reason: 'RC-0.3.0 종단 흐름 검증'
});
assert.strictEqual(overridden.review.quantitySource, 'USER', 'Reviewed user override is saved');

const recalculated = service.recalculateEstimateAfterQuantityReview({
  estimateType: created.estimateType,
  estimateId: created.estimateId
});
assert.ok(['BLOCK', 'MODIFY', 'GO', 'SCALE'].includes(recalculated.pce.decision), 'PCE is recalculated after override');
assert.ok(recalculated.after.revenue > 0, 'Estimate total is recalculated');

const finalizedReviews = service.getLightBIMQuantityReviews({
  estimateType: created.estimateType,
  estimateId: created.estimateId
}).reviews;
const lightBimQuantityReviewState = finalizedReviews.reduce((state, review) => ({
  ...state,
  [review.quantityBasisKey]: {
    reviewedStatus: review.reviewedStatus,
    quantitySource: review.quantitySource,
    currentQuantity: review.currentQuantity,
    overrideReason: review.overrideReason
  }
}), {});
const manualQuantityOverrides = finalizedReviews.reduce((state, review) => {
  if (review.quantitySource === 'USER') state[review.quantityBasisKey] = review.currentQuantity;
  return state;
}, {});
const saved = service.saveFullRemodelingEstimate({
  ...created.input,
  estimateId: 'FULL-LBIM-RELEASE-FLOW',
  customerName: 'RC-0.3.0 검증 고객',
  siteName: 'RC-0.3.0 검증 현장',
  lightBimImportId: imported.importId,
  manualQuantityOverrides,
  lightBimQuantityReviewState
});
assert.ok(saved.estimateId, 'Reviewed LightBIM estimate is saved before downstream documents');

const contract = service.generateFullRemodelingContract({
  estimateId: saved.estimateId,
  startDate: '2026-06-01'
});
assert.ok(contract.contractId, 'Contract is generated after PCE');

const schedule = service.generateFullRemodelingSchedule({
  estimateId: saved.estimateId,
  contractId: contract.contractId,
  startDate: '2026-06-01'
});
const flooringSchedule = find(schedule.schedule.items, (item) => item.processName === '바닥', 'Flooring schedule item exists');
assert.strictEqual(flooringSchedule.quantity_source, 'USER_REVIEW', 'Schedule consumes reviewed quantity');
assert.ok(flooringSchedule.productivity_rate > 0 && flooringSchedule.durationDays > 0, 'Schedule stores quantity-based duration basis');

const purchase = service.generateFullRemodelingPurchaseOrder({
  estimateId: saved.estimateId,
  contractId: contract.contractId,
  requiredDate: '2026-05-30'
});
const tileOrder = find(purchase.purchaseOrder.items, (item) => item.itemName === '타일', 'Tile purchase item exists');
assert.ok(tileOrder.order_quantity > tileOrder.base_quantity, 'Purchase order applies waste factor');
assert.ok(tileOrder.waste_factor > 1, 'Purchase order stores waste factor');

const receiving = service.createMaterialReceivingLog({
  projectId: saved.estimateId,
  purchaseOrderId: purchase.purchaseOrderId,
  receivedItems: [{
    itemNameKo: tileOrder.itemName,
    receivedQuantity: tileOrder.order_quantity,
    unit: tileOrder.unit
  }],
  actor: 'CEO'
});
assert.ok(receiving.executionFeedback.summary.totalCount > 0, 'Material receiving is connected to execution feedback');

const tileFeedback = find(
  service.getLightBIMExecutionFeedbackSummary({ estimateId: saved.estimateId }).items,
  (item) => item.itemName === tileOrder.itemName,
  'Tile execution feedback record exists'
);
const feedbackUpdate = service.updateLightBIMActualUsedQuantity({
  feedbackId: tileFeedback.id,
  actualUsedQuantity: Number((tileFeedback.reviewedQuantity * 1.12).toFixed(4)),
  remainingQuantity: 0,
  wasteQuantity: 0,
  reason: 'RC-0.3.0 차이 검증',
  confirmedBy: '현장 관리자'
});
assert.ok(feedbackUpdate.feedback.varianceRate > 0.1, 'Execution variance is calculated');

const trace = service.getLightBIMTraceabilitySummary({ estimateId: saved.estimateId });
assert.ok(trace.summary.totalCount > 0, 'Traceability links are available');
assert.ok(trace.items.some((item) => item.traceStatus), 'Traceability status exists');

const map = service.getLightBIMSpaceMapDataByEstimate({
  estimateType: created.estimateType,
  estimateId: saved.estimateId
});
assert.ok(map.spaces.length > 0 && map.traceSummaries.length > 0, 'Interactive space map loads linked geometry');

const customerMap = service.getLightBIMCustomerProposalMapByEstimate({
  estimateType: created.estimateType,
  estimateId: saved.estimateId
});
assert.strictEqual(customerMap.customerSafe, true, 'Customer proposal map is sanitized');
assertSafePayload(customerMap, 'Customer map');

const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  projectName: 'RC-0.3.0 LightBIM 제안서',
  title: '고객 공간 제안서',
  printFormat: 'A3_LANDSCAPE',
  estimateSummary: {
    totalAmount: recalculated.after.revenue,
    totalCost: recalculated.after.totalCost,
    margin: recalculated.after.margin,
    pceDecision: recalculated.pce.decision,
    scheduleDays: schedule.schedule.totalDurationDays,
    processGroups: []
  }
});
assert.ok(board.layout.sections.some((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP'), 'Proposal board includes customer map');
assertSafePayload(board.layout.customerPdfPayload, 'Proposal board PDF payload');

const customerPdf = service.exportFullRemodelingEstimateDocument({
  estimateId: saved.estimateId,
  documentType: 'customer',
  format: 'pdf'
});
const internalExcel = service.exportFullRemodelingEstimateDocument({
  estimateId: saved.estimateId,
  documentType: 'internal',
  format: 'xlsx'
});
const boardPdf = service.exportDesignBoardPdf({ boardId: board.boardId, exportMode: 'CLIENT_PROPOSAL' });
assert.ok(fs.existsSync(customerPdf.filePath), 'Customer estimate PDF export is ready');
assert.ok(fs.existsSync(internalExcel.filePath), 'Internal Excel export is ready');
assert.ok(fs.existsSync(boardPdf.filePath), 'Proposal board PDF export is ready');

const closing = service.getProjectClosingCenterData({ projectId: saved.estimateId, skipRefresh: true });
assert.ok(closing.executionFeedbackSummary.summary.totalCount > 0, 'Project closing reads LightBIM execution feedback');

const stats = service.getDbStats();
assert.ok(fs.existsSync(stats.lightBimExportDir), 'LightBIM export directory is created');
assert.strictEqual(path.basename(stats.lightBimExportDir), 'lightbim', 'LightBIM export directory is standardized');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-boc-release-flow.smoke',
  estimateId: saved.estimateId,
  pceDecision: recalculated.pce.decision,
  wasteFactor: tileOrder.waste_factor,
  varianceRate: feedbackUpdate.feedback.varianceRate,
  traceStatusCount: trace.summary.totalCount,
  outputReady: true
}));
