const assert = require('assert');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-analytics-bi');
const estimateId = createGoBathroomEstimate(service, 'ANALYTICS');
const { schedule } = createScheduleAndPurchase(service, estimateId);

service.createCrewAttendanceReport({
  projectId: estimateId,
  siteNameKo: '분석 테스트 현장',
  workDate: '2026-05-15',
  workers: [
    { workerNameKo: '김팀장', roleKo: '팀장', affiliationKo: '직영팀', checkInTime: '08:00', checkOutTime: '17:00', dailyWage: 250000 },
    { workerNameKo: '이기공', roleKo: '기공', affiliationKo: '직영팀', checkInTime: '08:00', checkOutTime: '17:00', dailyWage: 220000 }
  ],
  actor: 'CEO'
});

service.createDefectReport({
  projectId: estimateId,
  siteNameKo: '분석 테스트 현장',
  defectLocationKo: '욕실 바닥',
  defectTypeKo: '실리콘 보완',
  severity: 'MEDIUM',
  rootCauseKo: '마감 확인 필요',
  estimatedCost: 120000,
  actor: 'CEO'
});

service.saveMaterialPriceHistory({
  materialCategory: 'tile',
  materialName: '600각 포세린',
  specification: '600x600',
  brand: 'TEST',
  vendorName: '분석타일',
  quotedUnitPrice: 30000,
  actualUnitPrice: 33000,
  unit: 'BOX',
  sourceType: 'MANUAL'
});
service.saveMaterialPriceHistory({
  materialCategory: 'tile',
  materialName: '600각 포세린',
  specification: '600x600',
  brand: 'TEST',
  vendorName: '분석타일',
  quotedUnitPrice: 30000,
  actualUnitPrice: 39000,
  unit: 'BOX',
  sourceType: 'PURCHASE'
});

service.createFranchiseBranch({
  branchId: 'BR-ANALYTICS',
  branchName: '분석 지점',
  branchCode: 'ANALYTICS',
  ownerName: '지점장',
  region: '서울',
  hqApproved: true
});

const data = service.getAnalyticsCenterData();
assert.ok(data.summary, 'Analytics center loads');
assert.ok(data.profitAnalytics.totalRevenue > 0, 'Profit analytics calculate');
assert.ok(Array.isArray(data.profitAnalytics.processProfitability), 'Process profitability calculates');
assert.ok(Array.isArray(data.teamProductivity.teams), 'Team productivity analytics calculate');
assert.ok(data.teamProductivity.teams.length >= 1, 'Team productivity has rows');
assert.ok(Array.isArray(data.vendorAnalytics.vendors), 'Vendor analytics calculate');
assert.ok(data.vendorAnalytics.vendors.length >= 1, 'Vendor analytics has rows');
assert.ok(typeof data.conversionAnalytics.contractConversionRate === 'number', 'Conversion analytics calculate');
assert.ok(typeof data.cashflowAnalytics.receivableAmount === 'number', 'Cashflow analytics calculate');
assert.ok(Array.isArray(data.defectAnalytics.defectByProcess), 'Defect analytics calculate');
assert.ok(data.defectAnalytics.defectByProcess.length >= 1, 'Defect analytics has rows');
assert.ok(Array.isArray(data.branchComparison.branches), 'Branch comparison analytics calculate');
assert.ok(Array.isArray(data.aiPredictions), 'AI prediction returns result');
assert.ok(data.aiPredictions.length >= 5, 'AI prediction returns multiple KPI risks');
assert.ok(data.aiPredictions.every((prediction) => ['LOW', 'MEDIUM', 'HIGH'].includes(prediction.riskLevel)), 'AI prediction risk level is normalized');

const emptyService = createTestService('boc-analytics-empty').service;
const empty = emptyService.getAnalyticsCenterData();
assert.strictEqual(empty.emptyState, true, 'Empty analytics state renders safely');

const pdf = service.exportAnalyticsReport({ exportType: 'PDF' });
const xlsx = service.exportAnalyticsReport({ exportType: 'XLSX' });
assert.ok(pdf.filePath.endsWith('.pdf'), 'PDF analytics export path generated');
assert.ok(xlsx.filePath.endsWith('.xlsx'), 'Excel analytics export path generated');

const stats = service.getDbStats();
assert.ok(stats.analyticsSnapshotCount >= 1, 'analytics_snapshots has rows');
assert.ok(stats.analyticsPredictionCount >= 1, 'analytics_predictions has rows');
assert.ok(stats.analyticsExportLogCount >= 2, 'analytics_export_logs has rows');

console.log('analytics-business-intelligence smoke passed');
