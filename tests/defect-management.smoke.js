const assert = require('assert');
const { createTestService, createGoBathroomEstimate } = require('./execution-test-helpers');

const { service } = createTestService('boc-defect');
const estimateId = createGoBathroomEstimate(service, 'DEFECT');

const result = service.createDefectReport({
  projectId: estimateId,
  siteNameKo: '하자 테스트 현장',
  defectLocationKo: '샤워부스 하부',
  defectTypeKo: '누수 의심',
  severity: 'HIGH',
  rootCauseKo: '실리콘 접합부 보완 필요',
  estimatedCost: 120000,
  actor: 'CEO'
});

const stats = service.getDbStats();
assert.ok(result.defectId, 'defect id should exist');
assert.ok(result.rootCauseId, 'root cause should be created');
assert.strictEqual(stats.defectReportCount, 1);
assert.ok(stats.liveMarginEventCount >= 1, 'defect cost should update live margin event');
assert.ok(stats.profitAutomationEventCount >= 0);
console.log('defect-management smoke passed');
