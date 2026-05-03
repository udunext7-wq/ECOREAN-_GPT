const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const productionDbDir = path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite');

const db = {
  master: new DatabaseSync(path.join(productionDbDir, 'master.db')),
  project: new DatabaseSync(path.join(productionDbDir, 'project.db')),
  approval: new DatabaseSync(path.join(productionDbDir, 'approval.db')),
  logs: new DatabaseSync(path.join(productionDbDir, 'logs.db'))
};

const projectId = 'PRJ-PROD-BATH-0001';
const siteOperationId = 'SITE-PRJ-PROD-BATH-0001';
const ruleId = 'TILE_ORDER_LOSS_RULE_V1';
const approvalId = 'APP-MDB-TILE-ORDER-LOSS-RULE-V1';
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

const tileOrderLossRule = {
  ruleId,
  displayNameKo: '타일 최초 발주 로스율 산정 규칙 v1',
  formula: 'orderQuantity = measuredAreaM2 * (1 + orderWasteRate)',
  defaultRates: [
    {
      tileType: 'general_tile',
      displayNameKo: '일반 타일',
      orderWasteRateMin: 0.08,
      orderWasteRateMax: 0.1,
      recommendedOrderWasteRate: 0.1
    },
    {
      tileType: 'polished_600',
      displayNameKo: '600각 폴리싱 타일',
      orderWasteRateMin: 0.1,
      orderWasteRateMax: 0.12,
      recommendedOrderWasteRate: 0.12
    },
    {
      tileType: 'large_format_or_many_corners',
      displayNameKo: '대형타일 / 졸리컷 많음 / 코너 많음',
      orderWasteRateMin: 0.12,
      orderWasteRateMax: 0.15,
      recommendedOrderWasteRate: 0.15
    },
    {
      tileType: 'high_difficulty_site',
      displayNameKo: '고난이도 현장',
      orderWasteRateMin: 0.15,
      orderWasteRateMax: null,
      recommendedOrderWasteRate: 'NEEDS_APPROVAL'
    }
  ],
  alertThresholds: {
    normalKo: '8~12%',
    warningAbove: 0.12,
    redAlertAbove: 0.15
  },
  projectApplication: {
    projectId,
    tileSpec: '600x600 polished tile',
    displayTileSpecKo: '600각 폴리싱 타일',
    recommendedOrderWasteRate: 0.12,
    orderFormulaKo: '타일 발주 수량 = 실측 면적 x 1.12',
    measuredAreaStatus: 'NEEDS_SITE_MEASUREMENT'
  },
  feedbackPolicy: {
    saveActualWasteRateToCaseLibrary: true,
    createMasterDbUpdateCandidateWhenRepeated: true,
    doNotAutoChangeWithoutApproval: true
  }
};

function migrate() {
  db.master.exec(`
    CREATE TABLE IF NOT EXISTS master_db_values (
      item_id TEXT PRIMARY KEY,
      target_db TEXT NOT NULL,
      value_json TEXT NOT NULL,
      version INTEGER NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      approval_id TEXT
    );

    CREATE TABLE IF NOT EXISTS tile_order_rules (
      rule_id TEXT PRIMARY KEY,
      display_name_ko TEXT NOT NULL,
      formula TEXT NOT NULL,
      value_json TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      approval_id TEXT NOT NULL
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

function registerMasterRule() {
  db.master.prepare(`
    INSERT OR REPLACE INTO tile_order_rules (
      rule_id, display_name_ko, formula, value_json, status,
      created_at, updated_at, approval_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    ruleId,
    tileOrderLossRule.displayNameKo,
    tileOrderLossRule.formula,
    toJson(tileOrderLossRule),
    'ACTIVE_BY_CEO_INPUT',
    createdAt,
    createdAt,
    approvalId
  );

  db.master.prepare(`
    INSERT OR REPLACE INTO master_db_values (
      item_id, target_db, value_json, version, updated_by, updated_at, approval_id
    ) VALUES (?, ?, ?, COALESCE((SELECT version + 1 FROM master_db_values WHERE item_id = ?), 1), ?, ?, ?)
  `).run(
    ruleId,
    'tile-order-rules',
    toJson(tileOrderLossRule),
    ruleId,
    'CEO',
    createdAt,
    approvalId
  );
}

function updateProjectTileMetrics() {
  const row = db.project.prepare('SELECT measured_quantity_json, crew_productivity_json FROM tile_site_metrics WHERE project_id = ?').get(projectId);
  if (!row) return;

  const measured = {
    ...fromJson(row.measured_quantity_json, {}),
    orderFormula: 'measuredAreaM2 * 1.12',
    orderWasteRate: 0.12,
    orderWasteRateKo: '12%',
    orderQuantityStatus: 'WAITING_FOR_SITE_MEASUREMENT',
    orderQuantityKo: '실측 면적 입력 후 자동 계산'
  };

  db.project.prepare(`
    UPDATE tile_site_metrics
    SET measured_quantity_json = ?, waste_rate_status = ?, expected_waste_rate_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    toJson(measured),
    'ORDER_WASTE_RATE_APPLIED',
    '600각 폴리싱 최초 발주 기준 12%',
    createdAt,
    projectId
  );
}

function updatePurchaseOrderWarnings() {
  const row = db.project.prepare(`
    SELECT purchase_order_id, warning_json
    FROM purchase_orders
    WHERE project_id = ? AND item_name_ko = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).get(projectId, '600각 폴리싱 타일');

  if (!row) return;
  const warnings = fromJson(row.warning_json, []);
  warnings.push('최초 발주는 실측 면적 x 1.12 기준으로 산정');

  db.project.prepare(`
    UPDATE purchase_orders
    SET warning_json = ?, order_status = ?
    WHERE purchase_order_id = ?
  `).run(
    toJson([...new Set(warnings)]),
    'READY_TO_ORDER_AFTER_MEASUREMENT_WITH_12_PERCENT_WASTE',
    row.purchase_order_id
  );
}

function connectApprovalAndLogs() {
  db.approval.prepare(`
    INSERT OR REPLACE INTO approvals (
      approval_id, project_id, approval_type, title_ko, reason_ko, status,
      rollback_required, rollback_status, blocking_impact_ko, requested_by,
      requested_at, updated_at, decided_by, decided_at, decision_reason_ko
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    approvalId,
    projectId,
    'MasterDbBaselineRegistration',
    '타일 최초 발주 로스율 산정 규칙 v1 등록',
    '600각 폴리싱 타일 최초 발주는 실측 면적 x 1.12 기준으로 산정합니다.',
    'APPROVED_BY_CEO_INPUT',
    1,
    'SNAPSHOT_REQUIRED_FOR_FUTURE_CHANGE',
    '향후 로스율 기준 변경은 Approval Center 승인 없이는 반영 금지',
    'CEO',
    createdAt,
    createdAt,
    'CEO',
    createdAt,
    '대표 직접 지시 기준값 등록'
  );

  db.logs.prepare(`
    INSERT INTO notification_logs (
      log_id, time_label, level, message_ko, related_project_id, action_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    `LOG-${ruleId}`,
    timeLabel,
    'INFO',
    '타일 최초 발주 로스율 규칙 등록: 600각 폴리싱 실측 면적 x 1.12',
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
    `ACTLOG-${ruleId}`,
    'REGISTER_TILE_ORDER_LOSS_RULE',
    'CEO',
    projectId,
    approvalId,
    toJson(tileOrderLossRule),
    '타일 최초 발주 수량에 로스율 선반영',
    createdAt
  );
}

migrate();
registerMasterRule();
updateProjectTileMetrics();
updatePurchaseOrderWarnings();
connectApprovalAndLogs();

console.log(JSON.stringify({
  ruleId,
  projectId,
  registered: true,
  projectFormulaKo: '타일 발주 수량 = 실측 면적 x 1.12',
  warningThreshold: '12% 초과',
  redAlertThreshold: '15% 초과'
}, null, 2));
