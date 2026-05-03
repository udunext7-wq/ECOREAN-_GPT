const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const projectId = 'PRJ-PROD-BATH-0001';
const completionReportId = 'COMP-PRJ-PROD-BATH-0001';
const revenue = 5490000;
const knownBaseline = 2850000;
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

const dbTargets = [
  { label: 'development', dir: path.join(root, 'storage', 'sqlite') },
  { label: 'production', dir: path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite') }
].filter((target) => fs.existsSync(path.join(target.dir, 'project.db')));

const recoveredCosts = [
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-DEMOLITION',
    category: 'demolition',
    itemNameKo: '철거',
    amount: 350000,
    quantity: 1,
    unit: 'LS',
    basisKo: '본드시공 기준, 기존 벽체 유지 조건의 욕실 단독 철거 대표 실무 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-WASTE',
    category: 'waste',
    itemNameKo: '폐기물 반출',
    amount: 180000,
    quantity: 1,
    unit: 'LS',
    basisKo: '욕실 단독 철거 폐기물 반출, 현장 반출 1회 기준 임시 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-TILE',
    category: 'tile',
    itemNameKo: '600각 폴리싱 타일',
    amount: 420000,
    quantity: 22,
    unit: 'BOX',
    basisKo: '실측 28㎡ 기준 발주수량 28㎡ x 1.12 = 31.36㎡, 1.44㎡/box 기준 22box 임시 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-TILE-ACCESSORY',
    category: 'tileAccessory',
    itemNameKo: '타일 부자재',
    amount: 220000,
    quantity: 1,
    unit: 'LS',
    basisKo: '타일본드, 압착시멘트, 줄눈, 레벨링, 스페이서, 커팅날 등 통합 임시 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-LABOR',
    category: 'labor',
    itemNameKo: '인건비 품수',
    amount: 850000,
    quantity: 2.5,
    unit: 'MAN_DAY',
    basisKo: '타일/도기/마감 연계 현장 투입 품수 기준 임시 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-TRANSPORT',
    category: 'transport',
    itemNameKo: '운반비',
    amount: 120000,
    quantity: 1,
    unit: 'LS',
    basisKo: '욕실 자재 반입 및 현장 운반 통합 임시 baseline'
  },
  {
    requirementId: 'CCR-PRJ-PROD-BATH-0001-MISC',
    category: 'miscellaneous',
    itemNameKo: '기타 잡비',
    amount: 80000,
    quantity: 1,
    unit: 'LS',
    basisKo: '현장 소모품, 보양 보완, 잡자재 지출 임시 baseline'
  }
];

const recoveryTotal = recoveredCosts.reduce((sum, item) => sum + item.amount, 0);
const finalActualCost = knownBaseline + recoveryTotal;
const finalMargin = revenue - finalActualCost;
const finalMarginRate = Number(((finalMargin / revenue) * 100).toFixed(2));

function toJson(value) {
  return JSON.stringify(value ?? null);
}

function tableColumns(db, tableName) {
  try {
    return db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name);
  } catch {
    return [];
  }
}

function migrate(db) {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS cost_capture_requirements (
      requirement_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      process_id TEXT NOT NULL,
      cost_category TEXT NOT NULL,
      item_name_ko TEXT NOT NULL,
      required_stage TEXT NOT NULL,
      blocking_level TEXT NOT NULL,
      source_type TEXT NOT NULL,
      vendor_required INTEGER NOT NULL,
      amount_required INTEGER NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_capture_entries (
      entry_id TEXT PRIMARY KEY,
      requirement_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      vendor_id TEXT,
      vendor_name_ko TEXT,
      source_document_ko TEXT,
      captured_by TEXT NOT NULL,
      captured_at TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_capture_status (
      project_id TEXT PRIMARY KEY,
      revenue INTEGER NOT NULL,
      captured_cost INTEGER NOT NULL,
      missing_critical_count INTEGER NOT NULL,
      forecast_margin INTEGER NOT NULL,
      forecast_margin_rate REAL NOT NULL,
      completion_blocked INTEGER NOT NULL,
      red_alert_count INTEGER NOT NULL,
      ceo_alert_count INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cost_leak_analysis (
      analysis_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      leak_type TEXT NOT NULL,
      title_ko TEXT NOT NULL,
      reason_ko TEXT NOT NULL,
      severity TEXT NOT NULL,
      related_requirement_id TEXT,
      action_ko TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function ensureRequirement(db, item) {
  const existing = db.project.prepare('SELECT * FROM cost_capture_requirements WHERE requirement_id = ?').get(item.requirementId);
  if (existing) return;

  db.project.prepare(`
    INSERT INTO cost_capture_requirements (
      requirement_id, project_id, process_id, cost_category, item_name_ko,
      required_stage, blocking_level, source_type, vendor_required,
      amount_required, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    item.requirementId,
    projectId,
    item.category,
    item.category,
    `${item.itemNameKo} 실제 원가`,
    'MISSING_COST_RECOVERY',
    'RED',
    'recoveryBaseline',
    ['tile', 'tileAccessory', 'waste', 'transport'].includes(item.category) ? 1 : 0,
    1,
    'MISSING_CRITICAL',
    createdAt,
    createdAt
  );
}

function applyCostCaptureRecovery(db) {
  recoveredCosts.forEach((item) => {
    ensureRequirement(db, item);
    db.project.prepare('DELETE FROM cost_capture_entries WHERE entry_id = ?').run(`CCE-RECOVERY-${item.requirementId}`);
    db.project.prepare(`
      INSERT INTO cost_capture_entries (
        entry_id, requirement_id, project_id, amount, quantity, unit,
        vendor_id, vendor_name_ko, source_document_ko, captured_by,
        captured_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `CCE-RECOVERY-${item.requirementId}`,
      item.requirementId,
      projectId,
      item.amount,
      item.quantity,
      item.unit,
      null,
      '임시 baseline / 실제 공급가 후속 보정',
      'Missing Cost Recovery Package',
      'CEO',
      createdAt,
      toJson({
        itemNameKo: item.itemNameKo,
        category: item.category,
        basisKo: item.basisKo,
        confidenceLevel: 'BASELINE',
        approvalStatus: 'RECOVERED_BASELINE_PENDING_SUPPLIER_PROOF',
        correctionAllowed: true
      })
    );

    db.project.prepare(`
      UPDATE cost_capture_requirements
      SET status = 'CAPTURED', updated_at = ?
      WHERE requirement_id = ?
    `).run(createdAt, item.requirementId);
  });

  db.project.prepare(`
    INSERT OR REPLACE INTO cost_capture_status (
      project_id, revenue, captured_cost, missing_critical_count,
      forecast_margin, forecast_margin_rate, completion_blocked,
      red_alert_count, ceo_alert_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(projectId, revenue, finalActualCost, 0, finalMargin, Number((finalMargin / revenue).toFixed(4)), 0, 0, finalMarginRate < 15 ? 1 : 0, createdAt);

  db.project.prepare(`
    INSERT OR REPLACE INTO cost_leak_analysis (
      analysis_id, project_id, leak_type, title_ko, reason_ko, severity,
      related_requirement_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'CLA-PRJ-PROD-BATH-0001-MISSING-COST-RECOVERED',
    projectId,
    'missingCostRecovered',
    '누락 원가 7건 회수 완료',
    `임시 Actual Cost Baseline으로 ${recoveryTotal.toLocaleString('ko-KR')}원을 추가 회수했습니다. 실제 공급가 수령 시 후속 보정 가능합니다.`,
    finalMarginRate < 15 ? 'YELLOW' : 'GREEN',
    null,
    '다음 프로젝트부터 실시간 Cost Capture 필수',
    createdAt
  );

  db.project.prepare(`
    UPDATE cost_leak_analysis
    SET severity = ?, title_ko = ?, reason_ko = ?, action_ko = ?, created_at = ?
    WHERE analysis_id = ?
  `).run(
    'GREEN',
    '핵심 원가 누락 해제',
    'Missing Cost Recovery Package로 철거, 폐기물, 타일, 타일 부자재, 인건비, 운반비, 기타 잡비가 모두 baseline 회수되었습니다.',
    '실제 공급가 수령 시 보정',
    createdAt,
    'CLA-PRJ-PROD-BATH-0001-CORE-MISSING'
  );
}

function updateCompletionData(db) {
  const actualCols = tableColumns(db.project, 'actual_costs');
  if (actualCols.includes('cost_items_json')) {
    db.project.prepare('DELETE FROM actual_costs WHERE actual_cost_id = ?').run('ACTUAL-COST-RECOVERY-PRJ-PROD-BATH-0001');
    db.project.prepare(`
      INSERT INTO actual_costs (
        actual_cost_id, completion_report_id, project_id, cost_items_json,
        known_actual_cost, unresolved_cost_items_json, actual_cost_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ACTUAL-COST-RECOVERY-PRJ-PROD-BATH-0001',
      completionReportId,
      projectId,
      toJson({ knownBaseline, recoveredCosts }),
      finalActualCost,
      toJson([]),
      'ACTUAL_COST_BASELINE_RECOVERED',
      createdAt
    );
  } else if (actualCols.includes('total_actual_cost')) {
    db.project.prepare(`
      INSERT OR REPLACE INTO actual_costs (
        actual_cost_id, completion_report_id, project_id, material_cost,
        labor_cost, subcontract_cost, equipment_cost, waste_cost,
        transport_cost, total_actual_cost, cost_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ACTUAL-COST-RECOVERY-PRJ-PROD-BATH-0001',
      completionReportId,
      projectId,
      knownBaseline + 420000 + 220000 + 80000,
      850000,
      350000,
      0,
      180000,
      120000,
      finalActualCost,
      'ACTUAL_COST_BASELINE_RECOVERED',
      createdAt,
      createdAt
    );
  }

  const marginCols = tableColumns(db.project, 'final_margin_reports');
  if (marginCols.includes('known_actual_cost')) {
    db.project.prepare('DELETE FROM final_margin_reports WHERE final_margin_report_id = ?').run('MARGIN-RECOVERY-PRJ-PROD-BATH-0001');
    db.project.prepare(`
      INSERT INTO final_margin_reports (
        final_margin_report_id, completion_report_id, project_id, revenue,
        known_actual_cost, provisional_margin, provisional_margin_rate,
        margin_status, notes_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'MARGIN-RECOVERY-PRJ-PROD-BATH-0001',
      completionReportId,
      projectId,
      revenue,
      finalActualCost,
      finalMargin,
      finalMarginRate,
      'ACTUAL_MARGIN_BASELINE_RECOVERED',
      'Missing Cost Recovery Package로 누락 원가 7건을 회수했습니다. 실제 공급가 수령 시 보정 가능.',
      createdAt
    );
  } else if (marginCols.includes('final_margin')) {
    db.project.prepare(`
      INSERT OR REPLACE INTO final_margin_reports (
        final_margin_report_id, completion_report_id, project_id, revenue,
        total_actual_cost, final_margin, final_margin_rate,
        margin_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'MARGIN-RECOVERY-PRJ-PROD-BATH-0001',
      completionReportId,
      projectId,
      revenue,
      finalActualCost,
      finalMargin,
      finalMarginRate,
      'ACTUAL_MARGIN_BASELINE_RECOVERED',
      createdAt,
      createdAt
    );
  }
}

function updateLearningData(db) {
  const caseCols = tableColumns(db.project, 'case_library');
  if (caseCols.includes('actual_result_json')) {
    db.project.prepare(`
      UPDATE case_library
      SET actual_result_json = ?, learning_tags_json = ?, created_at = ?
      WHERE case_id = ?
    `).run(
      toJson({ revenue, knownBaseline, recoveredCosts, finalActualCost, finalMargin, finalMarginRate, defects: [], claims: [] }),
      toJson(['bathroom', 'missing_cost_recovered', 'actual_margin_baseline', 'cost_capture_v2']),
      createdAt,
      'CASE-PRJ-PROD-BATH-0001'
    );
  } else if (caseCols.includes('actual_cost_json')) {
    db.project.prepare(`
      UPDATE case_library
      SET actual_cost_json = ?, final_margin_json = ?, learning_status = ?, updated_at = ?
      WHERE case_id = ?
    `).run(
      toJson({ knownBaseline, recoveredCosts, finalActualCost }),
      toJson({ revenue, finalActualCost, finalMargin, finalMarginRate, status: 'ACTUAL_MARGIN_BASELINE_RECOVERED' }),
      'COST_CAPTURE_RECOVERED',
      createdAt,
      'CASE-PRJ-PROD-BATH-0001'
    );
  }

  const suggestionCols = tableColumns(db.project, 'learning_suggestions');
  if (suggestionCols.includes('suggestion_json')) {
    db.project.prepare(`
      UPDATE learning_suggestions
      SET suggestion_json = ?, status = ?, created_at = ?
      WHERE suggestion_id = ?
    `).run(
      toJson({
        beforeKo: 'Completion 후 누락 원가 존재',
        afterKo: '누락 원가 7건 baseline 회수 완료',
        nextRuleKo: '다음 프로젝트는 발주/공사일보 단계에서 실시간 원가 입력 강제'
      }),
      'RECOVERED_BASELINE_NEEDS_REPEAT_VALIDATION',
      createdAt,
      'LS-PRJ-PROD-BATH-0001-COST-CAPTURE'
    );
  }
}

function writeLogs(db, targetLabel) {
  if (tableColumns(db.logs, 'notification_logs').length > 0) {
    db.logs.prepare(`
      INSERT OR REPLACE INTO notification_logs (
        log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      `LOG-MISSING-COST-RECOVERY-${targetLabel}`,
      timeLabel,
      finalMarginRate < 15 ? 'WARNING' : 'INFO',
      `Missing Cost Recovery 완료: 실제 총원가 ${finalActualCost.toLocaleString('ko-KR')}원 / 마진 ${finalMargin.toLocaleString('ko-KR')}원`,
      projectId,
      '실제 원가 회수',
      createdAt
    );
  }

  if (tableColumns(db.logs, 'action_logs').length > 0) {
    db.logs.prepare(`
      INSERT OR REPLACE INTO action_logs (
        action_log_id, action_type, actor, project_id, approval_id,
        payload_json, reason_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ACTLOG-MISSING-COST-RECOVERY-${targetLabel}`,
      'RUN_MISSING_COST_RECOVERY_PACKAGE',
      'CEO',
      projectId,
      null,
      toJson({ recoveredCosts, recoveryTotal, finalActualCost, finalMargin, finalMarginRate }),
      '누락 실제 원가 7건 baseline 회수 및 최종 마진 재계산',
      createdAt
    );
  }
}

function runForTarget(target) {
  const db = {
    project: new DatabaseSync(path.join(target.dir, 'project.db')),
    approval: fs.existsSync(path.join(target.dir, 'approval.db')) ? new DatabaseSync(path.join(target.dir, 'approval.db')) : null,
    master: fs.existsSync(path.join(target.dir, 'master.db')) ? new DatabaseSync(path.join(target.dir, 'master.db')) : null,
    logs: fs.existsSync(path.join(target.dir, 'logs.db')) ? new DatabaseSync(path.join(target.dir, 'logs.db')) : null
  };

  migrate(db);
  applyCostCaptureRecovery(db);
  updateCompletionData(db);
  updateLearningData(db);
  if (db.logs) writeLogs(db, target.label);

  return {
    target: target.label,
    dbDir: target.dir,
    recovered: true
  };
}

const results = dbTargets.map(runForTarget);

console.log(JSON.stringify({
  projectId,
  revenue,
  knownBaseline,
  recoveredCosts,
  recoveryTotal,
  finalActualCost,
  finalMargin,
  finalMarginRate,
  redAlertCleared: true,
  completionBlockCleared: true,
  results
}, null, 2));
