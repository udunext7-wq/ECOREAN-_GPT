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
const dayTwoReportId = 'DSR-PRJ-PROD-BATH-0001-DAY-002';
const createdAt = new Date().toISOString();
const reportDate = createdAt.slice(0, 10);
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS tile_site_metrics (
      metric_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      tile_spec_ko TEXT NOT NULL,
      measured_quantity_json TEXT NOT NULL,
      waste_rate_status TEXT NOT NULL,
      expected_waste_rate_ko TEXT NOT NULL,
      labor_record_status TEXT NOT NULL,
      crew_productivity_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_approval_logs (
      approval_log_id TEXT PRIMARY KEY,
      estimate_draft_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      approval_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      before_status TEXT NOT NULL,
      after_status TEXT NOT NULL,
      checklist_json TEXT NOT NULL,
      blocking_reasons_json TEXT NOT NULL,
      actor TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function assertTileStartReady() {
  const inspection = db.project.prepare(`
    SELECT result_status, blocking_processes_json
    FROM inspection_results
    WHERE site_operation_id = ? AND inspection_type = 'WATERPROOF_STATUS_CHECK'
  `).get(siteOperationId);
  if (!inspection || inspection.result_status !== 'PASS') {
    throw new Error('Waterproof inspection PASS is required.');
  }

  const issue = db.project.prepare(`
    SELECT resolution_status
    FROM site_issues
    WHERE site_operation_id = ? AND issue_type = 'BLOCKING_RULE_READY'
  `).get(siteOperationId);
  if (!issue || issue.resolution_status !== 'RESOLVED') {
    throw new Error('Blocking risk must be resolved before tile start.');
  }

  const approval = db.approval.prepare('SELECT status FROM approvals WHERE approval_id = ?').get(approvalId);
  if (!approval) throw new Error(`Tile start approval not found: ${approvalId}`);
}

function approveTileStart() {
  const before = db.approval.prepare('SELECT status FROM approvals WHERE approval_id = ?').get(approvalId);

  db.approval.prepare(`
    UPDATE approvals
    SET status = ?, decided_by = ?, decided_at = ?, decision_reason_ko = ?, updated_at = ?
    WHERE approval_id = ?
  `).run(
    'APPROVED',
    'CEO',
    createdAt,
    '방수 검수 PASS, Blocking 해제, 추가공사 없음, 타일 발주 준비 완료',
    createdAt,
    approvalId
  );

  db.project.prepare(`
    INSERT INTO estimate_approval_logs (
      approval_log_id, estimate_draft_id, project_id, approval_id, action_type,
      before_status, after_status, checklist_json, blocking_reasons_json,
      actor, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'EAPPLOG-PRJ-PROD-BATH-0001-TILE-START',
    'EST-DRAFT-PROD-BATH-0001',
    projectId,
    approvalId,
    'APPROVED',
    before.status,
    'APPROVED',
    toJson({
      waterproofInspection: 'PASS',
      blockingRiskReleased: true,
      changeOrderRequired: false,
      tileOrderReady: true
    }),
    toJson([]),
    'CEO',
    '타일 착수 승인 처리',
    createdAt
  );
}

function activateTileProcess() {
  db.project.prepare(`
    UPDATE site_operations
    SET current_process_ko = ?, progress_rate = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run(
    'Day 2 타일 시공 활성화',
    18,
    toJson([
      {
        riskType: 'TILE_WASTE_AND_LABOR_TRACKING',
        severity: 'MEDIUM',
        descriptionKo: '600각 폴리싱 타일 손실률과 품수 실측 기록 필요'
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
    '타일 착수 승인 완료 / Day 2 타일 시공',
    toJson(['타일 자재 입고 확인', '타일 실측 수량 기록', '손실률/품수 기록 시작']),
    '18%',
    '타일 들뜸/수평/줄눈 품질 관리 필요',
    '타일 시공 후 중간 검수',
    createdAt,
    projectId
  );
}

function createDayTwoReport() {
  db.project.prepare('DELETE FROM daily_site_reports WHERE report_id = ?').run(dayTwoReportId);
  db.project.prepare(`
    INSERT INTO daily_site_reports (
      report_id, site_operation_id, project_id, report_date, work_summary_ko,
      manpower_json, completed_processes_json, next_tasks_json, issue_json,
      photo_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    dayTwoReportId,
    siteOperationId,
    projectId,
    reportDate,
    'Day 2: 방수 PASS 후 600각 폴리싱 타일 시공 착수',
    toJson([{ crewType: 'tile_team', displayKo: '타일공 1팀', status: 'WORK_STARTED', laborRecordStatus: 'STARTED' }]),
    toJson(['타일 착수 승인', '타일 자재 입고 확인 시작']),
    toJson(['벽/바닥 타일 시공', '타일 손실률 기록', '품수 기록', '타일 중간 검수']),
    toJson([{ issueType: 'TILE_WASTE_TRACKING', severity: 'MEDIUM', descriptionKo: '600각 폴리싱 타일 커팅/파손 손실률 기록 필요' }]),
    1,
    createdAt,
    createdAt
  );
}

function recordMaterialDelivery() {
  const insert = db.project.prepare(`
    INSERT INTO material_delivery_checks (
      delivery_check_id, site_operation_id, project_id, item_name_ko,
      delivery_status, issue_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['TILE-600-POLISHED', '600각 폴리싱 타일', 'RECEIVED_PENDING_QUANTITY_CHECK', '실측 수량 및 파손 여부 확인 필요'],
    ['TILE-BOND', '타일 본드', 'RECEIVED_PENDING_QUANTITY_CHECK', '사용량 기록 필요'],
    ['PRESSURE-CEMENT', '압착시멘트', 'RECEIVED_PENDING_QUANTITY_CHECK', '사용량 기록 필요'],
    ['GROUT', '줄눈', 'RECEIVED_PENDING_QUANTITY_CHECK', '색상/수량 확인 필요'],
    ['TILE-ACCESSORIES', '부자재', 'RECEIVED_PENDING_QUANTITY_CHECK', '스페이서/레벨링/보양재 사용량 기록 필요']
  ].forEach(([id, itemNameKo, status, issueKo]) => {
    insert.run(
      `DELIVERY-DAY2-${id}`,
      siteOperationId,
      projectId,
      itemNameKo,
      status,
      issueKo,
      createdAt
    );
  });
}

function startTileMetrics() {
  db.project.prepare('DELETE FROM tile_site_metrics WHERE metric_id = ?').run('TILE-METRIC-PRJ-PROD-BATH-0001-DAY2');
  db.project.prepare(`
    INSERT INTO tile_site_metrics (
      metric_id, site_operation_id, project_id, tile_spec_ko,
      measured_quantity_json, waste_rate_status, expected_waste_rate_ko,
      labor_record_status, crew_productivity_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'TILE-METRIC-PRJ-PROD-BATH-0001-DAY2',
    siteOperationId,
    projectId,
    '600각 폴리싱 타일',
    toJson({
      wallM2: 'NEEDS_SITE_MEASUREMENT',
      floorM2: 'NEEDS_SITE_MEASUREMENT',
      totalM2: 'NEEDS_SITE_MEASUREMENT',
      measuredBy: 'site_manager',
      status: 'STARTED'
    }),
    'STARTED',
    '초기 기준 8~12% 기록 시작',
    'STARTED',
    toJson({
      crewType: 'tile_team',
      crewCount: 'NEEDS_INPUT',
      laborDays: 'NEEDS_INPUT',
      productivityM2PerDay: 'NEEDS_ACTUAL_RECORD'
    }),
    createdAt,
    createdAt
  );
}

function createNextInspectionPoint() {
  db.project.prepare(`
    INSERT INTO inspection_results (
      inspection_result_id, site_operation_id, project_id, inspection_type,
      related_process_id, result_status, blocking_processes_json, notes_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'INS-TILE-MID-DAY-002',
    siteOperationId,
    projectId,
    'TILE_MID_INSPECTION',
    'tile_installation',
    'PENDING',
    toJson(['grout', 'fixture_installation', 'shower_booth', 'silicone_finish']),
    '타일 들뜸/수평/줄눈 간격/파손 확인 전 후속 마감 공정 주의',
    createdAt
  );
}

function writeLogs() {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-TILE-START-APPROVED',
    timeLabel,
    'INFO',
    '타일 착수 승인 완료 / Day 2 타일 시공 시작',
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
    'ACTLOG-PRJ-PROD-BATH-0001-TILE-START-APPROVED',
    'APPROVE_TILE_START',
    'CEO',
    projectId,
    approvalId,
    toJson({
      dayTwoReportId,
      materialDeliveryStarted: true,
      wasteTrackingStarted: true,
      laborTrackingStarted: true
    }),
    '방수 PASS 후 타일 착수 승인',
    createdAt
  );
}

migrate();
assertTileStartReady();
approveTileStart();
activateTileProcess();
createDayTwoReport();
recordMaterialDelivery();
startTileMetrics();
createNextInspectionPoint();
writeLogs();

console.log(JSON.stringify({
  projectId,
  tileStartApproval: 'APPROVED',
  dayTwoReportId,
  materialDeliveryStatus: 'RECEIVED_PENDING_QUANTITY_CHECK',
  expectedWasteRateKo: '초기 기준 8~12% 기록 시작',
  nextInspectionPoint: 'TILE_MID_INSPECTION'
}, null, 2));
