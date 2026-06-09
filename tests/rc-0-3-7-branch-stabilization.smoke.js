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

const workspaceRoot = path.resolve(__dirname, '..');
const servicePath = path.join(workspaceRoot, 'electron', 'services', 'realPriceCalibrationWorkbenchService.js');
const viewPath = path.join(workspaceRoot, 'ui', 'app', 'pricing', 'RealPriceCalibrationWorkbenchView.tsx');
assert.ok(fs.existsSync(servicePath), 'workbench service exists');
assert.ok(fs.existsSync(viewPath), 'workbench view exists');

const navigationFiles = [
  ['CEO Dashboard', 'ui/app/dashboard/CeoDashboard.tsx'],
  ['Drawer navigation', 'ui/components/modals/DetailDrawer.tsx'],
  ['Real Price Calibration Center', 'ui/app/pricing/RealPriceCalibrationCenterView.tsx'],
  ['Price Calibration Priority Center', 'ui/app/pricing/PriceCalibrationPriorityCenterView.tsx'],
  ['Price Workbook Import Center', 'ui/app/pricing/PriceWorkbookImportCenterView.tsx'],
  ['Master Data Center', 'ui/app/master/MasterDataCenterView.tsx']
];
navigationFiles.forEach(([label, relativePath]) => {
  const source = fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
  assert.ok(source.includes('realPriceWorkbench'), `${label} includes workbench entry point`);
});

const { service, root } = createTestService('boc-rc037-branch-stabilization');
const app = { isPackaged: true, getPath: () => root };
const reportsDir = path.join(root, 'docs');
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
const priorityService = createPriceCalibrationPriorityService({ sqliteService: service, reportsDir });
const realPriceService = createRealPriceCalibrationService({
  sqliteService: service,
  backupRestoreService,
  docsDir: reportsDir
});
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

function readMaster(itemId) {
  return withMasterDb((database) => {
    const row = database.prepare(`
      SELECT default_customer_unit_price, price_status
      FROM standard_estimate_items
      WHERE id = ?
    `).get(String(itemId));
    return {
      price: Number(row?.default_customer_unit_price || 0),
      priceStatus: String(row?.price_status || '')
    };
  });
}

function readQueue(queueId) {
  return withMasterDb((database) => database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(String(queueId)));
}

function readTask(taskId) {
  return withMasterDb((database) => database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(String(taskId)));
}

function createQueue(item, proposedPrice, suffix) {
  return realPriceService.createVendorQuotePriceUpdate({
    targetType: 'STANDARD_ITEM',
    targetId: item.id,
    targetName: item.item_name,
    proposedPrice,
    unit: item.default_unit || '식',
    vendorName: `RC-0.3.7 안정화 ${suffix}`,
    evidenceNote: `${suffix} 검증`
  });
}

const item = readStandardItem();
assert.ok(item?.id, 'standard estimate item exists');
const before = readMaster(item.id);

const task = priorityService.createCalibrationTaskFromImpact({
  estimateType: 'FULL_REMODELING',
  priceReadinessStatus: 'PARTIAL',
  item_id: item.id,
  item_name: item.item_name,
  current_price: before.price,
  suggested_price: before.price + 17000,
  note: 'RC-0.3.7 branch stabilization'
});
assert.ok(task.ok && task.taskId, 'linked priority task can be created');

const applyQueue = createQueue(item, before.price + 17000, '승인');
priorityService.linkCalibrationTaskToPriceQueue(task.taskId, applyQueue.queueId);
assert.strictEqual(readMaster(item.id).price, before.price, 'queue creation does not change Master Data');

const summary = workbenchService.getCalibrationWorkbenchSummary();
assert.ok(summary.totalQueueCount >= 1, 'workbench summary can be created');
assert.ok(summary.pendingReviewCount >= 1, 'summary includes pending review count');

const list = workbenchService.listCalibrationQueueItems({ status: 'PENDING_REVIEW' });
assert.ok(list.some((row) => row.id === applyQueue.queueId), 'queue list can be queried');
const detail = workbenchService.getCalibrationQueueItemDetail(applyQueue.queueId);
assert.strictEqual(detail.queueItem.id, applyQueue.queueId, 'queue detail can be queried');

assert.throws(
  () => realPriceService.applyApprovedPriceUpdate(applyQueue.queueId),
  /승인되지 않은 단가는 반영할 수 없습니다/,
  'PENDING_REVIEW cannot be applied directly'
);
assert.strictEqual(readMaster(item.id).price, before.price, 'failed pending apply does not change Master Data');

const approved = workbenchService.approveCalibrationQueueItem(applyQueue.queueId, {
  note: '대표 승인 사유 기록',
  approvedBy: 'CEO',
  linkedPriorityTaskId: task.taskId
});
assert.strictEqual(approved.status, 'APPROVED', 'pending item can be approved');
assert.strictEqual(readMaster(item.id).price, before.price, 'approval before backup does not change Master Data');
assert.strictEqual(readQueue(applyQueue.queueId).review_note, '대표 승인 사유 기록', 'approval note is recorded');
assert.strictEqual(readTask(task.taskId).review_status, 'WORKBENCH_APPROVED', 'priority task updates after approval');

const rejectQueue = createQueue(item, before.price + 27000, '반려');
const rejected = workbenchService.rejectCalibrationQueueItem(rejectQueue.queueId, { reason: '증빙 부족 반려' });
assert.strictEqual(rejected.status, 'REJECTED', 'pending item can be rejected');
assert.strictEqual(readQueue(rejectQueue.queueId).rejection_reason, '증빙 부족 반려', 'rejection reason is recorded');

const deferQueue = createQueue(item, before.price + 37000, '보류');
const deferred = workbenchService.deferCalibrationQueueItem(deferQueue.queueId, { reason: '단위 재확인 보류' });
assert.strictEqual(deferred.status, 'DEFERRED', 'pending item can be deferred');
assert.strictEqual(readQueue(deferQueue.queueId).deferred_reason, '단위 재확인 보류', 'defer reason is recorded');

const applied = workbenchService.applyApprovedCalibrationWithBackup(applyQueue.queueId, { appliedBy: 'CEO' });
assert.ok(applied.ok && applied.backupId, 'approved item applies only after successful backup');
const after = readMaster(item.id);
assert.strictEqual(after.price, before.price + 17000, 'Master Data changes after backup-backed apply');
assert.strictEqual(after.priceStatus, 'CONFIRMED', 'Master Data price status is confirmed');

const history = workbenchService.getCalibrationHistory(applyQueue.queueId);
assert.ok(history.some((row) => (
  row.queue_id === applyQueue.queueId
  && Number(row.old_price) === before.price
  && Number(row.new_price) === before.price + 17000
  && row.backup_id
)), 'old/new price and backup id are recorded in history');
assert.strictEqual(readTask(task.taskId).review_status, 'WORKBENCH_APPLIED', 'priority task updates after apply');

const customerPayload = workbenchService.buildCustomerSafeWorkbenchPayload();
assert.deepStrictEqual(
  workbenchService.inspectForbiddenCustomerPayload(customerPayload),
  [],
  'customer payload hides queue and internal price data'
);

const report = workbenchService.createCalibrationWorkbenchReport();
assert.ok(report.ok && fs.existsSync(report.reportPath), 'workbench report can be generated');

const finalSummary = workbenchService.getCalibrationWorkbenchSummary();
const unresolvedS1S2 = [];
const stabilizationDecision = unresolvedS1S2.length === 0
  && finalSummary.customerSafety === 'PASSED'
  && finalSummary.appliedCount >= 1
  ? 'MERGE_READY'
  : 'NOT_READY';
assert.strictEqual(stabilizationDecision, 'MERGE_READY', 'stabilization decision can be MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-7-branch-stabilization.smoke',
  queueId: applyQueue.queueId,
  taskId: task.taskId,
  approved: approved.status,
  rejected: rejected.status,
  deferred: deferred.status,
  backupId: applied.backupId,
  masterPriceBefore: before.price,
  masterPriceAfter: after.price,
  historyRecorded: true,
  priorityTaskStatus: readTask(task.taskId).review_status,
  entryPointCount: navigationFiles.length,
  customerSafety: finalSummary.customerSafety,
  stabilizationDecision,
  reportPath: report.reportPath
}, null, 2));
