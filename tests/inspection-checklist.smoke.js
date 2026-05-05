const assert = require('assert');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-inspection');
const estimateId = createGoBathroomEstimate(service, 'INSPECTION');
const { schedule } = createScheduleAndPurchase(service, estimateId);

const checklist = service.createInspectionChecklistFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  processNameKo: '욕실 검수',
  actor: 'CEO'
});

const passResult = service.saveInspectionChecklistResults({
  projectId: estimateId,
  checklistId: checklist.checklistId,
  results: [],
  actor: 'CEO'
});

assert.strictEqual(passResult.evaluation.status, 'PASSED');
assert.strictEqual(passResult.evaluation.hasCriticalFail, false);

const failItem = checklist.checklist.items.find((item) => item.critical);
const failResult = service.saveInspectionChecklistResults({
  projectId: estimateId,
  checklistId: checklist.checklistId,
  results: [{ checkItemKo: failItem.itemNameKo, resultStatus: 'FAIL', actionRequiredKo: '재검수 필요' }],
  actor: 'CEO'
});

assert.strictEqual(failResult.evaluation.redAlert, true);
assert.ok(failResult.evaluation.blockedProcessesKo.length > 0);
console.log('inspection-checklist smoke passed');
