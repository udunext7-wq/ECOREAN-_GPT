'use strict';

const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceReadinessImpactService } = require('../electron/services/priceReadinessImpactService');
const { createPriceCalibrationPriorityService } = require('../electron/services/priceCalibrationPriorityService');
const { createRealPriceCalibrationService } = require('../electron/services/realPriceCalibrationService');

const { service, root } = createTestService('boc-rc036-branch-stabilization');
const app = { isPackaged: true, getPath: () => root };
const reportsDir = path.join(root, 'docs');
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const impactService = createPriceReadinessImpactService({ sqliteService: service, reportsDir });
const priorityService = createPriceCalibrationPriorityService({ sqliteService: service, reportsDir, priceReadinessImpactService: impactService });
const realPriceService = createRealPriceCalibrationService({ sqliteService: service, backupRestoreService, docsDir: reportsDir });

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

function withMasterDb(callback) {
  const database = new DatabaseSync(service.dbPaths.master);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function readMasterPrice(itemId) {
  return withMasterDb((database) => {
    const row = database.prepare('SELECT default_customer_unit_price FROM standard_estimate_items WHERE id = ?').get(String(itemId));
    return row ? Number(row.default_customer_unit_price || 0) : null;
  });
}

function decideMergeReadiness(checks) {
  if (checks.customerLeaks.length > 0) return 'NOT_READY';
  if (!checks.masterPriceUnchanged) return 'NOT_READY';
  if (!checks.queuePendingReview) return 'NOT_READY';
  if (!checks.priorityRulesPass) return 'NOT_READY';
  return 'MERGE_READY';
}

const summary = priorityService.getPriceCalibrationPrioritySummary();
assert.ok(summary.summary.totalImpactCount >= 9, 'priority summary can be created');
assert.ok(summary.summary.priorityItemCount > 0, 'priority summary includes items');

const bathroom = priorityService.getPriorityItemsByEstimateType('BATHROOM');
const kitchen = priorityService.getPriorityItemsByEstimateType('KITCHEN');
const fullRemodeling = priorityService.getPriorityItemsByEstimateType('FULL_REMODELING');
assert.ok(bathroom.length > 0, 'BATHROOM priority can be calculated');
assert.ok(kitchen.length > 0, 'KITCHEN priority can be calculated');
assert.ok(fullRemodeling.length > 0, 'FULL_REMODELING priority can be calculated');

const needsUpdate = summary.priorityItems.find((item) => item.price_status === 'NEEDS_UPDATE');
const partialKitchen = kitchen.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'HIGH');
const partialFull = fullRemodeling.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'HIGH');
const partialBathroom = bathroom.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'MEDIUM');
assert.ok(needsUpdate, 'NEEDS_UPDATE priority item exists');
assert.ok(partialKitchen, 'PARTIAL KITCHEN priority item exists');
assert.ok(partialFull, 'PARTIAL FULL_REMODELING priority item exists');
assert.ok(partialBathroom, 'PARTIAL BATHROOM priority item exists');

assert.strictEqual(needsUpdate.priority_level, 1, 'NEEDS_UPDATE is immediate calibration');
assert.strictEqual(needsUpdate.priority_label_ko, '즉시 보정 필요', 'NEEDS_UPDATE label is immediate calibration');
assert.strictEqual(partialKitchen.priority_level, 2, 'PARTIAL KITCHEN is pre-estimate calibration');
assert.strictEqual(partialKitchen.priority_label_ko, '견적 전 보정 권장', 'PARTIAL KITCHEN label is pre-estimate calibration');
assert.strictEqual(partialFull.priority_level, 2, 'PARTIAL FULL_REMODELING is pre-estimate calibration');
assert.strictEqual(partialFull.priority_label_ko, '견적 전 보정 권장', 'PARTIAL FULL_REMODELING label is pre-estimate calibration');
assert.strictEqual(partialBathroom.priority_level, 3, 'PARTIAL BATHROOM is CEO review');
assert.strictEqual(partialBathroom.priority_label_ko, '대표 검토 필요', 'PARTIAL BATHROOM label is CEO review');

const taskSource = partialKitchen;
const beforePrice = readMasterPrice(taskSource.item_id);
const task = priorityService.createCalibrationTaskFromImpact({
  estimateType: taskSource.estimate_type,
  priceReadinessStatus: taskSource.price_status,
  item_id: taskSource.item_id,
  item_name: taskSource.item_name,
  current_price: taskSource.current_price,
  suggested_price: Number(taskSource.current_price || 0) + 12000,
  note: 'RC-0.3.6 stabilization task'
});
assert.ok(task.ok && task.taskId, 'calibration task can be created');
assert.strictEqual(task.task.review_status, 'PENDING', 'created task is pending');

const reviewed = priorityService.markCalibrationTaskReviewed(task.taskId, {
  reviewedBy: 'CEO',
  note: 'RC-0.3.6 안정화 검토 완료'
});
assert.ok(reviewed.ok, 'task can be reviewed');
assert.strictEqual(reviewed.task.review_status, 'REVIEWED', 'review status becomes REVIEWED');

const queue = realPriceService.createVendorQuotePriceUpdate({
  targetType: 'STANDARD_ITEM',
  targetId: taskSource.item_id,
  targetName: taskSource.item_name,
  proposedPrice: Number(taskSource.current_price || 0) + 20000,
  unit: taskSource.unit || '식',
  vendorName: 'RC-0.3.6 안정화 테스트 업체',
  evidenceNote: 'stabilization queue link'
});
assert.ok(queue.queueId, 'price queue can be created');
assert.strictEqual(queue.queueItem.status, 'PENDING_REVIEW', 'queue stays pending review');

const linked = priorityService.linkCalibrationTaskToPriceQueue(task.taskId, queue.queueId);
assert.ok(linked.ok, 'task can be linked to price queue');
assert.strictEqual(linked.task.linked_queue_id, queue.queueId, 'queue id linked to task');
assert.strictEqual(linked.task.review_status, 'LINKED_TO_QUEUE', 'task status becomes LINKED_TO_QUEUE');

const afterPrice = readMasterPrice(taskSource.item_id);
const customerPayload = priorityService.buildCustomerSafePriorityPayload();
const customerLeaks = priorityService.inspectForbiddenCustomerPayload(customerPayload);
assert.strictEqual(afterPrice, beforePrice, 'master price is not directly changed before approval/apply');
assert.deepStrictEqual(customerLeaks, [], 'customer payload hides priority/internal data');

const decision = decideMergeReadiness({
  customerLeaks,
  masterPriceUnchanged: beforePrice === afterPrice,
  queuePendingReview: queue.queueItem.status === 'PENDING_REVIEW',
  priorityRulesPass: needsUpdate.priority_level === 1 && partialKitchen.priority_level === 2 && partialFull.priority_level === 2 && partialBathroom.priority_level === 3
});
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision returns MERGE_READY when no S1/S2 exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-6-branch-stabilization.smoke',
  priorityItems: summary.summary.priorityItemCount,
  bathroom: { partial: partialBathroom.priority_label_ko, risk: partialBathroom.risk_level },
  kitchen: { partial: partialKitchen.priority_label_ko, risk: partialKitchen.risk_level },
  fullRemodeling: { partial: partialFull.priority_label_ko, risk: partialFull.risk_level },
  taskId: task.taskId,
  queueId: queue.queueId,
  queueStatus: queue.queueItem.status,
  masterPriceUnchanged: beforePrice === afterPrice,
  customerSafety: 'PASSED',
  stabilizationDecision: decision
}, null, 2));
