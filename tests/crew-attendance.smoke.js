const assert = require('assert');
const { createTestService, createGoBathroomEstimate } = require('./execution-test-helpers');

const { service } = createTestService('boc-attendance');
const estimateId = createGoBathroomEstimate(service, 'ATTEND');

const result = service.createCrewAttendanceReport({
  projectId: estimateId,
  siteNameKo: '출역 테스트 현장',
  workers: [
    { workerNameKo: '기공A', roleKo: '기공', checkInTime: '08:00', checkOutTime: '17:00', dailyWage: 280000 },
    { workerNameKo: '조공B', roleKo: '조공', checkInTime: '08:00', checkOutTime: '12:00', dailyWage: 160000 }
  ],
  actor: 'CEO'
});

assert.strictEqual(result.attendanceCount, 2);
assert.ok(result.totalLaborCost > 0, 'labor cost should be calculated');
assert.strictEqual(service.getDbStats().crewAttendanceLogCount, 2);
console.log('crew-attendance smoke passed');
