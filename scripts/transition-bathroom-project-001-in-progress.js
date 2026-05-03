const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const executionProjectId = 'EXEC-PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const dayOneReportId = 'DSR-PRJ-PROD-BATH-0001-DAY-001';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS site_operations (
      site_operation_id TEXT PRIMARY KEY,
      execution_project_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      operation_status TEXT NOT NULL,
      progress_rate INTEGER NOT NULL,
      current_process_ko TEXT NOT NULL,
      active_risks_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_site_reports (
      report_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      report_date TEXT NOT NULL,
      work_summary_ko TEXT NOT NULL,
      manpower_json TEXT NOT NULL,
      completed_processes_json TEXT NOT NULL,
      next_tasks_json TEXT NOT NULL,
      issue_json TEXT NOT NULL,
      photo_required INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS material_delivery_checks (
      delivery_check_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      item_name_ko TEXT NOT NULL,
      delivery_status TEXT NOT NULL,
      issue_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inspection_results (
      inspection_result_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      inspection_type TEXT NOT NULL,
      related_process_id TEXT NOT NULL,
      result_status TEXT NOT NULL,
      blocking_processes_json TEXT NOT NULL,
      notes_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_issues (
      site_issue_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      issue_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description_ko TEXT NOT NULL,
      resolution_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS site_risk_logs (
      risk_log_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      risk_type TEXT NOT NULL,
      severity TEXT NOT NULL,
      description_ko TEXT NOT NULL,
      linked_issue_id TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function assertExecutionReady() {
  const execution = db.project.prepare('SELECT execution_status FROM execution_projects WHERE execution_project_id = ?').get(executionProjectId);
  if (!execution || execution.execution_status !== 'EXECUTION_READY') {
    throw new Error('EXECUTION_READY is required before IN_PROGRESS.');
  }
}

function clearExistingSiteState() {
  db.project.prepare('DELETE FROM site_operations WHERE site_operation_id = ?').run(siteOperationId);
  db.project.prepare('DELETE FROM daily_site_reports WHERE site_operation_id = ?').run(siteOperationId);
  db.project.prepare('DELETE FROM material_delivery_checks WHERE site_operation_id = ?').run(siteOperationId);
  db.project.prepare('DELETE FROM inspection_results WHERE site_operation_id = ?').run(siteOperationId);
  db.project.prepare('DELETE FROM site_issues WHERE site_operation_id = ?').run(siteOperationId);
  db.project.prepare('DELETE FROM site_risk_logs WHERE site_operation_id = ?').run(siteOperationId);
}

function activateSiteOperation() {
  const activeRisks = [
    {
      riskType: 'WATERPROOF_INSPECTION_BLOCKING',
      severity: 'HIGH',
      descriptionKo: '철거 후 기존 방수층 실확인 결과 실패 시 타일 이후 공정 차단'
    }
  ];

  db.project.prepare(`
    INSERT INTO site_operations (
      site_operation_id, execution_project_id, project_id, operation_status,
      progress_rate, current_process_ko, active_risks_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    siteOperationId,
    executionProjectId,
    projectId,
    'IN_PROGRESS',
    5,
    'Day 1 철거 / 폐기물 반출 / 방수층 실확인',
    toJson(activeRisks),
    createdAt,
    createdAt
  );

  db.project.prepare(`
    UPDATE execution_projects
    SET execution_status = ?, updated_at = ?
    WHERE execution_project_id = ?
  `).run('IN_PROGRESS', createdAt, executionProjectId);

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'IN_PROGRESS / Day 1 철거 진행',
    toJson(['철거 진행 기록', '폐기물 반출 확인', '기존 방수층 실확인']),
    '5%',
    '방수층 실확인 대기',
    '방수 검수 결과에 따라 타일 착수 승인 판단',
    createdAt,
    projectId
  );
}

function createDayOneReport() {
  db.project.prepare(`
    INSERT INTO daily_site_reports (
      report_id, site_operation_id, project_id, report_date, work_summary_ko,
      manpower_json, completed_processes_json, next_tasks_json, issue_json,
      photo_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dayOneReportId,
    siteOperationId,
    projectId,
    createdAt.slice(0, 10),
    'Day 1: 기존 욕실 철거, 폐기물 반출, 기존 방수층 실확인 예정',
    toJson([{ crewType: 'demolition_team', displayKo: '철거팀', status: 'SCHEDULE_CONFIRMED' }]),
    toJson(['철거 공정 시작 기록', '폐기물 반출 일정 확정']),
    toJson(['기존 방수층 실확인', '방수 보강 필요 여부 판단', '타일 착수 가능 여부 결정']),
    toJson([{ issueType: 'WATERPROOF_STATUS_PENDING', severity: 'HIGH', descriptionKo: '철거 후 방수층 실확인 전 타일 착수 금지' }]),
    1,
    createdAt,
    createdAt
  );
}

function createWasteAndInspectionTasks() {
  db.project.prepare(`
    INSERT INTO material_delivery_checks (
      delivery_check_id, site_operation_id, project_id, item_name_ko,
      delivery_status, issue_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'DELIVERY-WASTE-DAY-001',
    siteOperationId,
    projectId,
    '폐기물 반출',
    'SCHEDULE_CONFIRMED',
    '철거 후 폐기물 반출 기록 필요',
    createdAt
  );

  db.project.prepare(`
    INSERT INTO inspection_results (
      inspection_result_id, site_operation_id, project_id, inspection_type,
      related_process_id, result_status, blocking_processes_json, notes_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'INS-WATERPROOF-DAY-001',
    siteOperationId,
    projectId,
    'WATERPROOF_STATUS_CHECK',
    'waterproofing_decision',
    'PENDING',
    toJson(['tile_installation', 'zendai', 'shower_booth', 'fixture_installation', 'silicone_finish']),
    '방수 검수 실패 시 타일 이후 공정 차단',
    createdAt
  );
}

function createBlockingRisk() {
  db.project.prepare(`
    INSERT INTO site_issues (
      site_issue_id, site_operation_id, project_id, issue_type, severity,
      description_ko, resolution_status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ISSUE-WATERPROOF-BLOCKING-DAY-001',
    siteOperationId,
    projectId,
    'BLOCKING_RULE_READY',
    'HIGH',
    '방수 상태 확인 실패 시 타일/젠다이/샤워부스/도기/실리콘 후속 공정 차단',
    'ACTIVE_MONITORING',
    createdAt,
    createdAt
  );

  db.project.prepare(`
    INSERT INTO site_risk_logs (
      risk_log_id, site_operation_id, project_id, risk_type, severity,
      description_ko, linked_issue_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RISK-WATERPROOF-BLOCKING-DAY-001',
    siteOperationId,
    projectId,
    'WATERPROOF_BLOCKING_RULE',
    'HIGH',
    '기존 방수층 실확인 실패 시 후속 습식/마감 공정 차단 필요',
    'ISSUE-WATERPROOF-BLOCKING-DAY-001',
    createdAt
  );
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-IN-PROGRESS',
    timeLabel,
    'WARNING',
    'IN_PROGRESS 전환 / Day 1 방수층 실확인 Blocking Rule 활성화',
    projectId,
    '현장',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-IN-PROGRESS',
    'TRANSITION_IN_PROGRESS',
    'CEO',
    projectId,
    null,
    toJson({
      siteOperationId,
      dayOneReportId,
      confirmedConditions: [
        '철거 일정 확정',
        '폐기물 반출 일정 확정',
        '현장 작업 가능 시간 확인',
        '관리사무소 협의 완료',
        '철거 후 방수 상태 실확인 예정'
      ]
    }),
    'EXECUTION_READY 조건 충족 후 IN_PROGRESS 전환',
    createdAt
  );
}

migrate();
assertExecutionReady();
clearExistingSiteState();
activateSiteOperation();
createDayOneReport();
createWasteAndInspectionTasks();
createBlockingRisk();
writeLogs();

console.log(JSON.stringify({
  projectId,
  executionProjectId,
  siteOperationId,
  status: 'IN_PROGRESS',
  dayOneReportId,
  blockingRiskCreated: true,
  waterproofInspectionStatus: 'PENDING'
}, null, 2));
