const assert = require('assert');
const { createTestService } = require('./execution-test-helpers');

const { service } = createTestService('boc-franchise-replication');

const branch = service.createFranchiseBranch({
  branchId: 'BRANCH-GANGNAM',
  branchName: '강남 지점',
  branchCode: 'GN001',
  ownerName: '지점장',
  contact: 'UNKNOWN',
  region: '서울 강남',
  address: '서울 강남구'
});
assert.strictEqual(branch.branch.id, 'BRANCH-GANGNAM', 'Branch can be created');

service.saveBathroomEstimate({
  estimateId: 'FR-HQ-BATH-EST',
  customerName: 'HQ Customer',
  siteName: 'HQ Site',
  customerPriceMultiplier: 1.35,
  actor: 'CEO'
});
let franchiseData = service.getFranchiseCenterData();
let hqMetric = franchiseData.branchMetrics.find((metric) => metric.branchId === 'HEADQUARTERS');
assert.ok(hqMetric.estimateCount >= 1, 'Existing data defaults to headquarters');

const packageResult = service.publishFranchiseDistributionPackage({
  packageId: 'FDP-SMOKE-001',
  packageName: '본사 표준 패키지',
  packageType: 'MASTER_STANDARD',
  version: '1.0.0',
  status: 'PUBLISHED'
});
assert.strictEqual(packageResult.package.id, 'FDP-SMOKE-001', 'Master data package can be published');

const appliedPackage = service.applyFranchisePackageToBranch({
  branchId: 'BRANCH-GANGNAM',
  packageId: 'FDP-SMOKE-001'
});
assert.strictEqual(appliedPackage.status.status, 'APPLIED', 'Branch can apply package');

service.saveBathroomEstimate({
  estimateId: 'FR-GN-BATH-EST',
  branchId: 'BRANCH-GANGNAM',
  customerName: 'Branch Customer',
  siteName: 'Branch Site',
  customerPriceMultiplier: 1.35,
  actor: 'CEO'
});
franchiseData = service.getFranchiseCenterData({ branchId: 'BRANCH-GANGNAM' });
const branchMetric = franchiseData.branchMetrics.find((metric) => metric.branchId === 'BRANCH-GANGNAM');
assert.ok(branchMetric.estimateCount >= 1, 'Branch performance metrics calculate');

const pendingPolicy = service.createBranchProfitPolicy({
  branchId: 'BRANCH-GANGNAM',
  minMarginRate: 0.3,
  scaleMarginRate: 0.4,
  blockThreshold: 0.3,
  reasonKo: '지점별 마진 정책 변경'
});
assert.strictEqual(pendingPolicy.approvalRequired, true, 'HQ approval required for margin override');

service.createBranchProfitPolicy({
  branchId: 'BRANCH-GANGNAM',
  minMarginRate: 0.3,
  scaleMarginRate: 0.4,
  blockThreshold: 0.3,
  hqApproved: true
});
const branchPce = service.runProfitControlEngine({
  estimateId: 'FR-GN-PCE-POLICY',
  branchId: 'BRANCH-GANGNAM',
  revenue: 10000000,
  totalCost: 7300000
});
assert.strictEqual(branchPce.decision, 'BLOCK', 'Branch PCE policy applies');

const fee = service.calculateFranchiseFeeRecord({
  branchId: 'BRANCH-GANGNAM',
  period: '2026-05',
  branchRevenue: 10000000,
  revenuePercent: 0.03
});
assert.strictEqual(fee.feeRecord.calculated_fee, 300000, 'Franchise fee record calculates');

service.runProfitControlEngine({ estimateId: 'FR-RISK-1', branchId: 'BRANCH-GANGNAM', revenue: 10000000, totalCost: 9200000 });
service.runProfitControlEngine({ estimateId: 'FR-RISK-2', branchId: 'BRANCH-GANGNAM', revenue: 10000000, totalCost: 9300000 });
service.runProfitControlEngine({ estimateId: 'FR-RISK-3', branchId: 'BRANCH-GANGNAM', revenue: 10000000, totalCost: 9400000 });
franchiseData = service.getFranchiseCenterData({ branchId: 'BRANCH-GANGNAM' });
assert.ok(franchiseData.riskAlerts.some((alert) => alert.branch_id === 'BRANCH-GANGNAM'), 'Risk alert created for low branch margin or repeated block');

const template = service.createFranchiseReplicationTemplate({
  templateId: 'FRT-SMOKE-001',
  templateName: '신규 지점 복제 템플릿',
  version: '1.0.0'
});
assert.strictEqual(template.template.id, 'FRT-SMOKE-001', 'Replication template can be created');

const appliedTemplate = service.applyReplicationTemplateToBranch({
  branchId: 'BRANCH-GANGNAM',
  templateId: 'FRT-SMOKE-001'
});
assert.ok(appliedTemplate.packageId, 'Replication template can be applied');

const stats = service.getDbStats();
assert.ok(stats.franchiseBranchCount >= 2, 'franchise_branches table has rows');
assert.ok(stats.franchiseDistributionPackageCount >= 1, 'franchise_distribution_packages table has rows');
assert.ok(stats.branchProfitPolicyCount >= 2, 'branch_profit_policies table has rows');
assert.ok(stats.franchiseReplicationTemplateCount >= 1, 'franchise_replication_templates table has rows');

console.log('franchise-replication smoke passed');
