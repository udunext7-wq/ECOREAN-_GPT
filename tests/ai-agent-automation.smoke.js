const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-ai-agent-automation');
const estimateId = createGoBathroomEstimate(service, 'AI-AUTO');
createScheduleAndPurchase(service, estimateId);

service.runProfitControlEngine({
  estimateId: 'AI-PCE-BLOCK',
  revenue: 1000000,
  totalCost: 900000,
  vendorRisk: 0,
  laborVariance: 0,
  scheduleRisk: 0,
  defectRisk: 0
});

function openProjectDb() {
  return new DatabaseSync(service.dbPaths.project);
}

function openMasterDb() {
  return new DatabaseSync(service.dbPaths.master);
}

const now = new Date().toISOString();
const projectDb = openProjectDb();
projectDb.prepare(`
  INSERT INTO customer_payments (
    payment_id, contract_id, estimate_id, project_id, customer_name, site_name,
    payment_type, due_date, scheduled_amount, actual_received_date,
    actual_received_amount, payment_status, notes_ko, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('PAY-AI-OVERDUE', 'CON-AI', estimateId, estimateId, 'AI 고객', 'AI 현장', '계약금', '2026-05-01', 1500000, null, 0, 'SCHEDULED', 'AI overdue smoke', now, now);
projectDb.prepare(`
  INSERT INTO material_receiving_logs (
    receiving_log_id, project_id, purchase_order_id, item_name_ko, specification_ko,
    ordered_quantity, received_quantity, missing_quantity, unit, received_at,
    supplier_name_ko, inspection_status, damage_or_missing, notes_ko, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('RECV-AI-SHORTAGE', estimateId, 'PO-AI', '타일', '600x600', 10, 6, 4, 'BOX', '2026-05-16', 'AI 공급처', 'SHORTAGE', 1, '입고 부족', now);
projectDb.prepare(`
  INSERT INTO inspection_checklist_items (
    item_id, checklist_id, project_id, process_name_ko, check_item_ko, criterion_ko,
    result_status, critical_flag, photo_status, action_required_ko,
    inspector_ko, inspected_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('INSP-AI-FAIL', 'CHK-AI', estimateId, '방수', '담수 테스트', '누수 없음', 'FAIL', 1, 'PHOTO_REQUIRED', '재검수 필요', '팀장', now, now);
projectDb.prepare(`
  INSERT INTO defect_reports (
    defect_id, project_id, site_name_ko, received_at, defect_location_ko,
    defect_type_ko, severity, root_cause_ko, manager_ko, estimated_cost,
    status, completed_at, customer_confirmed, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('DEF-AI-001', estimateId, 'AI 현장', '2026-05-16', '욕실 바닥', '누수', 'HIGH', '방수 보완 필요', '팀장', 250000, 'OPEN', null, 0, now, now);
projectDb.prepare(`
  INSERT INTO project_cost_leaks (
    id, project_id, category, category_ko, expected_amount, actual_amount,
    variance_amount, variance_rate, root_cause, prevention_rule, severity,
    risk_score, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('LEAK-AI-001', estimateId, 'LABOR_COST_OVER', '노무 증가', 500000, 680000, 180000, 0.36, '품수 과소', '타일 노무비 보정', 'HIGH', 90, now);
projectDb.close();

const masterDb = openMasterDb();
masterDb.prepare(`
  INSERT INTO vendor_price_alerts (
    id, alert_type, material_name, vendor_name, severity, previous_price,
    current_price, variance_rate, reason, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('VPA-AI-001', 'PRICE_INCREASE', '600각 포세린', 'AI 타일상사', 'HIGH', 30000, 39000, 0.3, '단가 급등', 'OPEN', now);
masterDb.prepare(`
  INSERT INTO vendor_reliability_scores (
    id, vendor_id, vendor_name, on_time_rate, shortage_count, defect_count,
    price_variance_rate, payment_issue_count, repeat_usage_count, manual_rating,
    vendor_score, reliability_level, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('VRS-AI-001', 'VENDOR-AI', 'AI 타일상사', 0.6, 3, 1, 0.3, 0, 4, 60, 48, '위험', now);
masterDb.prepare(`
  INSERT INTO franchise_risk_alerts (
    id, branch_id, alert_type, severity, title, description, status, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).run('FRA-AI-001', 'HEADQUARTERS', 'LOW_MARGIN_PATTERN', 'ORANGE', '지점 저마진 패턴', '본사 기준 마진 미달 패턴 검토 필요', 'OPEN', now);
masterDb.close();

const run = service.runAIAgentAutomation({ actor: 'CEO' });
assert.ok(run.taskCount >= 8, 'AI agents create tasks');

const data = service.getAIAutomationCenterData({ runAgents: false });
assert.ok(data.agents.length >= 8, 'AI Automation Center loads');
assert.ok(data.tasks.some((task) => task.agent_type === 'PROFIT_DEFENSE'), 'Profit Defense Agent creates task');
assert.ok(data.tasks.some((task) => task.agent_type === 'CASHFLOW_RISK'), 'Cashflow Risk Agent creates alert');
assert.ok(data.tasks.some((task) => task.agent_type === 'SCHEDULE_DELAY'), 'Schedule Delay Agent creates draft');
assert.ok(data.tasks.some((task) => task.agent_type === 'VENDOR_RISK'), 'Vendor Risk Agent creates recommendation');
assert.ok(data.tasks.some((task) => task.agent_type === 'DEFECT_PREVENTION'), 'Defect Prevention Agent creates prevention task');
assert.ok(data.tasks.some((task) => task.agent_type === 'ESTIMATE_CALIBRATION'), 'Estimate Calibration Agent creates calibration draft');
assert.ok(data.tasks.some((task) => task.agent_type === 'CLIENT_COMMUNICATION'), 'Client Communication Agent creates draft only');
assert.ok(data.tasks.some((task) => task.agent_type === 'FRANCHISE_MONITORING'), 'Franchise Monitoring Agent creates HQ alert');
assert.ok(data.preventionRules.length >= 1, 'AI prevention rule is stored');
assert.ok(data.learningLogs.length >= 1, 'AI learning log stores result');

const communication = service.getCommunicationCenterData();
assert.ok(communication.messages.some((message) => message.status === 'DRAFT' || message.status === 'READY'), 'Communication draft is created without auto-send');

const pending = data.tasks.find((task) => task.status === 'PENDING');
assert.ok(pending, 'Pending AI task exists');
const approved = service.decideAIAgentTask({ taskId: pending.id, decision: 'APPROVED', actor: 'CEO', reasonKo: 'smoke approve AI task' });
assert.ok(approved.aiAutomationData.tasks.some((task) => task.id === pending.id && task.status === 'APPROVED'), 'Human approval updates task status');

const empty = createTestService('boc-ai-agent-empty').service.getAIAutomationCenterData({ runAgents: false });
assert.ok(Array.isArray(empty.tasks), 'Empty AI queue renders safely');
assert.strictEqual(empty.tasks.length, 0, 'Empty AI queue has no tasks');

const stats = service.getDbStats();
assert.ok(stats.aiAgentCount >= 8, 'ai_agents table has rows');
assert.ok(stats.aiTaskQueueCount >= 8, 'ai_task_queue table has rows');
assert.ok(stats.aiLearningLogCount >= 1, 'ai_learning_logs table has rows');
assert.ok(stats.aiPreventionRuleCount >= 1, 'ai_prevention_rules table has rows');

console.log('ai-agent-automation smoke passed');
