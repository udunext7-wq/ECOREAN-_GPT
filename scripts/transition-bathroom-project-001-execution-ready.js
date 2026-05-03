const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const finalEstimateId = 'FINAL-EST-PRJ-PROD-BATH-0001';
const executionProjectId = 'EXEC-PRJ-PROD-BATH-0001';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS execution_projects (
      execution_project_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      final_estimate_id TEXT NOT NULL,
      execution_status TEXT NOT NULL,
      preliminary_execution_warning INTEGER NOT NULL,
      warning_reasons_json TEXT NOT NULL,
      created_from_approval_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS execution_documents (
      execution_document_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      document_type TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      document_status TEXT NOT NULL,
      warning_json TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_report_templates (
      template_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      template_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspection_checklists (
      checklist_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      checklist_type TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_drafts (
      schedule_item_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      process_name_ko TEXT NOT NULL,
      start_rule_ko TEXT NOT NULL,
      dependency_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_milestones (
      milestone_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      milestone_name_ko TEXT NOT NULL,
      amount_text TEXT NOT NULL,
      trigger_condition_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      purchase_order_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      item_name_ko TEXT NOT NULL,
      order_status TEXT NOT NULL,
      warning_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function assertReady() {
  const finalEstimate = db.project.prepare('SELECT final_status FROM final_estimates WHERE final_estimate_id = ?').get(finalEstimateId);
  if (!finalEstimate || finalEstimate.final_status !== 'FINAL_ESTIMATE') {
    throw new Error('FINAL_ESTIMATE is required before EXECUTION_READY.');
  }
}

function clearExistingExecution() {
  db.project.prepare('DELETE FROM execution_projects WHERE execution_project_id = ?').run(executionProjectId);
  db.project.prepare('DELETE FROM execution_documents WHERE execution_project_id = ?').run(executionProjectId);
  db.project.prepare('DELETE FROM site_report_templates WHERE execution_project_id = ?').run(executionProjectId);
  db.project.prepare('DELETE FROM inspection_checklists WHERE execution_project_id = ?').run(executionProjectId);
  db.project.prepare('DELETE FROM schedule_drafts WHERE project_id = ?').run(projectId);
  db.project.prepare('DELETE FROM purchase_orders WHERE execution_project_id = ? OR execution_project_id = ?').run(executionProjectId, 'PENDING_EXECUTION_READY');
  db.project.prepare('DELETE FROM payment_milestones WHERE execution_project_id = ? OR execution_project_id = ?').run(executionProjectId, 'PENDING_EXECUTION_READY');
}

function createExecutionProject() {
  db.project.prepare(`
    INSERT INTO execution_projects (
      execution_project_id, project_id, final_estimate_id, execution_status,
      preliminary_execution_warning, warning_reasons_json, created_from_approval_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    executionProjectId,
    projectId,
    finalEstimateId,
    'EXECUTION_READY',
    1,
    toJson(['발주 전 모델/수량/납기 확인 필요', '현장 착수 전 작업 가능일 및 관리 규정 확인 필요']),
    'APP-PRJ-PROD-BATH-0001-FINAL',
    createdAt,
    createdAt
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        receivable_amount = ?, receivable_status_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'EXECUTION_READY / 현장 착수 준비',
    toJson(['발주 사양 최종 확인', '공정 착수일 확정', 'Site Operation IN_PROGRESS 전환']),
    '실행 준비',
    '계약금 1,647,000원 입금 확인',
    '계약금 입금 완료 / 중도금 2,196,000원 예정',
    'IN_PROGRESS 전환 조건 확인',
    createdAt,
    projectId
  );
}

function createPaymentPlan() {
  const insert = db.project.prepare(`
    INSERT INTO payment_milestones (
      milestone_id, execution_project_id, project_id, milestone_name_ko,
      amount_text, trigger_condition_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['PAY-EXEC-CONTRACT', '계약금', '1,647,000원', '계약 체결 및 입금 확인', 'PAID_CONFIRMED'],
    ['PAY-EXEC-PROGRESS', '중도금', '2,196,000원', '철거 완료 및 주요 자재 발주 전', 'PLANNED'],
    ['PAY-EXEC-FINAL', '잔금', '1,647,000원', '준공검수 및 고객 인도 시', 'PLANNED']
  ].forEach(([id, name, amount, trigger, status]) => {
    insert.run(id, executionProjectId, projectId, name, amount, trigger, status, createdAt);
  });
}

function createPurchaseOrders() {
  const insert = db.project.prepare(`
    INSERT INTO purchase_orders (
      purchase_order_id, execution_project_id, project_id, item_name_ko,
      order_status, warning_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [
    '아메리칸스탠다드 기본형 도기 패키지',
    '600각 폴리싱 타일',
    '타일 부자재',
    '샤워부스 유리/하드웨어',
    '젠다이 대리석 마감재',
    '돔천장',
    '환풍기',
    '실리콘/마감 부자재',
    '폐기물 반출'
  ].forEach((item, index) => {
    insert.run(
      `PO-EXEC-${String(index + 1).padStart(2, '0')}`,
      executionProjectId,
      projectId,
      item,
      'READY_TO_ORDER_AFTER_SPEC_CONFIRMATION',
      toJson(['발주 전 모델/규격/수량/납기 확인 필요']),
      createdAt
    );
  });
}

function createSchedule() {
  const insert = db.project.prepare(`
    INSERT INTO schedule_drafts (
      schedule_item_id, project_id, process_name_ko, start_rule_ko,
      dependency_ko, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['철거', '계약금 입금 및 착수일 확정 후', '없음'],
    ['폐기물 반출', '철거 직후', '철거'],
    ['방수 상태 확인', '철거/폐기물 반출 후', '폐기물 반출'],
    ['필요 부위 방수 보강', '방수 상태 확인 후 필요 시', '방수 상태 확인'],
    ['타일 시공', '방수 보강 또는 상태 확인 완료 후', '방수 상태 확인/보강'],
    ['젠다이', '타일 기준선 및 설비 위치 확인 후', '타일 시공'],
    ['샤워부스', '타일/젠다이 완료 후', '타일 시공, 젠다이'],
    ['도기 설치', '타일 양생 및 샤워부스 사전 확인 후', '타일 시공'],
    ['돔천장', '상부 설비/환풍기 위치 확인 후', '도기 설치 전후 조율'],
    ['환풍기', '돔천장 공정과 연계', '돔천장'],
    ['실리콘 마감', '도기/샤워부스/타일 마감 후', '샤워부스, 도기 설치'],
    ['준공청소', '실리콘 마감 후', '실리콘 마감'],
    ['고객 인도', '준공청소 및 검수 완료 후', '준공청소']
  ].forEach(([process, startRule, dependency], index) => {
    insert.run(`SCH-EXEC-${String(index + 1).padStart(2, '0')}`, projectId, process, startRule, dependency, 'CONFIRMED_DRAFT', createdAt);
  });
}

function createExecutionDocuments() {
  const insert = db.project.prepare(`
    INSERT INTO execution_documents (
      execution_document_id, execution_project_id, project_id, document_type,
      display_name_ko, document_status, warning_json, payload_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['CONTRACT_PAYMENT_PLAN', 'contract_payment_plan', '계약/수금 계획 확정본'],
    ['PURCHASE_ORDER_DRAFT', 'purchase_order_draft', '발주서 준비본'],
    ['SCHEDULE_FINAL', 'schedule_final', '공정표 확정본'],
    ['DAILY_REPORT_TEMPLATE', 'daily_report_template', '공사일보 템플릿'],
    ['INSPECTION_CHECKLIST', 'inspection_checklist', '검수 체크리스트'],
    ['HANDOVER_CHECKLIST', 'handover_checklist', '고객 인도 체크리스트'],
    ['CASHFLOW_STATEMENT', 'cashflow_statement', '현금흐름표']
  ].forEach(([id, type, name]) => {
    insert.run(
      `EXDOC-${id}`,
      executionProjectId,
      projectId,
      type,
      name,
      'EXECUTION_READY',
      toJson(['실행 전 최종 현장 조건 확인 필요']),
      toJson({ projectId, executionProjectId, status: 'EXECUTION_READY' }),
      createdAt
    );
  });
}

function createSiteTemplatesAndInspection() {
  db.project.prepare(`
    INSERT INTO site_report_templates (
      template_id, execution_project_id, project_id, template_json, created_at
    ) VALUES (?, ?, ?, ?, ?)
  `).run(
    'SITE-TEMPLATE-PRJ-PROD-BATH-0001',
    executionProjectId,
    projectId,
    toJson({
      requiredFieldsKo: ['작업일', '투입 인원', '진행 공정', '자재 입고', '이슈', '사진 기록', '다음 작업']
    }),
    createdAt
  );

  const insertChecklist = db.project.prepare(`
    INSERT INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['INS-WATERPROOF', 'waterproof_state_check', ['기존 방수층 상태 확인', '코너/배수구 확인', '보강 필요 여부 기록']],
    ['INS-TILE', 'tile_check', ['타일 평활도', '줄눈 상태', '파손/들뜸 여부']],
    ['INS-FINAL', 'final_handover', ['누수 확인', '실리콘 마감', '환풍기 작동', '고객 인도 서명']]
  ].forEach(([id, type, items]) => {
    insertChecklist.run(id, executionProjectId, projectId, type, toJson({ itemsKo: items }), 'READY', createdAt);
  });
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-EXECUTION-READY',
    timeLabel,
    'INFO',
    'EXECUTION_READY 전환 완료 / Site Operation 진입 가능',
    projectId,
    '실행',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-EXECUTION-READY',
    'TRANSITION_EXECUTION_READY',
    'CEO',
    projectId,
    'APP-PRJ-PROD-BATH-0001-FINAL',
    toJson({ executionProjectId, contractDepositPaid: true, finalEstimateId }),
    '계약금 입금 확인 후 EXECUTION_READY 전환',
    createdAt
  );
}

migrate();
assertReady();
clearExistingExecution();
createExecutionProject();
createPaymentPlan();
createPurchaseOrders();
createSchedule();
createExecutionDocuments();
createSiteTemplatesAndInspection();
writeLogs();

console.log(JSON.stringify({
  projectId,
  executionProjectId,
  status: 'EXECUTION_READY',
  contractDepositPaid: true,
  purchaseStatus: 'READY_TO_ORDER_AFTER_SPEC_CONFIRMATION',
  siteOperationEntryAvailable: true
}, null, 2));
