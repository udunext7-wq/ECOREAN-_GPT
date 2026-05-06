const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-project-profit-closing');

function openDb() {
  return new DatabaseSync(service.dbPaths.project);
}

function createProject(suffix) {
  const estimateId = createGoBathroomEstimate(service, `CLOSING-${suffix}`);
  createScheduleAndPurchase(service, estimateId);
  service.getPaymentCenterData();
  return estimateId;
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

function payAllCustomers(projectId) {
  let center = service.getPaymentCenterData();
  center.customerPayments.filter((payment) => payment.project_id === projectId).forEach((payment) => {
    service.markCustomerPaymentReceived({ paymentId: payment.payment_id, amount: payment.scheduled_amount, actor: 'CEO' });
  });
}

function payAllVendors(projectId) {
  let center = service.getPaymentCenterData();
  center.vendorPayments.filter((payment) => payment.project_id === projectId).forEach((payment) => {
    if (payment.approval_status === 'PENDING_CEO_APPROVAL') {
      const approval = service.requestVendorPaymentApproval({ paymentId: payment.payment_id, actor: 'CEO' });
      service.decideCeoApprovalRequest({ requestId: approval.approvalRequestId, decision: 'APPROVED', actor: 'CEO', reasonKo: 'closing smoke payment approval' });
    }
    service.markVendorPaymentPaid({ paymentId: payment.payment_id, amount: payment.scheduled_amount, actor: 'CEO' });
  });
}

function seedActualCosts(projectId, costOverrides = {}) {
  const estimate = getEstimate(projectId);
  const materialCost = Math.round(Number(costOverrides.materialCost ?? estimate.material_cost ?? 0));
  const laborCost = Math.round(Number(costOverrides.laborCost ?? estimate.labor_cost ?? 0));
  const subcontractCost = Math.round(Number(costOverrides.subcontractCost ?? estimate.subcontract_cost ?? 0));
  const equipmentCost = Math.round(Number(costOverrides.equipmentCost ?? 0));
  const wasteCost = Math.round(Number(costOverrides.wasteCost ?? 0));
  const transportCost = Math.round(Number(costOverrides.transportCost ?? 0));
  const totalActualCost = Math.round(Number(costOverrides.totalActualCost ?? (materialCost + laborCost + subcontractCost + equipmentCost + wasteCost + transportCost)));
  const now = new Date().toISOString();
  const completionDate = costOverrides.completionDate || '2026-05-17';
  const db = openDb();
  db.prepare(`
    INSERT OR REPLACE INTO project_completion_reports (
      completion_report_id, project_id, site_operation_id, completion_status,
      completion_date, final_scope_ko, customer_feedback_ko, defect_summary_json,
      claim_summary_json, rework_required, case_library_link_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    `PCRPT-${projectId}`,
    projectId,
    `SITE-${projectId}`,
    'COMPLETED',
    completionDate,
    'smoke final scope',
    'smoke feedback',
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
    `ACOST-${projectId}`,
    `PCRPT-${projectId}`,
    projectId,
    materialCost,
    laborCost,
    subcontractCost,
    equipmentCost,
    wasteCost,
    transportCost,
    totalActualCost,
    'ACTUAL_COST_BASELINE',
    now,
    now
  );
  db.close();
  return { estimate, totalActualCost, materialCost, laborCost };
}

const unpaidProject = createProject('RECEIVABLE');
seedActualCosts(unpaidProject);
let closing = service.createProjectClosingSnapshot({ projectId: unpaidProject, actor: 'CEO' });
assert.ok(closing.closingSnapshot, 'completed project creates closing snapshot');
assert.strictEqual(closing.closingSnapshot.closing_status, 'BLOCKED_BY_RECEIVABLE', 'unpaid receivable blocks closing');

const payableProject = createProject('PAYABLE');
payAllCustomers(payableProject);
seedActualCosts(payableProject);
closing = service.createProjectClosingSnapshot({ projectId: payableProject, actor: 'CEO' });
assert.strictEqual(closing.closingSnapshot.closing_status, 'BLOCKED_BY_PAYABLE', 'unpaid payable creates blocker');

const defectProject = createProject('DEFECT');
payAllCustomers(defectProject);
payAllVendors(defectProject);
seedActualCosts(defectProject);
{
  const db = openDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO defect_reports (
      defect_id, project_id, site_name_ko, received_at, defect_location_ko,
      defect_type_ko, severity, root_cause_ko, manager_ko, estimated_cost,
      status, completed_at, customer_confirmed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`DEF-${defectProject}`, defectProject, 'defect smoke site', now, 'bathroom', 'leak', 'CRITICAL', 'inspection fail', 'CEO', 300000, 'OPEN', null, 0, now, now);
  db.close();
}
closing = service.createProjectClosingSnapshot({ projectId: defectProject, actor: 'CEO' });
assert.strictEqual(closing.closingSnapshot.closing_status, 'BLOCKED_BY_DEFECT', 'unresolved major defect blocks closing');

const reviewProject = createProject('REVIEW');
payAllCustomers(reviewProject);
payAllVendors(reviewProject);
const reviewEstimate = getEstimate(reviewProject);
seedActualCosts(reviewProject, { totalActualCost: Math.round(Number(reviewEstimate.revenue) * 0.82) });
closing = service.createProjectClosingSnapshot({ projectId: reviewProject, actor: 'CEO' });
assert.strictEqual(closing.closingSnapshot.closing_status, 'CLOSED_REVIEW_REQUIRED', 'actual margin below 25 percent creates review required');

const lossProject = createProject('LOSS');
payAllCustomers(lossProject);
payAllVendors(lossProject);
const lossEstimate = getEstimate(lossProject);
seedActualCosts(lossProject, { totalActualCost: Math.round(Number(lossEstimate.revenue) * 1.1) });
closing = service.createProjectClosingSnapshot({ projectId: lossProject, actor: 'CEO' });
assert.strictEqual(closing.closingSnapshot.closing_status, 'CLOSED_LOSS', 'negative margin creates loss status');

const leakProject = createProject('LEAK');
payAllCustomers(leakProject);
payAllVendors(leakProject);
const leakEstimate = getEstimate(leakProject);
seedActualCosts(leakProject, {
  materialCost: Number(leakEstimate.material_cost || 0) + 200000,
  laborCost: Number(leakEstimate.labor_cost || 0) + 150000,
  subcontractCost: Number(leakEstimate.subcontract_cost || 0)
});
closing = service.createProjectClosingSnapshot({ projectId: leakProject, actor: 'CEO' });
assert.ok(closing.costLeaks.some((leak) => leak.category === 'MATERIAL_COST_OVER'), 'cost leak analysis detects material variance');
assert.ok(closing.costLeaks.some((leak) => leak.category === 'LABOR_COST_OVER'), 'cost leak analysis detects labor variance');
assert.ok(closing.calibrationRules.length > 0, 'repeated or observed cost leak creates calibration rule');

const templateProject = createProject('TEMPLATE');
payAllCustomers(templateProject);
payAllVendors(templateProject);
const templateEstimate = getEstimate(templateProject);
seedActualCosts(templateProject, { totalActualCost: Math.round(Number(templateEstimate.revenue) * 0.55) });
closing = service.createProjectClosingSnapshot({ projectId: templateProject, actor: 'CEO' });
assert.strictEqual(closing.closingSnapshot.closing_status, 'CLOSED_PROFIT', 'high-margin project closes as profit');
assert.ok(closing.templateCandidate, 'high-margin project creates template candidate result');

const center = service.getProjectClosingCenterData({ projectId: leakProject });
assert.ok(center.reports.length > 0, 'closing report is created');
assert.ok(center.calibrationRules.length > 0, 'next estimate calibration rules are available');

const tower = service.getCeoControlTowerData();
assert.ok(tower.decisions.some((item) => item.sourceModule === 'Closing'), 'CEO Control Tower receives closing alerts');

console.log('project-profit-closing smoke passed');
