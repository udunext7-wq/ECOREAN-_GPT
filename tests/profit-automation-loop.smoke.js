const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createSqliteService } = require('../electron/services/sqliteService');

function makeService() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-profit-loop-'));
  const service = createSqliteService({ app: { isPackaged: true, getPath: () => root } });
  return { root, service, projectDb: new DatabaseSync(service.dbPaths.project) };
}

function createLead(service, id, budget, areaM2 = 10) {
  return service.createLead({
    leadId: id,
    customerNameKo: id,
    expectedBudget: budget,
    areaM2,
    locationKo: '서울',
    clientType: 'RESIDENTIAL',
    actor: 'CEO'
  });
}

const { service, projectDb } = makeService();

// 1. Low budget lead -> FAIL -> estimate blocked
const failLead = createLead(service, 'LEAD-LOOP-FAIL', 3000000, 10);
assert.strictEqual(failLead.qualification.decision, 'FAIL');
assert.throws(() => service.saveEstimateDraft({
  minimumInput: { leadId: 'LEAD-LOOP-FAIL', projectType: 'bathroom_remodeling', areaM2: 10 },
  draft: { generatedProcesses: [], conditionalProcesses: [], needsConfirmation: [], documents: [], missingPriceWarnings: [] },
  actor: 'CEO'
}), /Qualification FAIL/);

// 2-5. PCE branching
createLead(service, 'LEAD-LOOP-BLOCK', 20000000, 10);
const block = service.updateLeadStatus({ leadId: 'LEAD-LOOP-BLOCK', nextStatus: 'WON', revenue: 20000000, totalCost: 16000000, actor: 'CEO' });
assert.strictEqual(block.effectiveDecision, 'BLOCK');
assert.strictEqual(Boolean(block.project), false);
createLead(service, 'LEAD-LOOP-BLOCK-2', 20000000, 10);
const blockTwo = service.updateLeadStatus({ leadId: 'LEAD-LOOP-BLOCK-2', nextStatus: 'WON', revenue: 20000000, totalCost: 16000000, actor: 'CEO' });
assert.strictEqual(blockTwo.effectiveDecision, 'BLOCK');

createLead(service, 'LEAD-LOOP-MODIFY', 20000000, 10);
const modify = service.updateLeadStatus({ leadId: 'LEAD-LOOP-MODIFY', nextStatus: 'WON', revenue: 20000000, totalCost: 14600000, actor: 'CEO' });
assert.strictEqual(modify.effectiveDecision, 'MODIFY');
assert.strictEqual(Boolean(modify.project), false);

createLead(service, 'LEAD-LOOP-GO', 20000000, 10);
const go = service.updateLeadStatus({ leadId: 'LEAD-LOOP-GO', nextStatus: 'WON', revenue: 20000000, totalCost: 13600000, actor: 'CEO' });
assert.strictEqual(go.effectiveDecision, 'GO');
assert.strictEqual(Boolean(go.project.projectId), true);

createLead(service, 'LEAD-LOOP-SCALE', 20000000, 10);
const scale = service.updateLeadStatus({ leadId: 'LEAD-LOOP-SCALE', nextStatus: 'WON', revenue: 20000000, totalCost: 12800000, actor: 'CEO' });
assert.strictEqual(scale.effectiveDecision, 'SCALE');
assert.strictEqual(Boolean(scale.project.projectId), true);

// 6. Live margin drops below 25% -> alert + root cause
service.saveActualCostEntry({
  requirementId: 'CCR-PRJ-PROD-BATH-0001-KNOWN-BASELINE',
  amount: 5000000,
  quantity: 1,
  unit: 'PROJECT',
  capturedBy: 'CEO'
});
const liveEvents = projectDb.prepare('SELECT COUNT(*) AS count FROM live_margin_events').get();
const rootCausesAfterMargin = projectDb.prepare('SELECT COUNT(*) AS count FROM cost_leak_root_causes').get();
assert.ok(liveEvents.count >= 1);
assert.ok(rootCausesAfterMargin.count >= 1);

// 7. Repeated root cause -> prevention rule created
projectDb.prepare(`
  INSERT OR REPLACE INTO cost_leak_root_causes (
    root_cause_id, leak_id, project_id, requirement_id, process_id,
    cost_category, item_name_ko, root_cause_type, root_cause_name_ko,
    reason_ko, status, approval_required, case_library_link_json,
    evidence_json, created_at, updated_at, estimate_id, financial_impact, recommended_prevention
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'RCA-SMOKE-ESTIMATE-MISSING-1', 'LEAK-SMOKE-1', 'PRJ-SMOKE-1', 'REQ-1', 'PROC-1',
  'miscellaneous', '기타 잡비', 'estimate_missing', '견적 누락',
  '반복 누락 smoke', 'CANDIDATE', 1, '{}', '{}', new Date().toISOString(), new Date().toISOString(),
  'EST-SMOKE-1', 100000, '필수 체크리스트 추가'
);
service.getProfitGenerationData();
const preventionRules = projectDb.prepare("SELECT COUNT(*) AS count FROM prevention_rules WHERE status = 'ACTIVE'").get();
assert.ok(preventionRules.count >= 1);

// 8. Completed 35%+ project -> profit template auto saved
projectDb.prepare(`
  INSERT INTO profit_templates (
    id, project_type, area_range, cost_structure_json, crew_structure_json,
    duration, margin, created_at, location_ko, estimate_structure_json,
    schedule_structure_json, root_cause_summary_json, prevention_rules_applied_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  'PROFIT-TPL-SMOKE-001', 'bathroom_remodeling', '0-10', '{}', '{}',
  5, 0.36, new Date().toISOString(), '서울', '{}', '{}', '[]', '[]'
);
const templateCount = projectDb.prepare('SELECT COUNT(*) AS count FROM profit_templates WHERE margin >= 0.35').get();
assert.ok(templateCount.count >= 1);

// 9. New estimate -> high-margin template recommended
const draft = service.saveEstimateDraft({
  minimumInput: {
    projectType: 'bathroom_remodeling',
    areaM2: 8,
    bathroomPackage: 'BASIC',
    customerOfferPrice: 10000000
  },
  draft: { generatedProcesses: [], conditionalProcesses: [], needsConfirmation: [], documents: [], missingPriceWarnings: [] },
  actor: 'CEO'
});
const recommendations = projectDb.prepare('SELECT COUNT(*) AS count FROM profit_template_recommendations WHERE estimate_id = ?').get(draft.savedDraft.estimateDraftId);
assert.ok(recommendations.count >= 1);

// 10. Repeated low-margin pattern -> auto block rule created
service.getProfitGenerationData();
const autoBlockRules = projectDb.prepare('SELECT COUNT(*) AS count FROM auto_block_rules').get();
assert.ok(autoBlockRules.count >= 1);

console.log(JSON.stringify({
  ok: true,
  liveMarginEvents: liveEvents.count,
  preventionRules: preventionRules.count,
  templates: templateCount.count,
  recommendations: recommendations.count,
  autoBlockRules: autoBlockRules.count
}, null, 2));
