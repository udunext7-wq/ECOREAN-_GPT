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
const approvalId = 'APP-PRJ-PROD-BATH-0001-FIXTURE-INSTALL';
const dayThreeReportId = 'DSR-PRJ-PROD-BATH-0001-DAY-003';
const createdAt = new Date().toISOString();
const reportDate = createdAt.slice(0, 10);
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);
const fromJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const fixturePackage = {
  brandName: 'American Standard',
  displayBrandNameKo: '아메리칸스탠다드',
  packageGrade: 'basic',
  displayPackageGradeKo: '기본형 패키지',
  itemsKo: ['양변기', '세면대', '세면수전', '샤워수전', '샤워기'],
  priceStatus: 'NEEDS_RESEARCH'
};

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS fixture_installation_records (
      fixture_installation_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      brand_name TEXT NOT NULL,
      package_grade TEXT NOT NULL,
      installed_items_json TEXT NOT NULL,
      missing_items_json TEXT NOT NULL,
      installation_status TEXT NOT NULL,
      inspection_points_json TEXT NOT NULL,
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

function assertTileWarningNoFail() {
  const inspection = db.project.prepare(`
    SELECT result_status
    FROM inspection_results
    WHERE inspection_result_id = ?
  `).get('INS-TILE-MID-DAY-002');

  if (!inspection) throw new Error('TILE_MID_INSPECTION does not exist.');
  if (!['PENDING_ITEM_RESULTS', 'WARNING'].includes(inspection.result_status)) {
    throw new Error(`Unexpected TILE_MID_INSPECTION status: ${inspection.result_status}`);
  }
}

function updateTileInspectionWarning() {
  const row = db.project.prepare(`
    SELECT checklist_json
    FROM inspection_checklists
    WHERE checklist_id = ?
  `).get('CHECK-TILE-MID-PRJ-PROD-BATH-0001');

  const payload = fromJson(row?.checklist_json, {});
  const checklist = (payload.checklist || []).map((item) => {
    if (item.itemId === 'grout_spacing') {
      return { ...item, resultStatus: 'WARNING', resultNoteKo: '줄눈 간격 일부 불균일, 보완 진행' };
    }
    if (item.itemId === 'corner_finish') {
      return { ...item, resultStatus: 'WARNING', resultNoteKo: '코너 마감 보완 필요, 보완 진행' };
    }
    return { ...item, resultStatus: 'PASS', resultNoteKo: '이상 없음' };
  });

  const updatedPayload = {
    ...payload,
    checklist,
    overallResult: 'WARNING',
    failExists: false,
    redAlertExists: false,
    correctionActionsKo: ['줄눈 간격 보완', '코너 마감 보완'],
    nextAllowedProcessKo: '도기 설치'
  };

  db.project.prepare(`
    UPDATE inspection_checklists
    SET checklist_json = ?, status = ?
    WHERE checklist_id = ?
  `).run(toJson(updatedPayload), 'WARNING_NO_FAIL', 'CHECK-TILE-MID-PRJ-PROD-BATH-0001');

  db.project.prepare(`
    UPDATE inspection_results
    SET result_status = ?, blocking_processes_json = ?, notes_ko = ?, created_at = ?
    WHERE inspection_result_id = ?
  `).run(
    'WARNING',
    toJson([]),
    'FAIL 없음, RED ALERT 없음. 줄눈 간격 일부 불균일과 코너 마감 보완 진행 조건으로 도기 설치 가능.',
    createdAt,
    'INS-TILE-MID-DAY-002'
  );
}

function approveFixtureInstallation() {
  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at, decided_by, decided_at, decision_reason_ko
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId,
    projectId,
    'FixtureInstallationApproval',
    '도기 설치 승인',
    'TILE_MID_INSPECTION WARNING, FAIL 없음, RED ALERT 없음. 줄눈/코너 마감 보완 진행 조건으로 도기 설치 승인.',
    'APPROVED',
    0,
    'NOT_REQUIRED',
    '도기 설치 진행 가능',
    'BOC',
    createdAt,
    createdAt,
    'CEO',
    createdAt,
    '대표 승인'
  );
}

function createFixtureInstallationRecord() {
  db.project.prepare('DELETE FROM fixture_installation_records WHERE fixture_installation_id = ?')
    .run('FIXTURE-INSTALL-PRJ-PROD-BATH-0001');

  db.project.prepare(`
    INSERT INTO fixture_installation_records (
      fixture_installation_id, site_operation_id, project_id, brand_name,
      package_grade, installed_items_json, missing_items_json, installation_status,
      inspection_points_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'FIXTURE-INSTALL-PRJ-PROD-BATH-0001',
    siteOperationId,
    projectId,
    fixturePackage.brandName,
    fixturePackage.packageGrade,
    toJson(fixturePackage.itemsKo),
    toJson([]),
    'APPROVED_READY_TO_INSTALL',
    toJson([
      '양변기 수평 및 흔들림',
      '세면대 고정 상태',
      '세면수전 누수 여부',
      '샤워수전 냉온수 방향 및 누수',
      '샤워기 작동',
      '배수 상태',
      '실리콘 마감 전 접합부 확인'
    ]),
    createdAt,
    createdAt
  );
}

function createDayThreeReportAndChecklist() {
  db.project.prepare('DELETE FROM daily_site_reports WHERE report_id = ?').run(dayThreeReportId);
  db.project.prepare(`
    INSERT INTO daily_site_reports (
      report_id, site_operation_id, project_id, report_date, work_summary_ko,
      manpower_json, completed_processes_json, next_tasks_json, issue_json,
      photo_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dayThreeReportId,
    siteOperationId,
    projectId,
    reportDate,
    'Day 3: 타일 중간 검수 WARNING 보완 진행, 아메리칸스탠다드 기본형 도기 설치 승인',
    toJson([{ crewType: 'fixture_install_team', displayKo: '도기 설치팀', status: 'APPROVED_READY_TO_INSTALL' }]),
    toJson(['타일 중간 검수 WARNING 판정', '줄눈/코너 보완 진행', '도기 설치 승인']),
    toJson(['양변기 설치', '세면대 설치', '세면수전 설치', '샤워수전 설치', '샤워기 설치', '도기 설치 후 검수']),
    toJson([{ issueType: 'TILE_WARNING_CORRECTION', severity: 'LOW', descriptionKo: '줄눈/코너 보완 진행 중, FAIL 없음' }]),
    1,
    createdAt,
    createdAt
  );

  db.project.prepare(`
    INSERT OR REPLACE INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CHECK-FIXTURE-INSTALL-PRJ-PROD-BATH-0001',
    executionProjectId,
    projectId,
    'FIXTURE_INSTALLATION_INSPECTION',
    toJson({
      fixturePackage,
      itemsKo: [
        '양변기 수평/흔들림 확인',
        '세면대 고정 및 배수 확인',
        '세면수전 누수 확인',
        '샤워수전 냉온수 및 누수 확인',
        '샤워기 작동 확인',
        '도기 주변 실리콘 전 접합부 확인'
      ],
      resultOptions: ['PASS', 'WARNING', 'FAIL']
    }),
    'READY',
    createdAt
  );
}

function updateDashboardAndRisks() {
  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    '도기 설치 승인 / Day 3 도기 설치 준비',
    toJson([
      {
        riskType: 'FIXTURE_LEAK_CHECK_REQUIRED',
        severity: 'MEDIUM',
        descriptionKo: '도기/수전 설치 후 누수 및 배수 검수 필요'
      },
      {
        riskType: 'TILE_WARNING_CORRECTION',
        severity: 'LOW',
        descriptionKo: '줄눈/코너 마감 보완 진행'
      }
    ]),
    createdAt,
    siteOperationId
  );

  db.project.prepare(`
    INSERT INTO site_risk_logs (
      risk_log_id, site_operation_id, project_id, risk_type, severity,
      description_ko, linked_issue_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'RISK-FIXTURE-LEAK-CHECK-DAY-003',
    siteOperationId,
    projectId,
    'FIXTURE_LEAK_CHECK_REQUIRED',
    'MEDIUM',
    '도기/수전 설치 후 누수 및 배수 검수 필요',
    null,
    createdAt
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    '도기 설치 승인 / Day 3 도기 설치',
    toJson(['양변기 설치', '세면대 설치', '수전/샤워기 설치', '도기 설치 후 누수 검수']),
    '32%',
    '도기/수전 누수 검수 필요',
    '도기 설치 후 검수',
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
    'LOG-PRJ-PROD-BATH-0001-FIXTURE-INSTALL-APPROVED',
    timeLabel,
    'INFO',
    '도기 설치 승인 완료 / 아메리칸스탠다드 기본형 패키지 기록',
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
    'ACTLOG-PRJ-PROD-BATH-0001-FIXTURE-INSTALL-APPROVED',
    'APPROVE_FIXTURE_INSTALLATION',
    'CEO',
    projectId,
    approvalId,
    toJson({
      tileMidInspection: 'WARNING_NO_FAIL',
      fixturePackage,
      dayThreeReportId,
      missingItems: []
    }),
    '타일 중간 검수 WARNING 조건부 통과 후 도기 설치 승인',
    createdAt
  );
}

migrate();
assertTileWarningNoFail();
updateTileInspectionWarning();
approveFixtureInstallation();
createFixtureInstallationRecord();
createDayThreeReportAndChecklist();
updateDashboardAndRisks();
writeLogs();

console.log(JSON.stringify({
  projectId,
  approvalId,
  fixtureInstallationStatus: 'APPROVED_READY_TO_INSTALL',
  tileMidInspection: 'WARNING_NO_FAIL',
  missingItems: [],
  dayThreeReportId,
  nextProcessKo: '도기 설치 후 검수'
}, null, 2));
