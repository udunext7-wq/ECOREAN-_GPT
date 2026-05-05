const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-ceo-control-tower');
const estimateId = createGoBathroomEstimate(service, 'CEO-TOWER');
const { schedule, purchaseOrder } = createScheduleAndPurchase(service, estimateId);

const checklist = service.createInspectionChecklistFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  processNameKo: '욕실 검수',
  actor: 'CEO'
});
const critical = checklist.checklist.items.find((item) => item.critical);
service.saveInspectionChecklistResults({
  projectId: estimateId,
  checklistId: checklist.checklistId,
  results: [{ checkItemKo: critical.itemNameKo, resultStatus: 'FAIL', actionRequiredKo: '재시공 필요' }],
  actor: 'CEO'
});

service.createMaterialReceivingLog({
  projectId: estimateId,
  purchaseOrderId: purchaseOrder.purchaseOrderId,
  receivedItems: [{ itemNameKo: '600각 폴리싱 타일', orderedQuantity: 10, receivedQuantity: 7, unit: 'BOX' }],
  actor: 'CEO'
});

service.runProfitControlEngine({
  estimateId: 'PCE-BLOCK-CEO-TOWER',
  revenue: 1000000,
  totalCost: 900000
});

const blockedChangeOrder = service.createExecutionChangeOrder({
  projectId: estimateId,
  titleKo: '저마진 추가공사',
  changeContentKo: '저마진 추가 시공',
  changeReasonKo: '고객 요청',
  additionalAmount: 100000,
  additionalCost: 90000,
  actor: 'CEO'
});
assert.strictEqual(blockedChangeOrder.blocked, true);

const allowedChangeOrder = service.createExecutionChangeOrder({
  projectId: estimateId,
  titleKo: '승인 대기 추가공사',
  changeContentKo: '고마진 옵션 추가',
  changeReasonKo: '고객 업셀',
  additionalAmount: 500000,
  additionalCost: 250000,
  actor: 'CEO'
});

service.createDefectReport({
  projectId: estimateId,
  siteNameKo: 'Control Tower 테스트 현장',
  defectLocationKo: '샤워부스',
  defectTypeKo: '누수 의심',
  severity: 'HIGH',
  rootCauseKo: '실리콘 접합부 보완 필요',
  estimatedCost: 150000,
  actor: 'CEO'
});

const projectDb = new DatabaseSync(service.dbPaths.project);
const today = new Date().toISOString().slice(0, 10);
projectDb.prepare(`
  INSERT INTO live_margin_events (
    id, project_id, estimate_id, current_margin_rate, threshold, decision, reason, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('LME-CEO-UNDER-20', estimateId, estimateId, 0.18, 0.2, 'RED_ALERT', '마진율 20% 미만 테스트', new Date().toISOString());
projectDb.prepare(`
  INSERT INTO payables (
    payable_id, project_id, vendor_id, amount, due_date, actual_paid_date,
    payable_status, payable_type, notes_ko, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('PAY-CEO-NEGATIVE', estimateId, 'VENDOR-TEST', 1000000, today, null, 'DUE', 'VENDOR_PAYMENT', '오늘 지급 예정 테스트', new Date().toISOString(), new Date().toISOString());
projectDb.close();

let tower = service.getCeoControlTowerData();

assert.ok(tower.redAlerts.some((alert) => String(alert.titleKo).includes('검수') || String(alert.reasonKo).includes('검수')), 'critical inspection fail should create RED ALERT');
assert.ok(tower.redAlerts.some((alert) => alert.entityId === 'LME-CEO-UNDER-20'), 'live margin below 20 should create RED ALERT');
assert.ok(tower.decisions.some((item) => item.entityId === 'PCE-BLOCK-CEO-TOWER'), 'PCE BLOCK should create decision item');
assert.ok(tower.approvalRequests.some((item) => item.sourceModule === 'ChangeOrder'), 'change order should create approval item');
assert.ok(tower.decisions.some((item) => item.sourceModule === 'Procurement'), 'material shortage should create procurement risk item');
assert.ok(tower.redAlerts.some((alert) => alert.sourceModule === 'Cashflow'), 'negative cashflow should create RED ALERT');
assert.strictEqual(tower.decisions[0].riskLevel, 'RED', 'decision queue should sort RED first');

const pending = tower.approvalRequests.find((item) => item.status === 'PENDING');
assert.ok(pending, 'pending approval should exist');
service.decideCeoApprovalRequest({ requestId: pending.requestId, decision: 'APPROVED', actor: 'CEO', reasonKo: '테스트 승인' });
tower = service.getCeoControlTowerData();
assert.ok(tower.approvalRequests.some((item) => item.requestId === pending.requestId && item.status === 'APPROVED'), 'approval item can be approved');

const nextPending = tower.approvalRequests.find((item) => item.status === 'PENDING');
if (nextPending) {
  service.decideCeoApprovalRequest({ requestId: nextPending.requestId, decision: 'REJECTED', actor: 'CEO', reasonKo: '테스트 반려' });
  tower = service.getCeoControlTowerData();
  assert.ok(tower.approvalRequests.some((item) => item.requestId === nextPending.requestId && item.status === 'REJECTED'), 'approval item can be rejected');
}

const emptyContext = createTestService('boc-ceo-empty');
const emptyDb = new DatabaseSync(emptyContext.service.dbPaths.project);
emptyDb.prepare('DELETE FROM receivables').run();
emptyDb.prepare('DELETE FROM payables').run();
emptyDb.prepare('DELETE FROM cashflow_snapshots').run();
emptyDb.close();
const empty = emptyContext.service.getCeoControlTowerData();
assert.strictEqual(empty.cashflow.displayStatusKo, '데이터 없음', 'empty cashflow should return Korean empty state');

console.log('ceo-control-tower smoke passed');
