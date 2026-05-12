const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createScheduleAndPurchase } = require('./execution-test-helpers');
const { calculateBathroomEstimate } = require('../electron/services/bathroomEstimateService');

const { service } = createTestService('boc-project-calibration');

function openDb() {
  return new DatabaseSync(service.dbPaths.project);
}

function getEstimate(projectId) {
  const db = openDb();
  const row = db.prepare('SELECT * FROM bathroom_estimates WHERE id = ?').get(projectId);
  const itemCost = db.prepare(`
    SELECT COALESCE(SUM(material_cost), 0) AS material_cost,
           COALESCE(SUM(labor_cost), 0) AS labor_cost,
           COALESCE(SUM(subcontract_cost), 0) AS subcontract_cost
    FROM bathroom_estimate_items
    WHERE estimate_id = ?
  `).get(projectId);
  db.close();
  return { ...row, ...itemCost };
}

function seedActualCosts(projectId, suffix, overrides = {}) {
  const estimate = getEstimate(projectId);
  const now = new Date().toISOString();
  const materialCost = Math.round(Number(overrides.materialCost ?? estimate.material_cost + 400000));
  const laborCost = Math.round(Number(overrides.laborCost ?? estimate.labor_cost + 300000));
  const subcontractCost = Math.round(Number(overrides.subcontractCost ?? estimate.subcontract_cost));
  const totalActualCost = materialCost + laborCost + subcontractCost + Number(overrides.extraCost || 0);
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO project_completion_reports (
      completion_report_id, project_id, site_operation_id, completion_status,
      completion_date, final_scope_ko, customer_feedback_ko, defect_summary_json,
      claim_summary_json, rework_required, case_library_link_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `PCRPT-CAL-${suffix}`,
    projectId,
    `SITE-CAL-${suffix}`,
    'COMPLETED',
    '2026-05-17',
    'calibration smoke final scope',
    'calibration smoke feedback',
    '[]',
    '[]',
    0,
    '{}',
    now,
    now
  );
  db.prepare(`
    INSERT OR REPLACE INTO actual_costs (
      actual_cost_id, completion_report_id, project_id, material_cost, labor_cost,
      subcontract_cost, equipment_cost, waste_cost, transport_cost, total_actual_cost,
      cost_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `ACOST-CAL-${suffix}`,
    `PCRPT-CAL-${suffix}`,
    projectId,
    materialCost,
    laborCost,
    subcontractCost,
    0,
    0,
    0,
    totalActualCost,
    'ACTUAL_COST_BASELINE',
    now,
    now
  );
  db.close();
  return { estimate, totalActualCost };
}

function createClosedProject(suffix) {
  const projectId = `BATH-CAL-${suffix}`;
  service.saveBathroomEstimate({
    estimateId: projectId,
    customerName: 'Calibration Customer',
    siteName: 'Calibration Site',
    bathroomCount: 1,
    bathroomAreaM2: 5,
    ceilingHeightMm: 2200,
    demolitionIncluded: true,
    constructionMethod: 'bond',
    waterproofMethod: 'liquid',
    tileWallType: 'ceramic_300x600',
    tileFloorType: 'porcelain_600',
    fixtureGrade: 'basic',
    options: {
      showerBooth: true,
      zenda: true,
      bathtub: false,
      slidingCabinet: false,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    customerPriceMultiplier: 1.4,
    actor: 'CEO'
  });
  createScheduleAndPurchase(service, projectId);
  seedActualCosts(projectId, suffix);
  service.createProjectClosingSnapshot({ projectId, actor: 'CEO' });
  return projectId;
}

const projectId = createClosedProject('A');
let calibration = service.createProjectCalibrationSnapshot({ projectId, actor: 'CEO' });

assert.ok(calibration.comparison, 'Expected vs actual comparison works');
assert.ok(Number(calibration.comparison.riskScore) >= 0, 'Comparison produces risk score');
assert.ok(calibration.costLeaks.length > 0, 'Cost leak record created');
assert.ok(calibration.calibrationRules.length > 0, 'Calibration rule generated');

const firstRule = calibration.calibrationRules[0];
const approved = service.decideCalibrationRule({ ruleId: firstRule.id, decision: 'APPROVED', actor: 'CEO', reasonKo: 'smoke approve calibration' });
assert.strictEqual(approved.rule.status, 'APPROVED', 'Rule approval works');

const secondRule = calibration.calibrationRules.find((rule) => rule.id !== firstRule.id);
if (secondRule) {
  const rejected = service.decideCalibrationRule({ ruleId: secondRule.id, decision: 'REJECTED', actor: 'CEO', reasonKo: 'smoke reject calibration' });
  assert.strictEqual(rejected.rule.status, 'REJECTED', 'Rule rejection works');
}

const raw = calculateBathroomEstimate({ customerPriceMultiplier: 1.05 });
const preview = service.calculateBathroomEstimatePreview({ estimateId: 'CALIBRATED-NEXT-EST', customerPriceMultiplier: 1.05 });
assert.strictEqual(preview.calibration.applied, true, 'Approved rule affects estimate calculation');
assert.ok(Number(preview.estimate.total_cost) > Number(raw.total_cost), 'Approved rule increases protected cost basis');

const secondProjectId = createClosedProject('B');
service.createProjectCalibrationSnapshot({ projectId: secondProjectId, actor: 'CEO' });
const center = service.getProjectCalibrationCenterData();
assert.ok(center.riskPatterns.length > 0, 'Risk pattern tracked');
assert.ok(center.riskPatterns.some((pattern) => Number(pattern.occurrence_count) >= 2), 'Repeated leak generates recommendation');

const dashboard = service.getDashboardData();
assert.ok(dashboard.calibrationSummary, 'CEO Dashboard calibration summary loads');
assert.ok(Array.isArray(dashboard.calibrationSummary.topCostLeaks), 'CEO Dashboard has cost leak TOP data');

const emptyContext = createTestService('boc-project-calibration-empty');
const empty = emptyContext.service.getProjectCalibrationCenterData();
assert.strictEqual(empty.emptyState, true, 'Empty calibration state renders safely');

const stats = service.getDbStats();
assert.ok(stats.projectCostLeakCount >= 1, 'project_cost_leaks table has rows');
assert.ok(stats.estimateCalibrationRuleCount >= 1, 'estimate_calibration_rules table has rows');
assert.ok(stats.projectRiskPatternCount >= 1, 'project_risk_patterns table has rows');
assert.ok(stats.calibrationApprovalLogCount >= 1, 'calibration_approval_logs table has rows');

console.log('project-calibration smoke passed');
