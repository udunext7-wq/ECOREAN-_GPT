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
const measuredAreaM2 = 28;
const orderWasteRate = 0.12;
const boxCoverageM2 = 1.44;
const orderQuantityM2 = Number((measuredAreaM2 * (1 + orderWasteRate)).toFixed(2));
const totalBoxCount = Math.ceil(orderQuantityM2 / boxCoverageM2);
const orderedBoxAreaM2 = Number((totalBoxCount * boxCoverageM2).toFixed(2));
const expectedRemainderM2 = Number((orderedBoxAreaM2 - measuredAreaM2).toFixed(2));
const roundingSurplusM2 = Number((orderedBoxAreaM2 - orderQuantityM2).toFixed(2));
const createdAt = new Date().toISOString();
const timeLabel = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
const toJson = (value) => JSON.stringify(value ?? null);

function migrate() {
  db.project.exec(`
    CREATE TABLE IF NOT EXISTS tile_order_calculations (
      calculation_id TEXT PRIMARY KEY,
      site_operation_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      tile_spec_ko TEXT NOT NULL,
      measured_area_m2 REAL NOT NULL,
      order_waste_rate REAL NOT NULL,
      order_quantity_m2 REAL NOT NULL,
      box_coverage_m2 REAL NOT NULL,
      total_box_count INTEGER NOT NULL,
      ordered_box_area_m2 REAL NOT NULL,
      expected_remainder_m2 REAL NOT NULL,
      rounding_surplus_m2 REAL NOT NULL,
      baseline_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}

function saveOrderCalculation() {
  db.project.prepare('DELETE FROM tile_order_calculations WHERE calculation_id = ?')
    .run('TILE-ORDER-CALC-PRJ-PROD-BATH-0001');

  db.project.prepare(`
    INSERT INTO tile_order_calculations (
      calculation_id, site_operation_id, project_id, tile_spec_ko,
      measured_area_m2, order_waste_rate, order_quantity_m2,
      box_coverage_m2, total_box_count, ordered_box_area_m2,
      expected_remainder_m2, rounding_surplus_m2, baseline_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'TILE-ORDER-CALC-PRJ-PROD-BATH-0001',
    siteOperationId,
    projectId,
    '600각 폴리싱 타일',
    measuredAreaM2,
    orderWasteRate,
    orderQuantityM2,
    boxCoverageM2,
    totalBoxCount,
    orderedBoxAreaM2,
    expectedRemainderM2,
    roundingSurplusM2,
    toJson({
      formula: 'measuredAreaM2 * 1.12',
      normalWasteRateKo: '8~12%',
      appliedWasteRateKo: '12%',
      warningAbove: '12%',
      redAlertAbove: '15%',
      boxRoundingPolicyKo: '박스 단위 올림'
    }),
    createdAt
  );
}

function updateTileMetrics() {
  db.project.prepare(`
    UPDATE tile_site_metrics
    SET measured_quantity_json = ?, waste_rate_status = ?, expected_waste_rate_ko = ?,
        labor_record_status = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    toJson({
      totalM2: measuredAreaM2,
      measuredAreaM2,
      measuredBy: 'CEO_INPUT',
      status: 'MEASURED',
      orderFormula: 'measuredAreaM2 * 1.12',
      orderWasteRate,
      orderWasteRateKo: '12%',
      orderQuantityM2,
      boxCoverageM2,
      totalBoxCount,
      orderedBoxAreaM2,
      expectedRemainderM2,
      roundingSurplusM2
    }),
    'BASELINE_SAVED',
    '600각 폴리싱 최초 발주 기준 12% / 22박스',
    'BASELINE_CONNECTED_TO_MEASURED_AREA',
    createdAt,
    projectId
  );
}

function updatePurchaseAndDelivery() {
  db.project.prepare(`
    UPDATE purchase_orders
    SET order_status = ?, warning_json = ?
    WHERE project_id = ? AND item_name_ko = ?
  `).run(
    'ORDER_QUANTITY_CONFIRMED',
    toJson([
      `실측 ${measuredAreaM2}㎡ x 1.12 = ${orderQuantityM2}㎡`,
      `1박스 ${boxCoverageM2}㎡ 기준 ${totalBoxCount}박스 발주`,
      `박스 단위 발주 총면적 ${orderedBoxAreaM2}㎡`,
      `예상 잔재량 ${expectedRemainderM2}㎡`
    ]),
    projectId,
    '600각 폴리싱 타일'
  );

  db.project.prepare(`
    UPDATE material_delivery_checks
    SET delivery_status = ?, issue_ko = ?
    WHERE site_operation_id = ? AND item_name_ko = ?
  `).run(
    'ORDER_QUANTITY_CONFIRMED_WAITING_DELIVERY_MATCH',
    `${totalBoxCount}박스 입고 기준으로 수량/파손 확인 필요`,
    siteOperationId,
    '600각 폴리싱 타일'
  );
}

function updateDailyReportAndDashboard() {
  db.project.prepare(`
    UPDATE daily_site_reports
    SET next_tasks_json = ?, issue_json = ?, updated_at = ?
    WHERE report_id = ?
  `).run(
    toJson(['22박스 입고 수량 확인', '타일 시공 진행', 'TILE_MID_INSPECTION']),
    toJson([{ issueType: 'TILE_ORDER_BASELINE_SAVED', severity: 'LOW', descriptionKo: `실측 ${measuredAreaM2}㎡, 발주 ${totalBoxCount}박스 기준 저장` }]),
    createdAt,
    'DSR-PRJ-PROD-BATH-0001-DAY-002'
  );

  db.project.prepare(`
    UPDATE projects
    SET current_process_ko = ?, today_tasks_json = ?, next_action_ko = ?, updated_at = ?
    WHERE project_id = ?
  `).run(
    '타일 발주 수량 확정 / 타일 시공 진행',
    toJson(['600각 폴리싱 22박스 입고 확인', '타일 품수 기록', '타일 중간 검수']),
    'TILE_MID_INSPECTION 진행',
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
    'LOG-PRJ-PROD-BATH-0001-TILE-ORDER-QTY',
    timeLabel,
    'INFO',
    `타일 실측 ${measuredAreaM2}㎡ / 발주 ${totalBoxCount}박스 확정`,
    projectId,
    '발주',
    createdAt
  );

  db.logs.prepare(`
    INSERT INTO action_logs (
      action_log_id, action_type, actor, project_id, approval_id,
      payload_json, reason_ko, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ACTLOG-PRJ-PROD-BATH-0001-TILE-ORDER-QTY',
    'FINALIZE_TILE_ORDER_QUANTITY',
    'CEO',
    projectId,
    null,
    toJson({ measuredAreaM2, orderWasteRate, orderQuantityM2, boxCoverageM2, totalBoxCount, expectedRemainderM2 }),
    '타일 실측 면적 기준 최초 발주 수량 확정',
    createdAt
  );
}

migrate();
saveOrderCalculation();
updateTileMetrics();
updatePurchaseAndDelivery();
updateDailyReportAndDashboard();
writeLogs();

console.log(JSON.stringify({
  projectId,
  measuredAreaM2,
  orderQuantityM2,
  boxCoverageM2,
  totalBoxCount,
  orderedBoxAreaM2,
  expectedRemainderM2,
  nextInspectionPoint: 'TILE_MID_INSPECTION'
}, null, 2));
