const assert = require('assert');
const { createTestService, createGoBathroomEstimate } = require('./execution-test-helpers');

const { service } = createTestService('boc-change-order');
const estimateId = createGoBathroomEstimate(service, 'CHANGE');

const blocked = service.createExecutionChangeOrder({
  projectId: estimateId,
  titleKo: '저마진 추가공사',
  changeContentKo: '추가 시공',
  changeReasonKo: '고객 요청',
  additionalAmount: 100000,
  additionalCost: 90000,
  actor: 'CEO'
});

assert.strictEqual(blocked.blocked, true);
assert.strictEqual(blocked.pce.decision, 'BLOCK');

const allowed = service.createExecutionChangeOrder({
  projectId: estimateId,
  titleKo: '고마진 추가공사',
  changeContentKo: '옵션 추가',
  changeReasonKo: '고객 업셀',
  additionalAmount: 500000,
  additionalCost: 280000,
  actor: 'CEO'
});
assert.notStrictEqual(allowed.pce.decision, 'BLOCK');

const approved = service.approveExecutionChangeOrder({
  changeOrderId: allowed.changeOrderId,
  actor: 'CEO'
});
assert.strictEqual(approved.status, 'APPROVED');
assert.ok(approved.revenueImpact > 0);
assert.strictEqual(service.getDbStats().changeOrderCount, 2);
console.log('change-order smoke passed');
