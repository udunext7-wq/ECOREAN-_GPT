'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceCalibrationPriorityService } = require('../electron/services/priceCalibrationPriorityService');
const { createRealPriceCalibrationService } = require('../electron/services/realPriceCalibrationService');
const { createRealPriceCalibrationWorkbenchService } = require('../electron/services/realPriceCalibrationWorkbenchService');

const { service, root } = createTestService('boc-rc037-real-price-calibration-ux');
const app = { isPackaged: true, getPath: () => root };
const reportsDir = path.join(root, 'docs');
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const priorityService = createPriceCalibrationPriorityService({ sqliteService: service, reportsDir });
const realPriceService = createRealPriceCalibrationService({ sqliteService: service, backupRestoreService, docsDir: reportsDir });
const workbenchService = createRealPriceCalibrationWorkbenchService({
  sqliteService: service,
  realPriceCalibrationService: realPriceService,
  priceCalibrationPriorityService: priorityService,
  reportsDir
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

function readStandardItem() {
  return withMasterDb((database) => database.prepare(`
    SELECT id, item_name, default_unit, default_customer_unit_price, price_status
    FROM standard_estimate_items
    ORDER BY is_mandatory DESC, id
    LIMIT 1
  `).get());
}

function readStandardItemPrice(itemId) {
  return withMasterDb((database) => {
    const row = database.prepare('SELECT default_customer_unit_price, price_status FROM standard_estimate_items WHERE id = ?').get(String(itemId));
    return {
      price: Number(row?.default_customer_unit_price || 0),
      priceStatus: String(row?.price_status || '')
    };
  });
}

function readTask(taskId) {
  return withMasterDb((database) => database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(String(taskId)));
}

const item = readStandardItem();
assert.ok(item?.id, 'standard estimate item exists');
const before = readStandardItemPrice(item.id);

const task = priorityService.createCalibrationTaskFromImpact({
  estimateType: 'FULL_REMODELING',
  priceReadinessStatus: 'PARTIAL',
  item_id: item.id,
  item_name: item.item_name,
  current_price: before.price,
  suggested_price: before.price + 12000,
  note: 'RC-0.3.7 워크벤치 연결 테스트'
});
assert.ok(task.ok && task.taskId, 'priority task can be created');

const queue = realPriceService.createVendorQuotePriceUpdate({
  targetType: 'STANDARD_ITEM',
  targetId: item.id,
  targetName: item.item_name,
  proposedPrice: before.price + 12000,
  unit: item.default_unit || '식',
  vendorName: 'RC-0.3.7 테스트 업체',
  evidenceNote: '워크벤치 승인/반영 테스트'
});
assert.ok(queue.queueId, 'price queue can be created');
assert.strictEqual(queue.queueItem.status, 'PENDING_REVIEW', 'queue starts pending review');

const linked = priorityService.linkCalibrationTaskToPriceQueue(task.taskId, queue.queueId);
assert.ok(linked.ok, 'priority task can link to queue');

const masterAfterQueue = readStandardItemPrice(item.id);
assert.strictEqual(masterAfterQueue.price, before.price, 'queue creation does not change master price');

const summary = workbenchService.getCalibrationWorkbenchSummary();
assert.ok(summary.totalQueueCount >= 1, 'workbench summary counts queue');
assert.ok(summary.pendingReviewCount >= 1, 'workbench summary counts pending review');

const rows = workbenchService.listCalibrationQueueItems({ status: 'PENDING_REVIEW' });
assert.ok(rows.some((row) => row.id === queue.queueId), 'workbench lists pending queue row');
assert.ok(rows.find((row) => row.id === queue.queueId).risk_level, 'workbench calculates risk level');

const detail = workbenchService.getCalibrationQueueItemDetail(queue.queueId);
assert.strictEqual(detail.queueItem.id, queue.queueId, 'queue detail can be read');

const approved = workbenchService.approveCalibrationQueueItem(queue.queueId, {
  note: '대표 검토 승인',
  approvedBy: 'CEO',
  linkedPriorityTaskId: task.taskId
});
assert.strictEqual(approved.status, 'APPROVED', 'workbench approves pending item');

const masterAfterApprove = readStandardItemPrice(item.id);
assert.strictEqual(masterAfterApprove.price, before.price, 'approval does not change master price');
assert.strictEqual(readTask(task.taskId).review_status, 'WORKBENCH_APPROVED', 'linked priority task status updates after approval');

const rejectQueue = realPriceService.createVendorQuotePriceUpdate({
  targetType: 'STANDARD_ITEM',
  targetId: item.id,
  targetName: item.item_name,
  proposedPrice: before.price + 22000,
  unit: item.default_unit || '식',
  vendorName: 'RC-0.3.7 반려 업체',
  evidenceNote: '반려 테스트'
});
const rejected = workbenchService.rejectCalibrationQueueItem(rejectQueue.queueId, { reason: '증빙 부족' });
assert.strictEqual(rejected.status, 'REJECTED', 'workbench rejects pending item');

const deferQueue = realPriceService.createVendorQuotePriceUpdate({
  targetType: 'STANDARD_ITEM',
  targetId: item.id,
  targetName: item.item_name,
  proposedPrice: before.price + 32000,
  unit: item.default_unit || '식',
  vendorName: 'RC-0.3.7 보류 업체',
  evidenceNote: '보류 테스트'
});
const deferred = workbenchService.deferCalibrationQueueItem(deferQueue.queueId, { reason: '단위 재확인' });
assert.strictEqual(deferred.status, 'DEFERRED', 'workbench defers pending item');

const applied = workbenchService.applyApprovedCalibrationWithBackup(queue.queueId, { appliedBy: 'CEO' });
assert.ok(applied.ok, 'approved queue applies after backup');
assert.strictEqual(applied.status, 'APPLIED', 'applied queue status is saved');
assert.ok(applied.backupId, 'backup id is returned after apply');

const masterAfterApply = readStandardItemPrice(item.id);
assert.strictEqual(masterAfterApply.price, before.price + 12000, 'master price changes only after approved backup apply');
assert.strictEqual(masterAfterApply.priceStatus, 'CONFIRMED', 'master price status becomes confirmed');

const history = workbenchService.getCalibrationHistory(queue.queueId);
assert.ok(history.some((row) => row.queue_id === queue.queueId && Number(row.old_price) === before.price && Number(row.new_price) === before.price + 12000), 'history records old and new price');
assert.strictEqual(readTask(task.taskId).review_status, 'WORKBENCH_APPLIED', 'linked priority task status updates after apply');

const readiness = workbenchService.getCalibrationWorkbenchSummary();
assert.ok(readiness.appliedCount >= 1, 'summary counts applied rows');
assert.ok(readiness.rejectedCount >= 1, 'summary counts rejected rows');
assert.ok(readiness.deferredCount >= 1, 'summary counts deferred rows');

const customerPayload = workbenchService.buildCustomerSafeWorkbenchPayload();
const leaks = workbenchService.inspectForbiddenCustomerPayload(customerPayload);
assert.deepStrictEqual(leaks, [], 'customer safe payload does not expose workbench/internal data');

const report = workbenchService.createCalibrationWorkbenchReport();
assert.ok(report.ok, 'workbench report generated');
assert.ok(fs.existsSync(report.reportPath), 'workbench report file exists');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-7-real-price-calibration-ux.smoke',
  queueId: queue.queueId,
  taskId: task.taskId,
  masterPriceBefore: before.price,
  masterPriceAfter: masterAfterApply.price,
  backupId: applied.backupId,
  appliedCount: readiness.appliedCount,
  rejectedCount: readiness.rejectedCount,
  deferredCount: readiness.deferredCount,
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
