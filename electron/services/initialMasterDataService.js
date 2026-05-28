'use strict';

const { DatabaseSync } = require('node:sqlite');

const SOURCE_MARKER = 'INITIAL_RC_0_3_0';
const APP_VERSION = 'RC-0.3.0';

function nowIso() {
  return new Date().toISOString();
}

function toInt(value) {
  return Math.round(Number(value || 0));
}

function toJson(value) {
  return JSON.stringify(value || {});
}

function openDatabase(filePath) {
  return new DatabaseSync(filePath);
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) {
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

function countRows(database, tableName) {
  return Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName}`).get().count || 0);
}

const PROCESS_DEFAULTS = [
  ['철거', '공통', '일반', '일반 철거', '식', 1, 'MEDIUM', 1],
  ['철거', '욕실', '철거', '욕실 철거', '식', 1.2, 'HIGH', 1],
  ['철거', '주방', '철거', '주방 철거', '식', 1.1, 'MEDIUM', 1],
  ['철거', '바닥', '철거', '바닥 철거', '㎡', 0.08, 'MEDIUM', 0],
  ['철거', '폐기물', '반출', '폐기물 반출', '식', 0.5, 'MEDIUM', 1],
  ['설비', '급수', '배관', '급수', '식', 1, 'HIGH', 1],
  ['설비', '배수', '배관', '배수', '식', 1, 'HIGH', 1],
  ['설비', '욕실', '설비', '욕실 설비', '식', 1.5, 'HIGH', 1],
  ['설비', '주방', '설비', '주방 설비', '식', 1.2, 'HIGH', 1],
  ['방수', '욕실', '방수', '욕실 방수', '㎡', 0.12, 'HIGH', 1],
  ['방수', '발코니', '방수', '발코니 방수', '㎡', 0.1, 'HIGH', 1],
  ['방수', '주방', '부분 방수', '주방 부분 방수', '식', 0.5, 'MEDIUM', 1],
  ['타일', '욕실', '벽', '욕실 벽타일', '㎡', 0.08, 'HIGH', 1],
  ['타일', '욕실', '바닥', '욕실 바닥타일', '㎡', 0.08, 'HIGH', 1],
  ['타일', '주방', '벽', '주방 벽타일', '㎡', 0.07, 'MEDIUM', 1],
  ['타일', '현관', '바닥', '현관 바닥타일', '㎡', 0.08, 'MEDIUM', 1],
  ['목공', '천장', '목공', '천장 목공', '㎡', 0.12, 'MEDIUM', 1],
  ['목공', '간접조명', '박스', '간접박스', 'm', 0.08, 'MEDIUM', 1],
  ['목공', '벽체', '가벽', '가벽', '㎡', 0.15, 'MEDIUM', 1],
  ['목공', '마감', '몰딩', '몰딩', 'm', 0.03, 'LOW', 0],
  ['목공', '마감', '걸레받이', '걸레받이', 'm', 0.03, 'LOW', 0],
  ['전기/조명', '전기', '배선', '배선', '식', 1, 'HIGH', 1],
  ['전기/조명', '전기', '콘센트', '콘센트', '개', 0.1, 'MEDIUM', 1],
  ['전기/조명', '전기', '스위치', '스위치', '개', 0.1, 'MEDIUM', 1],
  ['전기/조명', '조명', '설치', '조명 설치', '개', 0.12, 'MEDIUM', 1],
  ['전기/조명', '조명', '간접', '간접조명', 'm', 0.08, 'MEDIUM', 1],
  ['도배', '벽', '시공', '벽지 시공', '㎡', 0.03, 'LOW', 1],
  ['도배', '천장', '시공', '천장지 시공', '㎡', 0.035, 'LOW', 1],
  ['도장', '벽', '도장', '벽 도장', '㎡', 0.035, 'LOW', 1],
  ['도장', '천장', '도장', '천장 도장', '㎡', 0.04, 'LOW', 1],
  ['도장', '문', '도장', '문/문틀 도장', '개', 0.25, 'LOW', 1],
  ['바닥', '장판', '시공', '장판', '㎡', 0.035, 'LOW', 0],
  ['바닥', '강마루', '시공', '강마루', '㎡', 0.045, 'MEDIUM', 1],
  ['바닥', '타일', '시공', '타일 바닥', '㎡', 0.08, 'MEDIUM', 1],
  ['바닥', '데코타일', '시공', '데코타일', '㎡', 0.04, 'LOW', 0],
  ['필름', '문', '시공', '문 필름', '개', 0.25, 'LOW', 1],
  ['필름', '문틀', '시공', '문틀 필름', '개', 0.2, 'LOW', 1],
  ['필름', '샷시', '시공', '샷시 필름', '개', 0.35, 'MEDIUM', 1],
  ['필름', '가구', '시공', '가구 필름', 'm', 0.08, 'LOW', 1],
  ['창호', '창호', '교체', '창호 교체', '개', 1, 'HIGH', 1],
  ['창호', '마감', '실리콘', '실리콘', 'm', 0.03, 'LOW', 1],
  ['창호', '부속', '방충망', '방충망', '개', 0.2, 'LOW', 0],
  ['가구', '주방', '가구', '주방 가구', 'm', 0.5, 'MEDIUM', 1],
  ['가구', '수납', '붙박이', '붙박이장', 'm', 0.5, 'MEDIUM', 1],
  ['가구', '욕실', '욕실장', '욕실장', '개', 0.2, 'LOW', 1],
  ['가구', '현관', '신발장', '신발장', 'm', 0.4, 'LOW', 1],
  ['마감', '실리콘', '마감', '실리콘', 'm', 0.03, 'LOW', 1],
  ['마감', '청소', '마감', '청소', '식', 0.5, 'LOW', 1],
  ['마감', '검수', '점검', '검수', '식', 0.5, 'MEDIUM', 1],
  ['마감', '인도', '고객', '고객 인도', '식', 0.25, 'LOW', 1]
].map((row, index) => ({
  id: `INIT-PROC-${String(index + 1).padStart(3, '0')}`,
  majorCategory: row[0],
  middleCategory: row[1],
  minorCategory: row[2],
  processName: row[3],
  defaultUnit: row[4],
  defaultLaborQty: row[5],
  riskLevel: row[6],
  inspectionRequired: row[7],
  predecessorProcess: '',
  successorProcess: ''
}));

const MATERIAL_DEFAULTS = [
  ['타일', '기본 벽타일', '300x600', '수정 필요', '㎡', 28000, '타일', '욕실 벽타일'],
  ['타일', '기본 바닥타일', '300x300', '수정 필요', '㎡', 30000, '타일', '욕실 바닥타일'],
  ['접착/부자재', '타일 접착제/부자재', '표준', '수정 필요', '식', 180000, '타일', '타일'],
  ['방수재', '욕실 방수재', '2회 도포', '수정 필요', '㎡', 9000, '방수', '욕실 방수'],
  ['도기', '양변기 기본형', '투피스', '수정 필요', '개', 250000, '도기', '욕실 설비'],
  ['수전', '세면 수전', '기본형', '수정 필요', '개', 90000, '수전', '욕실 설비'],
  ['배수 부속', '배수 부속 세트', '표준', '수정 필요', '식', 80000, '설비', '배수'],
  ['욕실 천장재', '욕실 천장재', 'SMC/돔', '수정 필요', '㎡', 45000, '욕실천장', '천장 목공'],
  ['조명', 'LED 조명', '기본형', '수정 필요', '개', 45000, '조명', '조명 설치'],
  ['환풍기', '욕실 환풍기', '기본형', '수정 필요', '개', 65000, '환풍기', '욕실 설비'],
  ['주방 가구', '주방 하부장/상부장', 'm 기준', '수정 필요', 'm', 620000, '주방가구', '주방 가구'],
  ['상판', '인조대리석 상판', 'm 기준', '수정 필요', 'm', 220000, '상판', '주방 가구'],
  ['싱크볼', '싱크볼', '기본형', '수정 필요', '개', 150000, '싱크볼', '주방 설비'],
  ['후드', '주방 후드', '기본형', '수정 필요', '개', 180000, '후드', '주방 설비'],
  ['바닥재', '강마루', '보급형', '수정 필요', '㎡', 65000, '바닥재', '강마루'],
  ['벽지', '합지/실크 벽지', '표준', '수정 필요', '㎡', 12000, '도배', '벽지 시공'],
  ['도장재', '친환경 페인트', '표준', '수정 필요', '㎡', 8000, '도장', '벽 도장'],
  ['필름', '인테리어 필름', '표준', '수정 필요', 'm', 35000, '필름', '문 필름'],
  ['몰딩', '기본 몰딩', 'PVC/MDF', '수정 필요', 'm', 8000, '목공', '몰딩'],
  ['걸레받이', '기본 걸레받이', 'PVC/MDF', '수정 필요', 'm', 9000, '목공', '걸레받이'],
  ['실리콘', '실리콘', '내곰팡이', '수정 필요', 'm', 3500, '마감', '실리콘'],
  ['창호', '창호 기본형', '규격 확인', '수정 필요', '개', 450000, '창호', '창호 교체'],
  ['철물/부속', '철물/부속 잡자재', '표준', '수정 필요', '식', 100000, '철물', '마감']
].map((row, index) => ({
  id: `INIT-MAT-${String(index + 1).padStart(3, '0')}`,
  materialCategory: row[0],
  materialName: row[1],
  specification: row[2],
  brand: row[3],
  unit: row[4],
  defaultUnitPrice: row[5],
  latestUnitPrice: row[5],
  recommendedVendor: row[6],
  appliedProcess: row[7],
  priceStatus: 'NEEDS_UPDATE'
}));

const LABOR_DEFAULTS = [
  ['철거공', '철거', 220000, 1, 'NORMAL'],
  ['설비공', '설비', 300000, 1, 'HIGH'],
  ['방수공', '방수', 280000, 20, 'HIGH'],
  ['타일공', '타일', 330000, 15, 'HIGH'],
  ['목공', '목공', 320000, 20, 'HIGH'],
  ['전기공', '전기/조명', 300000, 1, 'HIGH'],
  ['도배공', '도배', 280000, 40, 'NORMAL'],
  ['도장공', '도장', 260000, 35, 'NORMAL'],
  ['바닥공', '바닥', 280000, 35, 'NORMAL'],
  ['필름공', '필름', 300000, 12, 'HIGH'],
  ['창호공', '창호', 330000, 3, 'HIGH'],
  ['가구공', '가구', 320000, 5, 'HIGH'],
  ['실리콘공', '마감', 240000, 60, 'NORMAL'],
  ['청소/마감', '마감', 180000, 1, 'NORMAL'],
  ['현장관리자', '관리', 350000, 1, 'HIGH'],
  ['마스터', '종합', 400000, 1, 'MASTER']
].map((row, index) => ({
  id: `INIT-LAB-${String(index + 1).padStart(3, '0')}`,
  role: row[0],
  process: row[1],
  defaultDailyWage: row[2],
  defaultProductivity: row[3],
  skillLevel: row[4],
  priceStatus: 'NEEDS_UPDATE'
}));

const EQUIPMENT_DEFAULTS = [
  ['전동공구', 'tool', '일', 30000, '공통'],
  ['타일 절단기', 'tool', '일', 50000, '타일'],
  ['레이저 레벨기', 'tool', '일', 20000, '공통'],
  ['사다리', 'tool', '일', 15000, '공통'],
  ['폐기물 마대', 'consumable', '개', 2500, '폐기물 반출'],
  ['보양재', 'consumable', '식', 80000, '철거'],
  ['청소 장비', 'tool', '일', 40000, '청소'],
  ['운반 장비', 'transport', '회', 120000, '폐기물 반출']
].map((row, index) => ({
  id: `INIT-EQP-${String(index + 1).padStart(3, '0')}`,
  equipmentName: row[0],
  equipmentType: row[1],
  unit: row[2],
  defaultUnitPrice: row[3],
  appliedProcess: row[4],
  priceStatus: 'NEEDS_UPDATE'
}));

const STANDARD_ITEMS = [
  ...['철거', '폐기물', '방수', '벽타일', '바닥타일', '타일 부자재', '줄눈', '양변기', '세면기', '수전', '샤워수전', '배수 부속', '천장', '조명', '환풍기', '샤워부스', '젠다이', '욕실장', '실리콘', '청소', '검수'].map((name) => ['bathroom_remodel', name]),
  ...['철거', '폐기물', '주방 가구', '상판', '싱크볼', '수전', '후드', '주방 벽타일', '전기/콘센트', '조명', '실리콘', '청소', '검수'].map((name) => ['kitchen_remodel', name]),
  ...['철거', '폐기물', '설비', '방수', '타일', '목공', '전기', '조명', '도배', '도장', '바닥', '필름', '창호', '가구', '실리콘', '청소', '검수'].map((name) => ['full_remodel', name])
].map((row, index) => {
  const estimateType = row[0];
  const itemName = row[1];
  const unit = ['철거', '폐기물', '방수', '청소', '검수', '설비', '전기/콘센트'].includes(itemName) ? '식' : (['양변기', '세면기', '수전', '샤워수전', '조명', '환풍기', '샤워부스', '젠다이', '욕실장', '싱크볼', '후드'].includes(itemName) ? '개' : '㎡');
  const material = unit === '식' ? 120000 : 45000;
  const labor = unit === '식' ? 180000 : 25000;
  const customer = Math.round((material + labor) / 0.68);
  return {
    id: `INIT-STD-${String(index + 1).padStart(3, '0')}`,
    itemName,
    process: itemName,
    defaultUnit: unit,
    defaultCustomerUnitPrice: customer,
    defaultMaterialCost: material,
    defaultLaborCost: labor,
    defaultSubcontractCost: 0,
    defaultMarginRate: 0.32,
    estimateType,
    isMandatory: ['철거', '폐기물', '청소', '검수'].includes(itemName) ? 1 : 0,
    priceStatus: 'NEEDS_UPDATE'
  };
});

const PACKAGE_DEFAULTS = [
  ['욕실 기본형', 'bathroom_remodel', ['철거', '방수', '벽타일', '바닥타일', '양변기', '세면기', '청소', '검수'], { grade: 'basic' }, 0.28, 0.05],
  ['욕실 표준형', 'bathroom_remodel', ['철거', '방수', '벽타일', '바닥타일', '천장', '조명', '환풍기', '욕실장', '청소', '검수'], { grade: 'standard' }, 0.32, 0.08],
  ['욕실 고급형', 'bathroom_remodel', ['철거', '방수', '벽타일', '바닥타일', '샤워부스', '젠다이', '욕실장', '천장', '조명', '청소', '검수'], { grade: 'premium' }, 0.36, 0.1],
  ['주방 기본형', 'kitchen_remodel', ['철거', '주방 가구', '상판', '싱크볼', '수전', '청소', '검수'], { layout: '일자형', grade: 'basic' }, 0.28, 0.05],
  ['주방 표준형', 'kitchen_remodel', ['철거', '주방 가구', '상판', '싱크볼', '수전', '후드', '주방 벽타일', '조명', '청소', '검수'], { layout: '일자형', grade: 'standard' }, 0.32, 0.08],
  ['주방 고급형', 'kitchen_remodel', ['철거', '주방 가구', '상판', '싱크볼', '수전', '후드', '주방 벽타일', '전기/콘센트', '조명', '청소', '검수'], { layout: 'ㄱ자형', grade: 'premium' }, 0.36, 0.1],
  ['전체 기본형', 'full_remodel', ['철거', '폐기물', '도배', '바닥', '실리콘', '청소', '검수'], { grade: 'basic' }, 0.28, 0.05],
  ['전체 표준형', 'full_remodel', ['철거', '폐기물', '설비', '방수', '타일', '목공', '전기', '조명', '도배', '바닥', '청소', '검수'], { grade: 'standard' }, 0.32, 0.08],
  ['전체 프리미엄형', 'full_remodel', ['철거', '폐기물', '설비', '방수', '타일', '목공', '전기', '조명', '도배', '도장', '바닥', '필름', '창호', '가구', '청소', '검수'], { grade: 'premium' }, 0.36, 0.12]
].map((row, index) => ({
  id: `INIT-PKG-${String(index + 1).padStart(3, '0')}`,
  packageName: row[0],
  estimateType: row[1],
  includedItems: row[2],
  defaultOptions: row[3],
  marginTarget: row[4],
  riskBuffer: row[5],
  notes: 'RC-0.3.0 초기 운영용 기준 패키지입니다. 실제 단가와 옵션은 반드시 수정하세요.'
}));

function createInitialMasterDataService({ sqliteService, backupRestoreService = null }) {
  const masterDbPath = sqliteService.dbPaths.master;

  function withDb(callback) {
    const database = openDatabase(masterDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS estimate_default_packages (
        id TEXT PRIMARY KEY,
        package_name TEXT NOT NULL,
        estimate_type TEXT NOT NULL,
        included_items_json TEXT NOT NULL,
        default_options_json TEXT NOT NULL,
        margin_target REAL NOT NULL,
        risk_buffer REAL NOT NULL,
        notes TEXT NOT NULL,
        source_marker TEXT NOT NULL,
        is_active INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS initial_master_data_seed_logs (
        id TEXT PRIMARY KEY,
        seed_key TEXT NOT NULL,
        seed_type TEXT NOT NULL,
        status TEXT NOT NULL,
        inserted_count INTEGER NOT NULL,
        skipped_count INTEGER NOT NULL,
        updated_count INTEGER NOT NULL,
        source_marker TEXT NOT NULL,
        notes TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    ensureColumn(database, 'process_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'material_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'material_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'labor_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'labor_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'equipment_master', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'equipment_master', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
    ensureColumn(database, 'standard_estimate_items', 'price_status', "price_status TEXT NOT NULL DEFAULT 'NEEDS_UPDATE'");
    ensureColumn(database, 'standard_estimate_items', 'source_marker', "source_marker TEXT NOT NULL DEFAULT ''");
  }

  function logSeed(database, { seedKey, seedType, status, insertedCount, skippedCount, updatedCount, notes }) {
    database.prepare(`
      INSERT INTO initial_master_data_seed_logs (
        id, seed_key, seed_type, status, inserted_count, skipped_count,
        updated_count, source_marker, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `SEEDLOG-${seedKey}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      seedKey,
      seedType,
      status,
      insertedCount,
      skippedCount,
      updatedCount,
      SOURCE_MARKER,
      notes || '',
      nowIso()
    );
  }

  function seedRows({ seedKey, seedType, rows, tableName, insertSql, updateSql, mapInsert, mapUpdate, overwriteExisting = false }) {
    return withDb((database) => {
      const exists = database.prepare(`SELECT id, source_marker FROM ${tableName} WHERE id = ?`);
      const insert = database.prepare(insertSql);
      const update = updateSql ? database.prepare(updateSql) : null;
      let insertedCount = 0;
      let skippedCount = 0;
      let updatedCount = 0;
      rows.forEach((row) => {
        const current = exists.get(row.id);
        if (!current) {
          insert.run(...mapInsert(row));
          insertedCount += 1;
          return;
        }
        if (overwriteExisting && String(current.source_marker || '') === SOURCE_MARKER && update) {
          update.run(...mapUpdate(row));
          updatedCount += 1;
          return;
        }
        skippedCount += 1;
      });
      const status = insertedCount > 0 || updatedCount > 0 || skippedCount === rows.length ? 'COMPLETED' : 'PARTIAL';
      logSeed(database, { seedKey, seedType, status, insertedCount, skippedCount, updatedCount, notes: 'idempotent seed' });
      return { seedKey, seedType, status, insertedCount, skippedCount, updatedCount, sourceMarker: SOURCE_MARKER };
    });
  }

  function seedInitialProcessMaster(options = {}) {
    return seedRows({
      seedKey: 'process_master_defaults',
      seedType: 'PROCESS',
      rows: PROCESS_DEFAULTS,
      tableName: 'process_master',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO process_master (
          id, major_category, middle_category, minor_category, process_name,
          default_unit, default_labor_qty, predecessor_process, successor_process,
          risk_level, inspection_required, is_active, created_at, updated_at, source_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE process_master SET major_category = ?, middle_category = ?, minor_category = ?,
          process_name = ?, default_unit = ?, default_labor_qty = ?, predecessor_process = ?,
          successor_process = ?, risk_level = ?, inspection_required = ?, is_active = ?,
          updated_at = ?, source_marker = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.majorCategory, row.middleCategory, row.minorCategory, row.processName, row.defaultUnit, row.defaultLaborQty, row.predecessorProcess, row.successorProcess, row.riskLevel, row.inspectionRequired ? 1 : 0, 1, nowIso(), nowIso(), SOURCE_MARKER],
      mapUpdate: (row) => [row.majorCategory, row.middleCategory, row.minorCategory, row.processName, row.defaultUnit, row.defaultLaborQty, row.predecessorProcess, row.successorProcess, row.riskLevel, row.inspectionRequired ? 1 : 0, 1, nowIso(), SOURCE_MARKER, row.id]
    });
  }

  function seedInitialMaterialMaster(options = {}) {
    return seedRows({
      seedKey: 'material_master_defaults',
      seedType: 'MATERIAL',
      rows: MATERIAL_DEFAULTS,
      tableName: 'material_master',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO material_master (
          id, material_category, material_name, specification, brand, unit,
          default_unit_price, latest_unit_price, recommended_vendor, applied_process,
          is_active, created_at, updated_at, price_status, source_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE material_master SET material_category = ?, material_name = ?, specification = ?,
          brand = ?, unit = ?, default_unit_price = ?, latest_unit_price = ?, recommended_vendor = ?,
          applied_process = ?, is_active = ?, updated_at = ?, price_status = ?, source_marker = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.materialCategory, row.materialName, row.specification, row.brand, row.unit, toInt(row.defaultUnitPrice), toInt(row.latestUnitPrice), row.recommendedVendor, row.appliedProcess, 1, nowIso(), nowIso(), row.priceStatus, SOURCE_MARKER],
      mapUpdate: (row) => [row.materialCategory, row.materialName, row.specification, row.brand, row.unit, toInt(row.defaultUnitPrice), toInt(row.latestUnitPrice), row.recommendedVendor, row.appliedProcess, 1, nowIso(), row.priceStatus, SOURCE_MARKER, row.id]
    });
  }

  function seedInitialLaborMaster(options = {}) {
    return seedRows({
      seedKey: 'labor_master_defaults',
      seedType: 'LABOR',
      rows: LABOR_DEFAULTS,
      tableName: 'labor_master',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO labor_master (
          id, role, process, default_daily_wage, default_productivity,
          skill_level, is_active, created_at, updated_at, price_status, source_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE labor_master SET role = ?, process = ?, default_daily_wage = ?,
          default_productivity = ?, skill_level = ?, is_active = ?, updated_at = ?,
          price_status = ?, source_marker = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.role, row.process, toInt(row.defaultDailyWage), Number(row.defaultProductivity), row.skillLevel, 1, nowIso(), nowIso(), row.priceStatus, SOURCE_MARKER],
      mapUpdate: (row) => [row.role, row.process, toInt(row.defaultDailyWage), Number(row.defaultProductivity), row.skillLevel, 1, nowIso(), row.priceStatus, SOURCE_MARKER, row.id]
    });
  }

  function seedInitialEquipmentMaster(options = {}) {
    return seedRows({
      seedKey: 'equipment_master_defaults',
      seedType: 'EQUIPMENT',
      rows: EQUIPMENT_DEFAULTS,
      tableName: 'equipment_master',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO equipment_master (
          id, equipment_name, equipment_type, unit, default_unit_price,
          applied_process, is_active, created_at, updated_at, price_status, source_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE equipment_master SET equipment_name = ?, equipment_type = ?, unit = ?,
          default_unit_price = ?, applied_process = ?, is_active = ?, updated_at = ?,
          price_status = ?, source_marker = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.equipmentName, row.equipmentType, row.unit, toInt(row.defaultUnitPrice), row.appliedProcess, 1, nowIso(), nowIso(), row.priceStatus, SOURCE_MARKER],
      mapUpdate: (row) => [row.equipmentName, row.equipmentType, row.unit, toInt(row.defaultUnitPrice), row.appliedProcess, 1, nowIso(), row.priceStatus, SOURCE_MARKER, row.id]
    });
  }

  function seedInitialStandardEstimateItems(options = {}) {
    return seedRows({
      seedKey: 'standard_estimate_item_defaults',
      seedType: 'STANDARD_ITEM',
      rows: STANDARD_ITEMS,
      tableName: 'standard_estimate_items',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO standard_estimate_items (
          id, item_name, process, default_unit, default_customer_unit_price,
          default_material_cost, default_labor_cost, default_subcontract_cost,
          default_margin_rate, estimate_type, is_mandatory, is_active,
          created_at, updated_at, price_status, source_marker
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE standard_estimate_items SET item_name = ?, process = ?, default_unit = ?,
          default_customer_unit_price = ?, default_material_cost = ?, default_labor_cost = ?,
          default_subcontract_cost = ?, default_margin_rate = ?, estimate_type = ?,
          is_mandatory = ?, is_active = ?, updated_at = ?, price_status = ?, source_marker = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.itemName, row.process, row.defaultUnit, toInt(row.defaultCustomerUnitPrice), toInt(row.defaultMaterialCost), toInt(row.defaultLaborCost), toInt(row.defaultSubcontractCost), Number(row.defaultMarginRate), row.estimateType, row.isMandatory ? 1 : 0, 1, nowIso(), nowIso(), row.priceStatus, SOURCE_MARKER],
      mapUpdate: (row) => [row.itemName, row.process, row.defaultUnit, toInt(row.defaultCustomerUnitPrice), toInt(row.defaultMaterialCost), toInt(row.defaultLaborCost), toInt(row.defaultSubcontractCost), Number(row.defaultMarginRate), row.estimateType, row.isMandatory ? 1 : 0, 1, nowIso(), row.priceStatus, SOURCE_MARKER, row.id]
    });
  }

  function seedPackages(filterType, seedKey, options = {}) {
    return seedRows({
      seedKey,
      seedType: 'PACKAGE',
      rows: PACKAGE_DEFAULTS.filter((row) => row.estimateType === filterType),
      tableName: 'estimate_default_packages',
      overwriteExisting: Boolean(options.overwriteExisting),
      insertSql: `
        INSERT INTO estimate_default_packages (
          id, package_name, estimate_type, included_items_json, default_options_json,
          margin_target, risk_buffer, notes, source_marker, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      updateSql: `
        UPDATE estimate_default_packages SET package_name = ?, estimate_type = ?,
          included_items_json = ?, default_options_json = ?, margin_target = ?,
          risk_buffer = ?, notes = ?, source_marker = ?, is_active = ?, updated_at = ? WHERE id = ?
      `,
      mapInsert: (row) => [row.id, row.packageName, row.estimateType, toJson(row.includedItems), toJson(row.defaultOptions), Number(row.marginTarget), Number(row.riskBuffer), row.notes, SOURCE_MARKER, 1, nowIso(), nowIso()],
      mapUpdate: (row) => [row.packageName, row.estimateType, toJson(row.includedItems), toJson(row.defaultOptions), Number(row.marginTarget), Number(row.riskBuffer), row.notes, SOURCE_MARKER, 1, nowIso(), row.id]
    });
  }

  function seedBathroomDefaultPackage(options = {}) {
    return seedPackages('bathroom_remodel', 'bathroom_default_packages', options);
  }

  function seedKitchenDefaultPackage(options = {}) {
    return seedPackages('kitchen_remodel', 'kitchen_default_packages', options);
  }

  function seedFullRemodelingDefaultPackage(options = {}) {
    return seedPackages('full_remodel', 'full_remodeling_default_packages', options);
  }

  function getSeedLogs(limit = 50) {
    return withDb((database) => database.prepare('SELECT * FROM initial_master_data_seed_logs ORDER BY created_at DESC LIMIT ?').all(limit));
  }

  function getInitialMasterDataStatus() {
    return withDb((database) => {
      const latestLogs = database.prepare(`
        SELECT seed_key, seed_type, status, inserted_count, skipped_count, updated_count, notes, created_at
        FROM initial_master_data_seed_logs
        ORDER BY created_at DESC
        LIMIT 30
      `).all();
      const summary = {
        processCount: countRows(database, 'process_master'),
        materialCount: countRows(database, 'material_master'),
        laborCount: countRows(database, 'labor_master'),
        equipmentCount: countRows(database, 'equipment_master'),
        standardItemCount: countRows(database, 'standard_estimate_items'),
        packageCount: countRows(database, 'estimate_default_packages'),
        seedLogCount: countRows(database, 'initial_master_data_seed_logs'),
        initialProcessCount: Number(database.prepare("SELECT COUNT(*) AS count FROM process_master WHERE source_marker = ?").get(SOURCE_MARKER).count || 0),
        initialMaterialCount: Number(database.prepare("SELECT COUNT(*) AS count FROM material_master WHERE source_marker = ?").get(SOURCE_MARKER).count || 0),
        initialStandardItemCount: Number(database.prepare("SELECT COUNT(*) AS count FROM standard_estimate_items WHERE source_marker = ?").get(SOURCE_MARKER).count || 0),
        priceUpdateRequiredCount: countNeedsUpdate(database)
      };
      return {
        version: APP_VERSION,
        sourceMarker: SOURCE_MARKER,
        status: summary.initialProcessCount > 0 && summary.initialMaterialCount > 0 && summary.initialStandardItemCount > 0 ? 'COMPLETED' : 'NOT_STARTED',
        statusKo: summary.initialProcessCount > 0 && summary.initialMaterialCount > 0 && summary.initialStandardItemCount > 0 ? '초기 데이터 세팅 완료' : '초기 데이터 세팅 필요',
        summary,
        latestLogs,
        warningKo: '이 기본 데이터는 초기 운영용 기준값입니다. 실제 단가와 업체 조건에 맞게 반드시 수정해야 합니다.'
      };
    });
  }

  function countNeedsUpdate(database) {
    return ['material_master', 'labor_master', 'equipment_master', 'standard_estimate_items'].reduce((total, tableName) => {
      return total + Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE price_status = 'NEEDS_UPDATE'`).get().count || 0);
    }, 0);
  }

  function validateInitialMasterData() {
    return withDb((database) => {
      const warnings = [];
      const add = (code, severity, messageKo, count = 1) => warnings.push({ code, severity, messageKo, count });
      if (countRows(database, 'process_master') === 0) add('NO_PROCESS_MASTER', 'CRITICAL', '공정 마스터가 없습니다.');
      if (countRows(database, 'material_master') === 0) add('NO_MATERIAL_MASTER', 'CRITICAL', '자재 마스터가 없습니다.');
      if (countRows(database, 'standard_estimate_items') === 0) add('NO_STANDARD_ITEMS', 'CRITICAL', '표준 견적 품목이 없습니다.');

      const missingUnit = [
        ['process_master', 'default_unit'],
        ['material_master', 'unit'],
        ['labor_master', 'process'],
        ['equipment_master', 'unit'],
        ['standard_estimate_items', 'default_unit']
      ].reduce((total, [tableName, columnName]) => total + Number(database.prepare(`SELECT COUNT(*) AS count FROM ${tableName} WHERE ${columnName} IS NULL OR ${columnName} = ''`).get().count || 0), 0);
      if (missingUnit > 0) add('MISSING_UNIT', 'WARNING', '단위 또는 적용 공정이 누락된 항목이 있습니다.', missingUnit);

      const missingPrice = Number(database.prepare('SELECT COUNT(*) AS count FROM standard_estimate_items WHERE default_customer_unit_price <= 0').get().count || 0);
      if (missingPrice > 0) add('MISSING_PRICE', 'WARNING', '고객 단가가 0 이하인 표준 품목이 있습니다.', missingPrice);

      const badMargin = Number(database.prepare('SELECT COUNT(*) AS count FROM standard_estimate_items WHERE default_margin_rate <= 0').get().count || 0);
      if (badMargin > 0) add('BAD_MARGIN', 'WARNING', '마진율이 0 이하인 표준 품목이 있습니다.', badMargin);

      const missingEstimateType = Number(database.prepare("SELECT COUNT(*) AS count FROM standard_estimate_items WHERE estimate_type IS NULL OR estimate_type = ''").get().count || 0);
      if (missingEstimateType > 0) add('MISSING_ESTIMATE_TYPE', 'WARNING', '견적 유형이 누락된 표준 품목이 있습니다.', missingEstimateType);

      const duplicateRows = database.prepare(`
        SELECT estimate_type, process, item_name, COUNT(*) AS count
        FROM standard_estimate_items
        GROUP BY estimate_type, process, item_name
        HAVING COUNT(*) > 1
      `).all();
      if (duplicateRows.length > 0) add('DUPLICATE_ITEM', 'WARNING', '중복 표준 품목이 있습니다.', duplicateRows.length);

      const priceUpdateRequiredCount = countNeedsUpdate(database);
      if (priceUpdateRequiredCount > 0) add('PRICE_UPDATE_REQUIRED', 'INFO', '단가 수정 필요 항목이 있습니다.', priceUpdateRequiredCount);

      const criticalCount = warnings.filter((warning) => warning.severity === 'CRITICAL').length;
      const statusKo = criticalCount > 0 ? '수정 필요' : (warnings.length > 0 ? '확인 필요' : '사용 가능');
      return {
        statusKo,
        warningCount: warnings.length,
        priceUpdateRequiredCount,
        warnings,
        summary: getInitialMasterDataStatus().summary
      };
    });
  }

  function createInitialMasterDataBackup(options = {}) {
    if (!backupRestoreService || typeof backupRestoreService.createFullUserDataBackup !== 'function') {
      return {
        ok: true,
        simulated: true,
        backupId: `SIMULATED-PRE-SEED-${Date.now()}`,
        statusKo: '테스트 백업 시뮬레이션',
        messageKo: '백업 서비스가 없어 smoke/test 환경에서 안전하게 시뮬레이션했습니다.'
      };
    }
    const backup = backupRestoreService.createFullUserDataBackup({
      notes: options.notes || '초기 기준 데이터 세팅 전 현재 데이터 백업'
    });
    return { ok: true, simulated: false, ...backup };
  }

  function runInitialMasterDataSetup(options = {}) {
    let backup = null;
    if (options.createBackup !== false) {
      try {
        backup = createInitialMasterDataBackup({ notes: '초기 기준 데이터 세팅 전 현재 데이터를 백업합니다.' });
      } catch (error) {
        if (!options.continueWithoutBackup) {
          return {
            ok: false,
            status: 'FAILED',
            messageKo: '초기 기준 데이터 세팅 전 백업에 실패하여 작업을 중단했습니다.',
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    }
    const results = [
      seedInitialProcessMaster(options),
      seedInitialMaterialMaster(options),
      seedInitialLaborMaster(options),
      seedInitialEquipmentMaster(options),
      seedInitialStandardEstimateItems(options),
      seedBathroomDefaultPackage(options),
      seedKitchenDefaultPackage(options),
      seedFullRemodelingDefaultPackage(options)
    ];
    const validation = validateInitialMasterData();
    return {
      ok: true,
      status: 'COMPLETED',
      statusKo: '초기 기준 데이터 세팅 완료',
      backup,
      results,
      validation,
      statusData: getInitialMasterDataStatus()
    };
  }

  function resetInitialSeedStatus() {
    return withDb((database) => {
      database.prepare('DELETE FROM initial_master_data_seed_logs WHERE source_marker = ?').run(SOURCE_MARKER);
      return { ok: true, statusKo: '초기 세팅 로그가 초기화되었습니다.', statusData: getInitialMasterDataStatus() };
    });
  }

  return {
    getInitialMasterDataStatus,
    seedInitialProcessMaster,
    seedInitialMaterialMaster,
    seedInitialLaborMaster,
    seedInitialEquipmentMaster,
    seedInitialStandardEstimateItems,
    seedBathroomDefaultPackage,
    seedKitchenDefaultPackage,
    seedFullRemodelingDefaultPackage,
    validateInitialMasterData,
    createInitialMasterDataBackup,
    resetInitialSeedStatus,
    runInitialMasterDataSetup,
    getSeedLogs
  };
}

module.exports = {
  createInitialMasterDataService,
  SOURCE_MARKER
};
