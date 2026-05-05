const assert = require('assert');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-daily-report');
const estimateId = createGoBathroomEstimate(service, 'DAILY');
const { schedule } = createScheduleAndPurchase(service, estimateId);

const result = service.createDailySiteReportFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  reportDate: '2026-05-10',
  actor: 'CEO'
});

assert.ok(result.reportId, 'daily report id should exist');
assert.ok(result.report.todayProcessKo, 'daily report should pull scheduled process');
assert.strictEqual(service.getDbStats().dailySiteReportItemCount, 1);
console.log('daily-site-report smoke passed');
