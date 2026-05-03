const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionRoot = path.join(root, 'release', 'RC-0.1.0', 'production');
const productionDbDir = path.join(productionRoot, 'sqlite');
const backupRoot = path.join(productionRoot, 'backup');
const exportRoot = path.join(productionRoot, 'export');
fs.mkdirSync(backupRoot, { recursive: true });
fs.mkdirSync(exportRoot, { recursive: true });

const db = {
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  approval: new DatabaseSync(path.join(productionDbDir, 'approval.db')),
  master: new DatabaseSync(path.join(productionDbDir, 'master.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const executionProjectId = 'EXEC-PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const completionReportId = 'COMP-PRJ-PROD-BATH-0001';
const completionApprovalId = 'APP-PRJ-PROD-BATH-0001-COMPLETION';
const revenue = 5490000;
const createdAt = new Date().toISOString();
const reportDate = createdAt.slice(0, 10);
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

const knownActualCostItems = [
  { itemId: 'dome_ceiling', itemNameKo: '돔천장', amount: 700000, sourceKo: '대표 기준값 v1' },
  { itemId: 'washbasin', itemNameKo: '세면대', amount: 350000, sourceKo: '대표 기준값 v1' },
  { itemId: 'one_piece_toilet', itemNameKo: '양변기 일체형', amount: 700000, sourceKo: '대표 기준값 v1' },
  { itemId: 'shower_accessory', itemNameKo: '샤워기 + 악세서리', amount: 300000, sourceKo: '대표 기준값 v1' },
  { itemId: 'shower_booth', itemNameKo: '샤워부스 / 파티션', amount: 300000, sourceKo: '대표 기준값 v1' },
  { itemId: 'zendai_marble', itemNameKo: '젠다이 + 대리석 마감', amount: 350000, sourceKo: '대표 기준값 v1' },
  { itemId: 'ventilator', itemNameKo: '환풍기', amount: 150000, sourceKo: '대표 기준값 v1' }
];

const unresolvedCostItems = [
  '철거',
  '폐기물',
  '타일',
  '타일 부자재',
  '실리콘',
  '인건비',
  '운반비',
  '기타 잡비'
];

const knownActualCost = knownActualCostItems.reduce((sum, item) => sum + item.amount, 0);
const provisionalMargin = revenue - knownActualCost;
const provisionalMarginRate = Number(((provisionalMargin / revenue) * 100).toFixed(2));

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS project_completion_reports (
      completion_report_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      completion_date TEXT NOT NULL,
      final_scope_json TEXT NOT NULL,
      final_contract_amount INTEGER NOT NULL,
      actual_cost_status TEXT NOT NULL,
      defects_json TEXT NOT NULL,
      claims_json TEXT NOT NULL,
      client_feedback_json TEXT NOT NULL,
      final_margin_status TEXT NOT NULL,
      lessons_learned_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS actual_costs (
      actual_cost_id TEXT PRIMARY KEY,
      completion_report_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      cost_items_json TEXT NOT NULL,
      known_actual_cost INTEGER NOT NULL,
      unresolved_cost_items_json TEXT NOT NULL,
      actual_cost_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS final_margin_reports (
      final_margin_report_id TEXT PRIMARY KEY,
      completion_report_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      revenue INTEGER NOT NULL,
      known_actual_cost INTEGER NOT NULL,
      provisional_margin INTEGER NOT NULL,
      provisional_margin_rate REAL NOT NULL,
      margin_status TEXT NOT NULL,
      notes_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS estimate_vs_actual_reports (
      report_id TEXT PRIMARY KEY,
      completion_report_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      estimated_json TEXT NOT NULL,
      actual_json TEXT NOT NULL,
      variance_json TEXT NOT NULL,
      correction_candidates_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS master_db_update_candidates (
      candidate_id TEXT PRIMARY KEY,
      source_project_id TEXT NOT NULL,
      target_db TEXT NOT NULL,
      target_item_id TEXT NOT NULL,
      proposed_change_json TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      approval_status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS case_library (
      case_id TEXT PRIMARY KEY,
      source_project_id TEXT NOT NULL,
      case_category TEXT NOT NULL,
      case_summary_ko TEXT NOT NULL,
      actual_result_json TEXT NOT NULL,
      learning_tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS learning_suggestions (
      suggestion_id TEXT PRIMARY KEY,
      pattern_id TEXT NOT NULL,
      source_project_id TEXT NOT NULL,
      suggestion_type TEXT NOT NULL,
      title_ko TEXT NOT NULL,
      suggestion_json TEXT NOT NULL,
      approval_required INTEGER NOT NULL,
      approval_id TEXT,
      status TEXT NOT NULL,
      rollback_required INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auto_update_candidates (
      candidate_id TEXT PRIMARY KEY,
      suggestion_id TEXT NOT NULL,
      target_db TEXT NOT NULL,
      target_item_id TEXT NOT NULL,
      proposed_value_json TEXT NOT NULL,
      approval_status TEXT NOT NULL,
      rollback_data_json TEXT NOT NULL,
      created_at TEXT NOT NULL
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

function createFinalDailyReports() {
  const insert = db.project.prepare(`
    INSERT OR REPLACE INTO daily_site_reports (
      report_id, site_operation_id, project_id, report_date, work_summary_ko,
      manpower_json, completed_processes_json, next_tasks_json, issue_json,
      photo_required, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  [
    ['DSR-PRJ-PROD-BATH-0001-DAY-005', 'Day 5: 돔천장 설치, 환풍기 설치, 작동 확인', ['돔천장 설치', '환풍기 설치', '환풍기 작동 확인'], ['실리콘 최종 마감', '준공청소']],
    ['DSR-PRJ-PROD-BATH-0001-FINAL', 'Final: 최종 실리콘 마감, 준공청소, 고객 인도 준비', ['실리콘 코너/샤워부스/젠다이/도기 주변 마감', '준공청소', '잔재 처리', '고객 인도 준비'], ['고객 인도', '완료 보고']]
  ].forEach(([id, summary, completed, next]) => {
    insert.run(
      id,
      siteOperationId,
      projectId,
      reportDate,
      summary,
      toJson([{ crewType: 'finishing_team', displayKo: '마감팀', status: 'WORK_COMPLETED' }]),
      toJson(completed),
      toJson(next),
      toJson([]),
      1,
      createdAt,
      createdAt
    );
  });
}

function createCompletionChecklistAndApproval() {
  const checklist = {
    result: 'PASS',
    redAlert: false,
    failExists: false,
    warningExists: false,
    items: {
      domeCeiling: ['수평 PASS', '마감 라인 PASS', '결로 가능성 낮음'],
      ventilator: ['작동 PASS', '소음 정상'],
      silicone: ['코너부 PASS', '샤워부스 접합부 PASS', '젠다이 연결부 PASS', '도기 주변 마감 PASS'],
      completion: ['청소 완료', '잔재 처리 완료', '고객 인도 가능'],
      defect: ['누수 없음', '냄새 없음', '배수 정상', '작동 불량 없음', '고객 클레임 가능성 낮음']
    }
  };

  db.project.prepare(`
    INSERT OR REPLACE INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CHECK-COMPLETION-PRJ-PROD-BATH-0001',
    executionProjectId,
    projectId,
    'COMPLETION_CHECKLIST',
    toJson(checklist),
    'PASS',
    createdAt
  );

  db.project.prepare(`
    INSERT OR REPLACE INTO inspection_checklists (
      checklist_id, execution_project_id, project_id, checklist_type,
      checklist_json, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CHECK-HANDOVER-PRJ-PROD-BATH-0001',
    executionProjectId,
    projectId,
    'CUSTOMER_HANDOVER_CHECKLIST',
    toJson({ result: 'READY', itemsKo: ['사용 설명', '하자 접수 기준 안내', '잔금 확인', '사진 기록'] }),
    'READY',
    createdAt
  );

  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at, decided_by, decided_at, decision_reason_ko
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    completionApprovalId,
    projectId,
    'CompletionApproval',
    '준공 완료 승인',
    '돔천장/환풍기/실리콘/준공청소/고객 인도 준비 검수 PASS.',
    'APPROVED',
    0,
    'NOT_REQUIRED',
    'COMPLETED 전환 완료',
    'BOC',
    createdAt,
    createdAt,
    'CEO',
    createdAt,
    '대표 승인'
  );
}

function completeProject() {
  db.project.prepare(`
    UPDATE execution_projects
    SET execution_status = ?, updated_at = ?
    WHERE execution_project_id = ?
  `).run('COMPLETED', createdAt, executionProjectId);

  db.project.prepare(`
    UPDATE site_operations
    SET operation_status = ?, progress_rate = ?, current_process_ko = ?, active_risks_json = ?, updated_at = ?
    WHERE site_operation_id = ?
  `).run('COMPLETED', 100, 'COMPLETED / 고객 인도 가능', toJson([]), createdAt, siteOperationId);

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, progress_rate = ?,
        defect_risk_ko = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    'COMPLETED / Closing Package 완료',
    toJson(['잔금 확인', '고객 인도', 'Case Library 검토']),
    '100%',
    '하자 없음 / 클레임 없음',
    '다음 프로젝트 개선점 반영 검토',
    createdAt,
    projectId
  );
}

function saveActualCostAndReports() {
  const finalScope = ['욕실 철거', '타일', '도기', '샤워부스', '젠다이', '돔천장', '환풍기', '실리콘', '준공청소'];
  db.project.prepare('DELETE FROM project_completion_reports WHERE completion_report_id = ?').run(completionReportId);
  db.project.prepare(`
    INSERT INTO project_completion_reports (
      completion_report_id, project_id, completion_date, final_scope_json,
      final_contract_amount, actual_cost_status, defects_json, claims_json,
      client_feedback_json, final_margin_status, lessons_learned_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    completionReportId,
    projectId,
    reportDate,
    toJson(finalScope),
    revenue,
    'ACTUAL_COST_BASELINE_PARTIAL',
    toJson([]),
    toJson([]),
    toJson({ status: 'PENDING_HANDOVER_FEEDBACK' }),
    'PROVISIONAL_MARGIN_ONLY',
    toJson(['타일 로스율은 최초 발주에 선반영 필요', '내부 실제 원가 미확정 항목은 다음 프로젝트 전 수집 필요']),
    createdAt
  );

  db.project.prepare('DELETE FROM actual_costs WHERE completion_report_id = ?').run(completionReportId);
  db.project.prepare(`
    INSERT INTO actual_costs (
      actual_cost_id, completion_report_id, project_id, cost_items_json,
      known_actual_cost, unresolved_cost_items_json, actual_cost_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTUAL-COST-PRJ-PROD-BATH-0001',
    completionReportId,
    projectId,
    toJson(knownActualCostItems),
    knownActualCost,
    toJson(unresolvedCostItems),
    'ACTUAL_COST_BASELINE_PARTIAL',
    createdAt
  );

  db.project.prepare('DELETE FROM final_margin_reports WHERE completion_report_id = ?').run(completionReportId);
  db.project.prepare(`
    INSERT INTO final_margin_reports (
      final_margin_report_id, completion_report_id, project_id, revenue,
      known_actual_cost, provisional_margin, provisional_margin_rate,
      margin_status, notes_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'MARGIN-PRJ-PROD-BATH-0001',
    completionReportId,
    projectId,
    revenue,
    knownActualCost,
    provisionalMargin,
    provisionalMarginRate,
    'PROVISIONAL_PENDING_UNRESOLVED_COSTS',
    '철거/폐기물/타일/부자재/실리콘/인건비/운반비/잡비 미확정. 확정 마진은 실제 원가 입력 후 재계산 필요.',
    createdAt
  );

  db.project.prepare('DELETE FROM estimate_vs_actual_reports WHERE report_id = ?').run('EVA-REPORT-PRJ-PROD-BATH-0001');
  db.project.prepare(`
    INSERT INTO estimate_vs_actual_reports (
      report_id, completion_report_id, project_id, estimated_json, actual_json,
      variance_json, correction_candidates_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'EVA-REPORT-PRJ-PROD-BATH-0001',
    completionReportId,
    projectId,
    toJson({ revenue, tileOrderFormula: 'measuredAreaM2 * 1.12', measuredAreaM2: 28, orderedBoxes: 22 }),
    toJson({ knownActualCost, unresolvedCostItems, defectCount: 0, claimCount: 0 }),
    toJson({ marginStatus: 'provisional', unresolvedCostCount: unresolvedCostItems.length }),
    toJson(['내부 실제 원가 수집 양식 강화', '타일 로스율 선반영 규칙 유지']),
    createdAt
  );
}

function createCaseAndLearning() {
  db.project.prepare('DELETE FROM case_library WHERE case_id = ?').run('CASE-PRJ-PROD-BATH-0001');
  db.project.prepare(`
    INSERT INTO case_library (
      case_id, source_project_id, case_category, case_summary_ko,
      actual_result_json, learning_tags_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CASE-PRJ-PROD-BATH-0001',
    projectId,
    'bathroom_remodeling',
    '구축 아파트 욕실 단독 리모델링 완료. 방수 PASS, 타일 WARNING 보완, 도기/샤워부스 PASS, 하자/클레임 없음.',
    toJson({ revenue, knownActualCost, provisionalMargin, provisionalMarginRate, defects: [], claims: [] }),
    toJson(['bathroom', 'tile_loss_rule', 'fixture_pass', 'shower_booth_pass', 'actual_cost_baseline_partial']),
    createdAt
  );

  db.project.prepare('DELETE FROM learning_suggestions WHERE suggestion_id = ?').run('LS-PRJ-PROD-BATH-0001-COST-CAPTURE');
  db.project.prepare(`
    INSERT INTO learning_suggestions (
      suggestion_id, pattern_id, source_project_id, suggestion_type, title_ko,
      suggestion_json, approval_required, approval_id, status, rollback_required, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LS-PRJ-PROD-BATH-0001-COST-CAPTURE',
    'SINGLE_CASE_NEEDS_REPEAT',
    projectId,
    'DATA_CAPTURE_IMPROVEMENT',
    '욕실 실제 원가 미확정 항목 수집 강화',
    toJson({ ruleKo: '단일 사례이므로 Master DB 직접 반영 금지', unresolvedCostItems }),
    1,
    'APP-LEARNING-PRJ-PROD-BATH-0001-COST-CAPTURE',
    'PENDING_REVIEW_SINGLE_CASE',
    1,
    createdAt
  );

  db.project.prepare('DELETE FROM auto_update_candidates WHERE candidate_id = ?').run('AUC-PRJ-PROD-BATH-0001-COST-CAPTURE');
  db.project.prepare(`
    INSERT INTO auto_update_candidates (
      candidate_id, suggestion_id, target_db, target_item_id,
      proposed_value_json, approval_status, rollback_data_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'AUC-PRJ-PROD-BATH-0001-COST-CAPTURE',
    'LS-PRJ-PROD-BATH-0001-COST-CAPTURE',
    'operation-policy',
    'bathroom_actual_cost_capture_required_fields',
    toJson({ requireActualCostFields: unresolvedCostItems }),
    'NEEDS_REPEATED_PATTERN_AND_CEO_APPROVAL',
    toJson({ rollbackAvailable: true, currentPolicy: 'manual' }),
    createdAt
  );

  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'APP-LEARNING-PRJ-PROD-BATH-0001-COST-CAPTURE',
    projectId,
    'LearningSuggestion',
    '욕실 실제 원가 수집 강화 제안',
    '단일 사례 기반이므로 Master DB 직접 반영 금지. 반복 패턴 확인 후 승인 필요.',
    'PENDING_CEO_APPROVAL',
    1,
    'READY',
    '승인 전 Master DB 반영 금지',
    'BOC',
    createdAt,
    createdAt
  );
}

function createBackupAndExports() {
  const backupId = `BACKUP-CLOSING-${projectId}-${createdAt.replace(/[:.]/g, '-')}`;
  const backupDir = path.join(backupRoot, backupId);
  fs.mkdirSync(backupDir, { recursive: true });
  const dbFiles = ['project.db', 'approval.db', 'master.db', 'logs.db'];
  const checksums = {};
  dbFiles.forEach((file) => {
    const source = path.join(productionDbDir, file);
    const target = path.join(backupDir, file);
    fs.copyFileSync(source, target);
    checksums[file] = crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  });
  fs.writeFileSync(path.join(backupDir, 'manifest.json'), JSON.stringify({ backupId, projectId, createdAt, dbFiles, checksums }, null, 2));

  const exportJsonPath = path.join(exportRoot, `${projectId}-closing-export.json`);
  const exportPayload = {
    projectId,
    completionReportId,
    revenue,
    knownActualCost,
    provisionalMargin,
    provisionalMarginRate,
    unresolvedCostItems,
    defects: [],
    claims: [],
    caseId: 'CASE-PRJ-PROD-BATH-0001',
    learningSuggestionId: 'LS-PRJ-PROD-BATH-0001-COST-CAPTURE'
  };
  fs.writeFileSync(exportJsonPath, JSON.stringify(exportPayload, null, 2));

  const exportXlsPath = path.join(exportRoot, `${projectId}-closing-report.xls`);
  const rows = [
    ['Field', 'Value'],
    ['Project ID', projectId],
    ['Revenue', revenue],
    ['Known Actual Cost', knownActualCost],
    ['Provisional Margin', provisionalMargin],
    ['Provisional Margin Rate', `${provisionalMarginRate}%`],
    ['Defects', 'None'],
    ['Claims', 'None']
  ];
  const xmlRows = rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${String(cell)}</Data></Cell>`).join('')}</Row>`).join('');
  fs.writeFileSync(exportXlsPath, `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="Closing"><Table>${xmlRows}</Table></Worksheet>
</Workbook>`);

  return { backupId, backupDir, exportJsonPath, exportXlsPath };
}

function writeLogs(backupAndExport) {
  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'LOG-PRJ-PROD-BATH-0001-COMPLETED',
    timeLabel,
    'INFO',
    '프로젝트 COMPLETED / Closing Package 완료',
    projectId,
    '완료',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-COMPLETED',
    'RUN_COMPLETION_CLOSING_PACKAGE',
    'CEO',
    projectId,
    completionApprovalId,
    toJson({ completionReportId, knownActualCost, provisionalMargin, provisionalMarginRate, ...backupAndExport }),
    'Completion + Closing Package 전체 실행',
    createdAt
  );
}

migrate();
createFinalDailyReports();
createCompletionChecklistAndApproval();
completeProject();
saveActualCostAndReports();
createCaseAndLearning();
const backupAndExport = createBackupAndExports();
writeLogs(backupAndExport);

console.log(JSON.stringify({
  projectId,
  completed: true,
  revenue,
  knownActualCost,
  provisionalMargin,
  provisionalMarginRate,
  defects: 0,
  claims: 0,
  caseRegistered: true,
  learningSuggestionCreated: true,
  masterDbCandidateCreated: true,
  backupId: backupAndExport.backupId,
  exportJsonPath: backupAndExport.exportJsonPath,
  exportXlsPath: backupAndExport.exportXlsPath
}, null, 2));
