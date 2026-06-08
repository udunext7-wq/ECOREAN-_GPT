'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceReadinessImpactService } = require('../electron/services/priceReadinessImpactService');
const { createPriceCalibrationPriorityService } = require('../electron/services/priceCalibrationPriorityService');
const { createRealPriceCalibrationService } = require('../electron/services/realPriceCalibrationService');

const { service, root } = createTestService('boc-rc036-price-calibration-ux');
const app = { isPackaged: true, getPath: () => root };
const reportsDir = path.join(root, 'docs');
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const impactService = createPriceReadinessImpactService({ sqliteService: service, reportsDir });
const priorityService = createPriceCalibrationPriorityService({
  sqliteService: service,
  reportsDir,
  priceReadinessImpactService: impactService
});
const realPriceService = createRealPriceCalibrationService({
  sqliteService: service,
  backupRestoreService,
  docsDir: reportsDir
});

initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

function withMasterDb(callback) {
  const database = new DatabaseSync(service.dbPaths.master);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function readStandardItemPrice(itemId) {
  return withMasterDb((database) => {
    const row = database.prepare('SELECT default_customer_unit_price FROM standard_estimate_items WHERE id = ?').get(String(itemId));
    return row ? Number(row.default_customer_unit_price || 0) : null;
  });
}

const summary = priorityService.getPriceCalibrationPrioritySummary();
assert.ok(summary.summary.totalImpactCount >= 9, 'priority summary can be created');
assert.ok(summary.summary.priorityItemCount > 0, 'priority summary includes actionable items');
assert.strictEqual(summary.summary.customerSafety, 'PASSED', 'summary customer safety is marked passed');

const bathroom = priorityService.getPriorityItemsByEstimateType('BATHROOM');
const kitchen = priorityService.getPriorityItemsByEstimateType('KITCHEN');
const fullRemodeling = priorityService.getPriorityItemsByEstimateType('FULL_REMODELING');
assert.ok(bathroom.length > 0, 'BATHROOM priority calculation works');
assert.ok(kitchen.length > 0, 'KITCHEN priority calculation works');
assert.ok(fullRemodeling.length > 0, 'FULL_REMODELING priority calculation works');

const immediate = summary.priorityItems.find((item) => item.price_status === 'NEEDS_UPDATE');
assert.ok(immediate, 'NEEDS_UPDATE item exists');
assert.strictEqual(immediate.priority_level, 1, 'NEEDS_UPDATE is immediate calibration');
assert.strictEqual(immediate.priority_label_ko, '즉시 보정 필요', 'NEEDS_UPDATE Korean priority label is correct');

const partialKitchen = kitchen.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'HIGH');
assert.ok(partialKitchen, 'PARTIAL KITCHEN high-risk item exists');
assert.strictEqual(partialKitchen.priority_level, 2, 'PARTIAL KITCHEN is pre-estimate calibration');
assert.strictEqual(partialKitchen.priority_label_ko, '견적 전 보정 권장', 'PARTIAL KITCHEN Korean priority label is correct');

const partialFull = fullRemodeling.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'HIGH');
assert.ok(partialFull, 'PARTIAL FULL_REMODELING high-risk item exists');
assert.strictEqual(partialFull.priority_level, 2, 'PARTIAL FULL_REMODELING is pre-estimate calibration');

const partialBathroom = bathroom.find((item) => item.price_status === 'PARTIAL' && item.risk_level === 'MEDIUM');
assert.ok(partialBathroom, 'PARTIAL BATHROOM medium-risk item exists');
assert.strictEqual(partialBathroom.priority_level, 3, 'PARTIAL BATHROOM is CEO review priority');
assert.strictEqual(partialBathroom.priority_label_ko, '대표 검토 필요', 'PARTIAL BATHROOM Korean priority label is correct');

const taskSource = partialKitchen || partialFull || immediate;
const beforePrice = readStandardItemPrice(taskSource.item_id);
const task = priorityService.createCalibrationTaskFromImpact({
  estimateType: taskSource.estimate_type,
  priceReadinessStatus: taskSource.price_status,
  item_id: taskSource.item_id,
  item_name: taskSource.item_name,
  current_price: taskSource.current_price,
  suggested_price: Number(taskSource.current_price || 0) + 5000,
  note: 'RC-0.3.6 smoke calibration task'
});
assert.ok(task.ok && task.taskId, 'calibration task can be created from impact');
assert.strictEqual(task.task.review_status, 'PENDING', 'new calibration task stays pending');

const reviewed = priorityService.markCalibrationTaskReviewed(task.taskId, {
  reviewedBy: 'CEO',
  note: '검토 완료'
});
assert.ok(reviewed.ok, 'calibration task can be marked reviewed');
assert.strictEqual(reviewed.task.review_status, 'REVIEWED', 'task review status updated');

const queue = realPriceService.createVendorQuotePriceUpdate({
  targetType: 'STANDARD_ITEM',
  targetId: taskSource.item_id,
  targetName: taskSource.item_name,
  proposedPrice: Number(taskSource.current_price || 0) + 10000,
  unit: taskSource.unit || '식',
  vendorName: 'RC-0.3.6 테스트 업체',
  evidenceNote: '우선순위 작업 queue 연결 스모크'
});
assert.ok(queue.queueId, 'real price queue item can be created');
assert.strictEqual(queue.queueItem.status, 'PENDING_REVIEW', 'queue item is pending review and not auto-applied');

const linked = priorityService.linkCalibrationTaskToPriceQueue(task.taskId, queue.queueId);
assert.ok(linked.ok, 'task can be linked to price queue');
assert.strictEqual(linked.task.linked_queue_id, queue.queueId, 'linked queue id is saved');
assert.strictEqual(linked.task.review_status, 'LINKED_TO_QUEUE', 'linked task status is updated');

const afterPrice = readStandardItemPrice(taskSource.item_id);
assert.strictEqual(afterPrice, beforePrice, 'master price is not changed by priority task or queue creation');

const customerPayload = priorityService.buildCustomerSafePriorityPayload();
const leaks = priorityService.inspectForbiddenCustomerPayload(customerPayload);
assert.deepStrictEqual(leaks, [], 'customer payload does not expose priority/internal data');

const report = priorityService.createPriceCalibrationPriorityReport(summary);
assert.ok(report.ok, 'priority report generated');
assert.ok(fs.existsSync(report.reportPath), 'priority report file exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-6-price-calibration-ux.smoke',
  priorityItems: summary.summary.priorityItemCount,
  bathroom: bathroom.map((item) => ({ status: item.price_status, risk: item.risk_level, priority: item.priority_label_ko })).slice(0, 4),
  kitchen: kitchen.map((item) => ({ status: item.price_status, risk: item.risk_level, priority: item.priority_label_ko })).slice(0, 4),
  fullRemodeling: fullRemodeling.map((item) => ({ status: item.price_status, risk: item.risk_level, priority: item.priority_label_ko })).slice(0, 4),
  taskId: task.taskId,
  queueId: queue.queueId,
  masterPriceUnchanged: beforePrice === afterPrice,
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
