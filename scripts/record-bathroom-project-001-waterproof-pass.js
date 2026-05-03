const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  approval: new DatabaseSync(path.join(productionDbDir, 'approval.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const approvalId = 'APP-PRJ-PROD-BATH-0001-TILE-START';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.approval.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      approval_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      approval_type TEXT NOT NULL,
      title_ko TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      status TEXT NOT NULL,
      rollback_required INTEGER NOT NULL,
      rollback_status TEXT NOT NULL,
      blocking_impact_ko TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      decided_by TEXT,
      decided_at TEXT,
      decision_reason_ko TEXT
    );
  `);
}

function assertInProgress() {
  const site = db.project.prepare('SELECT operation_status FROM site_operations WHERE site_operation_id = ?').get(siteOperationId);
  if (!site || site.operation_status !== 'IN_PROGRESS') {
    throw new Error('IN_PROGRESS site operation is required before waterproof inspection result.');
  }
}

function recordInspectionPass() {
  const result = {
    result: 'PASS',
    conditionsKo: [
      '기존 방수층 정상',
      '배수구 주변 이상 없음',
      '코너/벽체 하부 이상 없음'
    ],
    failedConditionsKo: [],
    customerExplanationKo: '기존 방수층, 배수구 주변, 코너/벽체 하부 확인 결과 이상이 없어 타일 공정 착수가 가능합니다.',
    nextProcessKo: '타일 시공'
  };

  db.project.prepare(`
    UPDATE inspection_results
    SET result_status = ?, blocking_processes_json = ?, notes_ko = ?, created_at = ?
    WHERE site_operation_id = ? AND inspection_type = 'WATERPROOF_STATUS_CHECK'
  `).run(
    'PASS',
    toJson([]),
    result.customerExplanationKo,
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    UPDATE site_issues
    SET resolution_status = ?, description_ko = ?, updated_at = ?
    WHERE site_operation_id = ? AND issue_type = 'BLOCKING_RULE_READY'
  `).run(
    'RESOLVED',
    '방수 상태 확인 PASS로 후속 공정 차단 해제',
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    INSERT INTO site_risk_logs (
      risk_log_id, site_operation_id, project_id, risk_type, severity,
      description_ko, linked_issue_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RISK-WATERPROOF-PASS-RELEASED-DAY-001',
    siteOperationId,
    projectId,
    'WATERPROOF_BLOCKING_RELEASED',
    'LOW',
    '방수 상태 확인 PASS. 타일 착수 가능.',
    'ISSUE-WATERPROOF-BLOCKING-DAY-001',
    createdAt
  );

  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    '방수 상태 확인 PASS / 타일 착수 준비',
    toJson([{ riskType: 'TILE_START_SPEC_CONFIRMATION', severity: 'MEDIUM', descriptionKo: '타일 착수 전 자재/부자재/시공팀 일정 확인 필요' }]),
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    '방수 PASS / 타일 착수 승인 대기',
    toJson(['타일 착수 승인', '600각 폴리싱 타일 자재 확인', '타일공 일정 확정']),
    '방수 Blocking 해제',
    '타일 착수 승인 후 타일 시공 진행',
    createdAt,
    projectId
  );

  return result;
}

function createTileStartApproval() {
  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId,
    projectId,
    'TileStartApproval',
    '타일 착수 승인',
    '방수 상태 확인 PASS. 기존 방수층, 배수구 주변, 코너/벽체 하부 이상 없음.',
    'PENDING_CEO_APPROVAL',
    0,
    'NOT_REQUIRED',
    '승인 전 타일 착수 보류',
    'BOC',
    createdAt,
    createdAt
  );
}

function updateDailyReport() {
  const row = db.project.prepare('SELECT issue_json, next_tasks_json FROM daily_site_reports WHERE site_operation_id = ?').get(siteOperationId);
  if (!row) return;
  db.project.prepare(`
    UPDATE daily_site_reports
    SET next_tasks_json = ?, issue_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    toJson(['타일 착수 승인', '타일 자재/부자재 확인', '타일 시공']),
    toJson([{ issueType: 'WATERPROOF_PASS', severity: 'LOW', descriptionKo: '방수 상태 확인 PASS. 후속 공정 진행 가능.' }]),
    createdAt,
    siteOperationId
  );
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-WATERPROOF-PASS',
    timeLabel,
    'INFO',
    '방수 상태 확인 PASS / Blocking 해제 / 타일 착수 승인 생성',
    projectId,
    '승인',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-WATERPROOF-PASS',
    'RECORD_WATERPROOF_INSPECTION_PASS',
    'CEO',
    projectId,
    approvalId,
    toJson({ result: 'PASS', blockingReleased: true, changeOrderRequired: false, nextProcess: 'tile_installation' }),
    '방수 상태 확인 PASS 입력',
    createdAt
  );
}

migrate();
assertInProgress();
const result = recordInspectionPass();
createTileStartApproval();
updateDailyReport();
writeLogs();

console.log(JSON.stringify({
  projectId,
  waterproofInspectionResult: 'PASS',
  blockingReleased: true,
  changeOrderRequired: false,
  customerExplanationRequired: false,
  nextProcessKo: result.nextProcessKo,
  tileStartApprovalId: approvalId
}, null, 2));
