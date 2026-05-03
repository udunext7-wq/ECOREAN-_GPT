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
const executionProjectId = 'EXEC-PRJ-PROD-BATH-0001';
const approvalId = 'APP-PRJ-PROD-BATH-0001-SHOWER-BOOTH';
const dayFourReportId = 'DSR-PRJ-PROD-BATH-0001-DAY-004';
const inspectionId = 'INS-SHOWER-BOOTH-PASS-DAY-004';
const createdAt = new Date().toISOString();
const reportDate = createdAt.slice(0, 10);
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

const inspectionItems = [
  '유리 수직 상태',
  '문 개폐 상태',
  '하부 누수 여부',
  '실리콘 접합부 상태',
  '하드웨어 고정 상태',
  '유리 파손 여부'
].map((itemNameKo) => ({ itemNameKo, resultStatus: 'PASS', noteKo: '이상 없음' }));

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS shower_booth_installation_records (
      shower_booth_installation_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      installation_items_json TEXT NOT NULL,
      inspection_items_json TEXT NOT NULL,
      installation_status TEXT NOT NULL,
      leak_detected INTEGER NOT NULL,
      red_alert INTEGER NOT NULL,
      rework_required INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

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

function assertFixtureInspectionPass() {
  const row = db.project.prepare(`
    SELECT result_status
    FROM inspection_results
    WHERE project_id = ? AND inspection_type = 'FIXTURE_INSTALLATION_INSPECTION'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(projectId);
  if (!row || row.result_status !== 'PASS') {
    throw new Error('Fixture installation inspection PASS is required before shower booth installation.');
  }
}

function approveShowerBooth() {
  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at, decided_by, decided_at, decision_reason_ko
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId,
    projectId,
    'ShowerBoothInstallationApproval',
    '샤워부스 설치 승인 및 검수',
    '도기 설치 후 검수 PASS. 샤워부스 설치 및 검수 전체 PASS.',
    'APPROVED',
    0,
    'NOT_REQUIRED',
    '샤워부스 설치 완료, 후속 돔천장/환풍기 진행 가능',
    'BOC',
    createdAt,
    createdAt,
    'CEO',
    createdAt,
    '대표 승인'
  );
}

function recordInstallationAndInspection() {
  db.project.prepare('DELETE FROM shower_booth_installation_records WHERE shower_booth_installation_id = ?')
    .run('SHOWER-BOOTH-INSTALL-PRJ-PROD-BATH-0001');

  db.project.prepare(`
    INSERT INTO shower_booth_installation_records (
      shower_booth_installation_id, site_operation_id, project_id,
      installation_items_json, inspection_items_json, installation_status,
      leak_detected, red_alert, rework_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'SHOWER-BOOTH-INSTALL-PRJ-PROD-BATH-0001',
    siteOperationId,
    projectId,
    toJson(['강화유리 설치', '하드웨어 설치', '문 개폐 테스트', '실리콘 접합부 마감']),
    toJson(inspectionItems),
    'INSPECTION_PASS',
    0,
    0,
    0,
    createdAt,
    createdAt
  );

  db.project.prepare(`
    INSERT INTO inspection_results (
      inspection_result_id, site_operation_id, project_id, inspection_type,
      related_process_id, result_status, blocking_processes_json, notes_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    inspectionId,
    siteOperationId,
    projectId,
    'SHOWER_BOOTH_INSPECTION',
    'shower_booth',
    'PASS',
    toJson([]),
    '샤워부스 검수 전체 PASS. 하부 누수 없음, 문 개폐 정상, 유리 파손 없음, 재시공 필요 없음.',
    createdAt
  );

  db.project.prepare(`
    INSERT OR REPLACE INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CHECK-SHOWER-BOOTH-PRJ-PROD-BATH-0001',
    executionProjectId,
    projectId,
    'SHOWER_BOOTH_INSPECTION',
    toJson({
      inspectionItems,
      overallResult: 'PASS',
      leakDetected: false,
      redAlert: false,
      reworkRequired: false,
      nextAllowedProcessKo: '돔천장/환풍기'
    }),
    'PASS',
    createdAt
  );
}

function createDayFourReport() {
  db.project.prepare('DELETE FROM daily_site_reports WHERE report_id = ?').run(dayFourReportId);
  db.project.prepare(`
    INSERT INTO daily_site_reports (
      report_id, site_operation_id, project_id, report_date, work_summary_ko,
      manpower_json, completed_processes_json, next_tasks_json, issue_json,
      photo_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dayFourReportId,
    siteOperationId,
    projectId,
    reportDate,
    'Day 4: 샤워부스 강화유리/하드웨어 설치 및 검수 PASS',
    toJson([{ crewType: 'shower_booth_team', displayKo: '샤워부스 설치팀', status: 'WORK_COMPLETED' }]),
    toJson(['강화유리 설치', '하드웨어 설치', '문 개폐 테스트', '실리콘 접합부 마감', '샤워부스 검수 PASS']),
    toJson(['돔천장 설치', '환풍기 설치', '실리콘 최종 마감 준비']),
    toJson([]),
    1,
    createdAt,
    createdAt
  );
}

function updateDashboardAndRisk() {
  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    '샤워부스 검수 PASS / 돔천장·환풍기 준비',
    toJson([
      {
        riskType: 'CEILING_VENTILATOR_INSTALLATION_CHECK',
        severity: 'MEDIUM',
        descriptionKo: '돔천장/환풍기 설치 후 작동 및 마감 검수 필요'
      }
    ]),
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    '샤워부스 검수 PASS / 돔천장·환풍기 준비',
    toJson(['돔천장 설치', '환풍기 설치', '실리콘 최종 마감 준비']),
    '58%',
    '돔천장/환풍기 작동 및 마감 검수 필요',
    '돔천장/환풍기 공정',
    createdAt,
    projectId
  );
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-SHOWER-BOOTH-PASS',
    timeLabel,
    'INFO',
    '샤워부스 설치 및 검수 PASS / 돔천장·환풍기 진행 가능',
    projectId,
    '검수',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-SHOWER-BOOTH-PASS',
    'APPROVE_AND_RECORD_SHOWER_BOOTH_PASS',
    'CEO',
    projectId,
    approvalId,
    toJson({
      result: 'PASS',
      leakDetected: false,
      redAlert: false,
      reworkRequired: false,
      nextProcess: 'ceiling_and_ventilator'
    }),
    '샤워부스 설치 승인 및 검수 PASS 처리',
    createdAt
  );
}

migrate();
assertFixtureInspectionPass();
approveShowerBooth();
recordInstallationAndInspection();
createDayFourReport();
updateDashboardAndRisk();
writeLogs();

console.log(JSON.stringify({
  projectId,
  approvalId,
  showerBoothInspectionResult: 'PASS',
  leakDetected: false,
  redAlert: false,
  reworkRequired: false,
  dayFourReportId,
  nextProcessKo: '돔천장/환풍기'
}, null, 2));
