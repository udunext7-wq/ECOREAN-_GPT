const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const createdAt = new Date().toISOString();
const dbTargets = [
  path.join(root, 'storage', 'sqlite', 'master.db'),
  path.join(root, 'release', 'RC-0.1.0', 'production', 'sqlite', 'master.db')
].filter(fs.existsSync);

const toJson = (value) => JSON.stringify(value ?? null);

const standards = [
  {
    id: 'BATH-PRICE-V2-BASIC-BOND',
    code: 'BASIC',
    nameKo: 'Basic / 기본형',
    method: 'BOND',
    costFloor: 4420000,
    minMargin: 0.2,
    minPrice: 5530000,
    recommended: 5900000,
    target: 0.25,
    included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소'],
    excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
  },
  {
    id: 'BATH-PRICE-V2-STANDARD-BOND',
    code: 'STANDARD',
    nameKo: 'Standard / 표준형',
    method: 'BOND',
    costFloor: 5070000,
    minMargin: 0.25,
    minPrice: 6760000,
    recommended: 6800000,
    target: 0.25,
    included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '현장관리 버퍼'],
    excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
  },
  {
    id: 'BATH-PRICE-V2-PREMIUM-BOND',
    code: 'PREMIUM',
    nameKo: 'Premium / 프리미엄형',
    method: 'BOND',
    costFloor: 5070000,
    minMargin: 0.3,
    minPrice: 7250000,
    recommended: 7300000,
    target: 0.3,
    included: ['본드시공', '기본 타일 시공', '기본 도기', '돔천장', '환풍기', '실리콘', '준공청소', '프리미엄 현장관리 버퍼'],
    excluded: ['샤워부스', '젠다이', '600각 폴리싱', '수입 도기', '에폭시 줄눈', '졸리컷']
  }
];

const options = [
  ['BATH-OPT-V2-SHOWER-BOOTH', '샤워부스 / 파티션', 'UPSELL', 0, 300000, 400000, 0, 1, 'ACTIVE', '기본 포함 금지. 선택 시 업셀.'],
  ['BATH-OPT-V2-ZENDAI', '젠다이 + 대리석 마감', 'UPSELL', 0, 350000, 470000, 0, 1, 'ACTIVE', '기본 포함 금지. 선택 시 업셀.'],
  ['BATH-OPT-V2-600-POLISHING', '600각 폴리싱 타일', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 포함 금지. 실제 공급가 입력 전 견적 확정 차단.'],
  ['BATH-OPT-V2-IMPORT-FIXTURE', '수입 도기 / 고급 도기', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '모델별 공급가 필요.'],
  ['BATH-OPT-V2-EPOXY-GROUT', '에폭시 줄눈', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '기본 포함 금지. 실제 자재/시공 단가 필요.'],
  ['BATH-OPT-V2-JOLLY-CUT', '졸리컷', 'UPSELL', 0, null, null, 1, 1, 'NEEDS_SUPPLIER_PRICE', '시공 난이도와 파손 리스크 때문에 대표 승인 필요.'],
  ['BATH-OPT-V2-FLOATING-MORTAR', '떠붙임 시공 전환', 'INSTALL_METHOD', 0, 500000, 670000, 0, 1, 'ACTIVE', '본드시공과 완전 분리.']
];

const rules = [
  ['BATH-MARGIN-V2-BLOCK-BELOW-20', 'blockBelowMinimumMargin', '20% 미만 수주 자동 차단', 0.2, 0.25, 0.3, 5530000, 1, '최소 마진율 20% 미만 또는 Basic 최저가 이하 견적은 대표 승인 없이 수주할 수 없습니다.'],
  ['BATH-MARGIN-V2-CEO-APPROVAL-20-25', 'ceoApprovalBetween20And25', '20~25% 구간 대표 승인', 0.2, 0.25, 0.3, 5530000, 1, '20~25% 구간은 계약 가능성이 아니라 사업성 기준으로 대표 승인이 필요합니다.'],
  ['BATH-MARGIN-V2-TARGET-25PLUS', 'targetMargin25Plus', '권장 마진 25% 이상', 0.25, 0.25, 0.3, 5900000, 0, '욕실 단독 리모델링은 25% 이상을 기본 목표로 합니다.']
];

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS bathroom_pricing_standards (
      standard_id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      package_code TEXT NOT NULL,
      package_name_ko TEXT NOT NULL,
      installation_method TEXT NOT NULL,
      cost_floor INTEGER NOT NULL,
      minimum_margin_rate REAL NOT NULL,
      minimum_allowed_price INTEGER NOT NULL,
      recommended_price INTEGER NOT NULL,
      target_margin_rate REAL NOT NULL,
      included_items_json TEXT NOT NULL,
      excluded_upsells_json TEXT NOT NULL,
      rule_status TEXT NOT NULL,
      source_project_id TEXT NOT NULL,
      source_evidence_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bathroom_pricing_options (
      option_id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      option_type TEXT NOT NULL,
      default_included INTEGER NOT NULL,
      cost_basis INTEGER,
      minimum_sale_price INTEGER,
      approval_required INTEGER NOT NULL,
      customer_visible INTEGER NOT NULL,
      pricing_status TEXT NOT NULL,
      notes_ko TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS margin_safety_rules (
      rule_id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      display_name_ko TEXT NOT NULL,
      minimum_margin_rate REAL NOT NULL,
      warning_margin_rate REAL NOT NULL,
      target_margin_rate REAL NOT NULL,
      block_below_price INTEGER NOT NULL,
      approval_required INTEGER NOT NULL,
      blocking_message_ko TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function apply(dbPath) {
  const db = new DatabaseSync(dbPath);
  migrate(db);
  const evidence = {
    sourceProjectId: 'PRJ-PROD-BATH-0001',
    revenue: 5490000,
    recoveredActualCost: 5070000,
    actualMargin: 420000,
    actualMarginRate: 0.0765
  };
  const standardStmt = db.prepare(`
    INSERT OR REPLACE INTO bathroom_pricing_standards (
      standard_id, version, package_code, package_name_ko, installation_method,
      cost_floor, minimum_margin_rate, minimum_allowed_price, recommended_price,
      target_margin_rate, included_items_json, excluded_upsells_json,
      rule_status, source_project_id, source_evidence_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  standards.forEach((item) => standardStmt.run(
    item.id, 'BATHROOM_PRICING_STANDARD_V2', item.code, item.nameKo, item.method,
    item.costFloor, item.minMargin, item.minPrice, item.recommended, item.target,
    toJson(item.included), toJson(item.excluded), 'ACTIVE', 'PRJ-PROD-BATH-0001',
    toJson(evidence), createdAt, createdAt
  ));

  const optionStmt = db.prepare(`
    INSERT OR REPLACE INTO bathroom_pricing_options (
      option_id, version, display_name_ko, option_type, default_included,
      cost_basis, minimum_sale_price, approval_required, customer_visible,
      pricing_status, notes_ko, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  options.forEach((row) => optionStmt.run(row[0], 'BATHROOM_PRICING_STANDARD_V2', ...row.slice(1), createdAt, createdAt));

  const ruleStmt = db.prepare(`
    INSERT OR REPLACE INTO margin_safety_rules (
      rule_id, version, rule_name, display_name_ko, minimum_margin_rate,
      warning_margin_rate, target_margin_rate, block_below_price,
      approval_required, blocking_message_ko, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  rules.forEach((row) => ruleStmt.run(row[0], 'BATHROOM_PRICING_STANDARD_V2', ...row.slice(1), createdAt, createdAt));
  return { dbPath, standardCount: standards.length, optionCount: options.length, ruleCount: rules.length };
}

console.log(JSON.stringify({ appliedAt: createdAt, results: dbTargets.map(apply) }, null, 2));
