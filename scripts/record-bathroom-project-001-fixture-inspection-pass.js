const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const checklistId = 'CHECK-FIXTURE-INSTALL-PRJ-PROD-BATH-0001';
const inspectionId = 'INS-FIXTURE-INSTALL-PASS-DAY-003';
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);
const fromJson = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const inspectionItems = [
  '양변기 수평',
  '양변기 흔들림',
  '세면대 고정 상태',
  '세면대 배수 상태',
  '세면수전 누수 여부',
  '샤워수전 누수 여부',
  '냉온수 방향 정상 여부',
  '샤워기 작동 상태',
  '도기 주변 접합부 상태'
].map((itemNameKo) => ({
  itemNameKo,
  resultStatus: 'PASS',
  noteKo: '이상 없음'
}));

function updateFixtureInspection() {
  const row = db.project.prepare('SELECT checklist_json FROM inspection_checklists WHERE checklist_id = ?').get(checklistId);
  const payload = fromJson(row?.checklist_json, {});
  db.project.prepare(`
    UPDATE inspection_checklists
    SET checklist_json = ?, status = ?
    WHERE checklist_id = ?
  `).run(
    toJson({
      ...payload,
      inspectionItems,
      overallResult: 'PASS',
      leakDetected: false,
      redAlert: false,
      reinstallRequired: false,
      nextAllowedProcessKo: '샤워부스 설치'
    }),
    'PASS',
    checklistId
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
    'FIXTURE_INSTALLATION_INSPECTION',
    'fixture_installation',
    'PASS',
    toJson([]),
    '도기 설치 후 검수 전체 PASS. 누수 없음, 양변기 흔들림 없음, 재설치 필요 없음. 샤워부스 설치 가능.',
    createdAt
  );
}

function updateFixtureRecordAndDashboard() {
  db.project.prepare(`
    UPDATE fixture_installation_records
    SET installation_status = ?, inspection_points_json = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'INSPECTION_PASS',
    toJson({
      inspectionItems,
      leakDetected: false,
      reinstallRequired: false,
      nextProcessKo: '샤워부스 설치'
    }),
    createdAt,
    projectId
  );

  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    '도기 설치 검수 PASS / 샤워부스 설치 준비',
    toJson([
      {
        riskType: 'SHOWER_BOOTH_INSTALLATION_CHECK',
        severity: 'MEDIUM',
        descriptionKo: '샤워부스 설치 전 유리/하드웨어/실리콘 접합부 확인 필요'
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
    '도기 설치 검수 PASS / 샤워부스 설치 준비',
    toJson(['샤워부스 유리/하드웨어 확인', '샤워부스 설치', '실리콘 접합부 준비']),
    '42%',
    '샤워부스 접합부/실리콘 마감 주의',
    '샤워부스 설치',
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
    'LOG-PRJ-PROD-BATH-0001-FIXTURE-INSPECTION-PASS',
    timeLabel,
    'INFO',
    '도기 설치 후 검수 PASS / 샤워부스 설치 가능',
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
    'ACTLOG-PRJ-PROD-BATH-0001-FIXTURE-INSPECTION-PASS',
    'RECORD_FIXTURE_INSPECTION_PASS',
    'CEO',
    projectId,
    null,
    toJson({
      result: 'PASS',
      leakDetected: false,
      redAlert: false,
      reinstallRequired: false,
      nextProcess: 'shower_booth_installation'
    }),
    '도기 설치 후 검수 전체 PASS 입력',
    createdAt
  );
}

updateFixtureInspection();
updateFixtureRecordAndDashboard();
writeLogs();

console.log(JSON.stringify({
  projectId,
  fixtureInspectionResult: 'PASS',
  leakDetected: false,
  redAlert: false,
  reinstallRequired: false,
  nextProcessKo: '샤워부스 설치'
}, null, 2));
