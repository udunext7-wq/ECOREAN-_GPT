'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SUPPORTED_IMPORT_TYPES = new Set([
  'MATERIAL_PRICE_LIST',
  'VENDOR_QUOTE',
  'ACTUAL_PURCHASE',
  'LABOR_RATE',
  'EQUIPMENT_PRICE',
  'STANDARD_ITEM_PRICE'
]);

const IMPORT_TYPE_LABELS = {
  MATERIAL_PRICE_LIST: '자재 단가표',
  VENDOR_QUOTE: '업체 견적 단가표',
  ACTUAL_PURCHASE: '실제 매입 단가표',
  LABOR_RATE: '노무 단가표',
  EQUIPMENT_PRICE: '장비 단가표',
  STANDARD_ITEM_PRICE: '표준 견적 품목 단가표'
};

const PRICE_SOURCE_BY_IMPORT_TYPE = {
  MATERIAL_PRICE_LIST: 'MANUAL',
  VENDOR_QUOTE: 'VENDOR_QUOTE',
  ACTUAL_PURCHASE: 'ACTUAL_PURCHASE',
  LABOR_RATE: 'LABOR_RATE',
  EQUIPMENT_PRICE: 'MANUAL',
  STANDARD_ITEM_PRICE: 'MANUAL'
};

const TARGET_TYPE_BY_IMPORT_TYPE = {
  MATERIAL_PRICE_LIST: 'MATERIAL',
  VENDOR_QUOTE: 'MATERIAL',
  ACTUAL_PURCHASE: 'MATERIAL',
  LABOR_RATE: 'LABOR',
  EQUIPMENT_PRICE: 'EQUIPMENT',
  STANDARD_ITEM_PRICE: 'STANDARD_ITEM'
};

const COLUMN_ALIASES = {
  id: ['id', 'target_id', '마스터id', '마스터 ID', '항목id', '항목 ID'],
  item_name: ['항목명', '품목명', '자재명', '역할', '장비명', 'item_name', 'name', 'material_name', 'role', 'equipment_name'],
  category: ['분류', '자재분류', '자재 분류', 'category', 'material_category'],
  spec: ['규격', 'spec', 'specification'],
  brand: ['브랜드', 'brand'],
  unit: ['단위', 'unit'],
  price: ['단가', '견적단가', '견적 단가', '실제매입단가', '실제 매입 단가', '일당', '고객단가', '고객 단가', 'price', 'unit_price', 'customer_price'],
  vendor_name: ['업체명', '업체', 'vendor', 'vendor_name'],
  date: ['날짜', '적용일', '적용 날짜', 'date'],
  note: ['비고', '메모', '증빙 메모', 'note', 'notes'],
  process: ['적용공정', '적용 공정', '공정', '공정명', 'process'],
  quantity: ['수량', 'quantity'],
  total_amount: ['총액', '총 금액', 'total', 'total_amount'],
  purchase_order_id: ['발주번호', '발주 번호', 'purchase_order_id'],
  receiving_id: ['입고번호', '입고 번호', 'receiving_id'],
  estimate_type: ['견적유형', '견적 유형', 'estimate_type'],
  productivity: ['생산성', 'productivity'],
  skill_level: ['숙련도', 'skill_level'],
  material_cost: ['자재비', 'material_cost'],
  labor_cost: ['노무비', 'labor_cost'],
  subcontract_cost: ['외주비', 'subcontract_cost'],
  margin_rate: ['마진율', 'margin_rate']
};

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）\[\]{}]/g, '');
}

function toJson(value) {
  return JSON.stringify(value || {});
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const cleaned = String(value || '')
    .replace(/,/g, '')
    .replace(/원/g, '')
    .replace(/₩/g, '')
    .replace(/%/g, '')
    .trim();
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculatePriceVariance(currentPrice, proposedPrice) {
  const current = toNumber(currentPrice);
  const proposed = toNumber(proposedPrice);
  const varianceAmount = Math.round((proposed - current) * 100) / 100;
  if (!current) {
    return {
      varianceAmount,
      varianceRate: null,
      labelKo: '신규 입력',
      severity: 'LOW'
    };
  }
  const varianceRate = varianceAmount / current;
  const absolute = Math.abs(varianceRate);
  return {
    varianceAmount,
    varianceRate,
    labelKo: varianceAmount > 0 ? '상승' : varianceAmount < 0 ? '하락' : '동일',
    severity: absolute > 0.3 ? 'HIGH' : absolute > 0.15 ? 'MEDIUM' : 'LOW'
  };
}

function classifyPriority(targetType, text) {
  const source = String(text || '');
  const high = ['타일', '방수', '도기', '수전', '주방 가구', '상판', '바닥재', '도배', '목공', '전기', '노무', '철거', '폐기물'];
  const medium = ['조명', '환풍기', '실리콘', '필름', '몰딩', '걸레받이', '욕실장', '싱크볼', '후드'];
  if (targetType === 'LABOR') return 'HIGH';
  if (targetType === 'EQUIPMENT') return 'LOW';
  if (high.some((keyword) => source.includes(keyword))) return 'HIGH';
  if (medium.some((keyword) => source.includes(keyword))) return 'MEDIUM';
  return 'MEDIUM';
}

function matchTargetTypeFromImport(importType) {
  return TARGET_TYPE_BY_IMPORT_TYPE[importType] || 'MATERIAL';
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let inQuote = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuote && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (char === ',' && !inQuote) {
      cells.push(cell.trim());
      cell = '';
      continue;
    }
    cell += char;
  }
  cells.push(cell.trim());
  return cells;
}

function parseCSV(filePath) {
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || '';
      return row;
    }, {});
  });
  return { headers, rows };
}

function parseXLSX(filePath) {
  let xlsx;
  try {
    xlsx = require('xlsx');
  } catch (_error) {
    throw new Error('XLSX 파서가 설치되어 있지 않습니다. RC-0.3.0에서는 CSV 가져오기를 우선 지원합니다.');
  }
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  return { headers, rows };
}

function parsePriceWorkbook(filePath, importType) {
  if (!SUPPORTED_IMPORT_TYPES.has(importType)) throw new Error('지원하지 않는 가져오기 유형입니다.');
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.csv') return parseCSV(filePath);
  if (extension === '.xlsx' || extension === '.xls') return parseXLSX(filePath);
  throw new Error('지원하지 않는 파일 형식입니다. CSV 파일을 사용하세요.');
}

function inferColumnMapping(headers, importType) {
  const normalizedHeaders = headers.map((header) => ({ raw: header, key: normalizeText(header) }));
  const mapping = {};
  Object.entries(COLUMN_ALIASES).forEach(([field, aliases]) => {
    const aliasKeys = aliases.map(normalizeText);
    const match = normalizedHeaders.find((header) => aliasKeys.includes(header.key));
    if (match) mapping[field] = match.raw;
  });

  const required = ['item_name', 'price'];
  if (importType !== 'LABOR_RATE') required.push('unit');
  if (importType === 'STANDARD_ITEM_PRICE' && !mapping.price && mapping.customer_price) mapping.price = mapping.customer_price;
  const missingRequired = required.filter((field) => !mapping[field]);
  return { mapping, missingRequired, complete: missingRequired.length === 0 };
}

function readMapped(row, mapping, key) {
  const header = mapping[key];
  return header ? row[header] : '';
}

function normalizeImportedRows(rows, importType, mappingResult = null) {
  const mapping = mappingResult?.mapping || mappingResult || {};
  return rows.map((row, index) => {
    const normalized = {
      row_index: index + 1,
      import_type: importType,
      target_type: TARGET_TYPE_BY_IMPORT_TYPE[importType],
      price_source: PRICE_SOURCE_BY_IMPORT_TYPE[importType],
      target_id: readMapped(row, mapping, 'id'),
      item_name: readMapped(row, mapping, 'item_name'),
      category: readMapped(row, mapping, 'category'),
      spec: readMapped(row, mapping, 'spec'),
      brand: readMapped(row, mapping, 'brand'),
      unit: readMapped(row, mapping, 'unit') || (importType === 'LABOR_RATE' ? '일' : ''),
      price: toNumber(readMapped(row, mapping, 'price')),
      vendor_name: readMapped(row, mapping, 'vendor_name'),
      date: readMapped(row, mapping, 'date'),
      note: readMapped(row, mapping, 'note'),
      process: readMapped(row, mapping, 'process'),
      quantity: toNumber(readMapped(row, mapping, 'quantity')),
      total_amount: toNumber(readMapped(row, mapping, 'total_amount')),
      purchase_order_id: readMapped(row, mapping, 'purchase_order_id'),
      receiving_id: readMapped(row, mapping, 'receiving_id'),
      estimate_type: readMapped(row, mapping, 'estimate_type'),
      productivity: readMapped(row, mapping, 'productivity'),
      skill_level: readMapped(row, mapping, 'skill_level'),
      material_cost: toNumber(readMapped(row, mapping, 'material_cost')),
      labor_cost: toNumber(readMapped(row, mapping, 'labor_cost')),
      subcontract_cost: toNumber(readMapped(row, mapping, 'subcontract_cost')),
      margin_rate: toNumber(readMapped(row, mapping, 'margin_rate'))
    };
    return normalized;
  });
}

function validateImportedPriceRows(rows) {
  const seen = new Set();
  return rows.map((row) => {
    const messages = [];
    let status = 'VALID';
    if (!String(row.item_name || '').trim()) {
      messages.push('항목명이 없습니다.');
      status = 'INVALID';
    }
    if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) {
      messages.push('단가가 올바르지 않습니다.');
      status = 'INVALID';
    }
    if (!String(row.unit || '').trim()) {
      messages.push('단위가 없습니다.');
      status = 'INVALID';
    }
    const duplicateKey = `${normalizeText(row.item_name)}:${normalizeText(row.unit)}:${row.price}`;
    if (seen.has(duplicateKey)) messages.push('동일 가져오기 안에 중복 행이 있습니다.');
    seen.add(duplicateKey);
    return {
      ...row,
      validation_status: status,
      validation_message: messages.join(' ') || '정상'
    };
  });
}

function ensureColumn(database, tableName, columnName, columnDefinition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
}

function createPriceWorkbookImportService({ sqliteService, reportsDir = null }) {
  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.resolve(__dirname, '..', '..', 'docs');

  function withDb(callback) {
    const database = new DatabaseSync(masterDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS price_workbook_imports (
        id TEXT PRIMARY KEY,
        import_id TEXT UNIQUE NOT NULL,
        import_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        row_count INTEGER NOT NULL DEFAULT 0,
        valid_count INTEGER NOT NULL DEFAULT 0,
        invalid_count INTEGER NOT NULL DEFAULT 0,
        matched_count INTEGER NOT NULL DEFAULT 0,
        unmatched_count INTEGER NOT NULL DEFAULT 0,
        queue_created_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_workbook_import_rows (
        id TEXT PRIMARY KEY,
        import_id TEXT NOT NULL,
        row_index INTEGER NOT NULL,
        raw_json TEXT NOT NULL,
        normalized_json TEXT NOT NULL,
        match_status TEXT NOT NULL,
        matched_target_type TEXT,
        matched_target_id TEXT,
        matched_target_name TEXT,
        proposed_price REAL,
        current_price REAL,
        unit TEXT,
        variance_amount REAL,
        variance_rate REAL,
        validation_status TEXT NOT NULL,
        validation_message TEXT,
        queue_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS price_workbook_import_match_logs (
        id TEXT PRIMARY KEY,
        import_id TEXT NOT NULL,
        row_id TEXT NOT NULL,
        action TEXT NOT NULL,
        before_match_status TEXT,
        after_match_status TEXT,
        before_target_type TEXT,
        before_target_id TEXT,
        after_target_type TEXT,
        after_target_id TEXT,
        note TEXT,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS real_price_update_queue (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        target_name TEXT NOT NULL,
        current_price REAL NOT NULL,
        proposed_price REAL NOT NULL,
        unit TEXT NOT NULL,
        price_source TEXT NOT NULL,
        vendor_id TEXT,
        vendor_name TEXT,
        evidence_note TEXT,
        evidence_file_path TEXT,
        variance_amount REAL NOT NULL,
        variance_rate REAL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        approval_note TEXT,
        backup_id TEXT,
        created_at TEXT NOT NULL,
        approved_at TEXT,
        applied_at TEXT
      );
    `);
    ensureColumn(database, 'price_workbook_import_rows', 'queue_id', 'queue_id TEXT');
    ensureColumn(database, 'price_workbook_import_rows', 'manual_match_note', 'manual_match_note TEXT');
    ensureColumn(database, 'price_workbook_import_rows', 'excluded_reason', 'excluded_reason TEXT');
    ensureColumn(database, 'price_workbook_import_rows', 'matched_by', 'matched_by TEXT');
    ensureColumn(database, 'price_workbook_import_rows', 'matched_at', 'matched_at TEXT');
  }

  function targetRows(database, targetType) {
    if (targetType === 'MATERIAL') {
      return database.prepare(`
        SELECT id, material_name AS target_name, material_category AS category, specification AS spec,
               brand, unit, latest_unit_price AS current_price, applied_process AS process,
               price_status
        FROM material_master
      `).all();
    }
    if (targetType === 'LABOR') {
      return database.prepare(`
        SELECT id, role AS target_name, process AS category, process, ? AS unit,
               default_daily_wage AS current_price, skill_level AS spec, '' AS brand,
               price_status
        FROM labor_master
      `).all('일');
    }
    if (targetType === 'EQUIPMENT') {
      return database.prepare(`
        SELECT id, equipment_name AS target_name, equipment_type AS category, applied_process AS process,
               unit, default_unit_price AS current_price, '' AS spec, '' AS brand,
               price_status
        FROM equipment_master
      `).all();
    }
    if (targetType === 'PACKAGE') {
      return database.prepare(`
        SELECT id, package_name AS target_name, estimate_type AS category, estimate_type AS process,
               ? AS unit, 0 AS current_price, '' AS spec, '' AS brand,
               'NEEDS_UPDATE' AS price_status
        FROM estimate_default_packages
      `).all('식');
    }
    return database.prepare(`
      SELECT id, item_name AS target_name, process AS category, estimate_type AS process,
             default_unit AS unit, default_customer_unit_price AS current_price, '' AS spec, '' AS brand,
             price_status
      FROM standard_estimate_items
    `).all();
  }

  function getTargetRow(database, targetType, targetId) {
    return targetRows(database, targetType).find((row) => String(row.id) === String(targetId)) || null;
  }

  function logMatchAction(database, row, action, after, note = '') {
    database.prepare(`
      INSERT INTO price_workbook_import_match_logs (
        id, import_id, row_id, action, before_match_status, after_match_status,
        before_target_type, before_target_id, after_target_type, after_target_id,
        note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id('PWIML'),
      row.import_id,
      row.id,
      action,
      row.match_status || '',
      after.matchStatus || '',
      row.matched_target_type || '',
      row.matched_target_id || '',
      after.targetType || '',
      after.targetId || '',
      note || '',
      nowIso()
    );
  }

  function decorateCandidate(row, targetType, keyword, filters = {}) {
    const keywordKey = normalizeText(keyword);
    const nameKey = normalizeText(row.target_name);
    const categoryKey = normalizeText(row.category || row.process);
    const unitMatch = !filters.unit || normalizeText(filters.unit) === normalizeText(row.unit);
    let score = 30;
    const reasons = [];
    if (keywordKey && nameKey === keywordKey) {
      score += 55;
      reasons.push('항목명 정확 일치');
    } else if (keywordKey && (nameKey.includes(keywordKey) || keywordKey.includes(nameKey))) {
      score += 35;
      reasons.push('항목명 유사 일치');
    }
    if (filters.category && categoryKey.includes(normalizeText(filters.category))) {
      score += 10;
      reasons.push('분류 일치');
    }
    if (unitMatch) {
      score += 10;
      reasons.push('단위 일치');
    }
    return {
      target_type: targetType,
      target_id: row.id,
      target_name: row.target_name,
      category: row.category || row.process || '',
      unit: row.unit || '',
      current_price: Number(row.current_price || 0),
      price_status: row.price_status || '',
      match_score: Math.min(score, 100),
      reason: reasons.join(' / ') || '검색 후보'
    };
  }

  function chooseMatch(row, candidates) {
    if (row.target_id) {
      const exactId = candidates.filter((candidate) => String(candidate.id) === String(row.target_id));
      if (exactId.length === 1) return { status: 'MATCHED', matches: exactId };
      if (exactId.length > 1) return { status: 'MULTIPLE_MATCHES', matches: exactId };
    }
    const nameKey = normalizeText(row.item_name);
    const unitKey = normalizeText(row.unit);
    const categoryKey = normalizeText(row.category || row.process);
    const exactNameUnit = candidates.filter((candidate) => normalizeText(candidate.target_name) === nameKey && normalizeText(candidate.unit) === unitKey);
    if (exactNameUnit.length === 1) return { status: 'MATCHED', matches: exactNameUnit };
    if (exactNameUnit.length > 1) return { status: 'MULTIPLE_MATCHES', matches: exactNameUnit };
    const exactNameCategory = candidates.filter((candidate) => normalizeText(candidate.target_name) === nameKey && normalizeText(candidate.category || candidate.process).includes(categoryKey));
    if (categoryKey && exactNameCategory.length === 1) return { status: 'MATCHED', matches: exactNameCategory };
    if (categoryKey && exactNameCategory.length > 1) return { status: 'MULTIPLE_MATCHES', matches: exactNameCategory };
    const fuzzy = candidates.filter((candidate) => normalizeText(candidate.target_name).includes(nameKey) || nameKey.includes(normalizeText(candidate.target_name)));
    if (fuzzy.length === 1) return { status: 'MATCHED', matches: fuzzy };
    if (fuzzy.length > 1) return { status: 'MULTIPLE_MATCHES', matches: fuzzy };
    return { status: 'UNMATCHED', matches: [] };
  }

  function matchImportedRowsToMasterData(input) {
    if (Array.isArray(input)) {
      return withDb((database) => matchRows(database, input));
    }
    const importId = typeof input === 'string' ? input : input?.importId;
    return withDb((database) => {
      const rows = database.prepare('SELECT * FROM price_workbook_import_rows WHERE import_id = ? ORDER BY row_index').all(importId);
      const normalizedRows = rows.map((row) => ({ ...parseJson(row.normalized_json), row_db_id: row.id, validation_status: row.validation_status }));
      const matched = matchRows(database, normalizedRows);
      matched.forEach((row) => {
        database.prepare(`
          UPDATE price_workbook_import_rows
          SET match_status = ?, matched_target_type = ?, matched_target_id = ?, matched_target_name = ?,
              current_price = ?, variance_amount = ?, variance_rate = ?, validation_message = ?
          WHERE id = ?
        `).run(
          row.match_status,
          row.matched_target_type || null,
          row.matched_target_id || null,
          row.matched_target_name || null,
          row.current_price || 0,
          row.variance_amount || 0,
          row.variance_rate ?? null,
          row.validation_message || '',
          row.row_db_id
        );
      });
      updateImportCounts(database, importId, 'MATCHED');
      return detailFromDb(database, importId);
    });
  }

  function matchRows(database, rows) {
    const cache = {};
    return rows.map((row) => {
      if (row.validation_status === 'INVALID') {
        return { ...row, match_status: 'INVALID' };
      }
      const targetType = row.target_type || matchTargetTypeFromImport(row.import_type);
      if (!cache[targetType]) cache[targetType] = targetRows(database, targetType);
      const result = chooseMatch(row, cache[targetType]);
      const target = result.matches[0] || {};
      const variance = result.status === 'MATCHED'
        ? calculatePriceVariance(target.current_price, row.price)
        : { varianceAmount: 0, varianceRate: null, severity: 'LOW', labelKo: '확인 필요' };
      const warnings = [];
      if (result.status === 'UNMATCHED') warnings.push('마스터 데이터와 매칭되지 않았습니다.');
      if (result.status === 'MULTIPLE_MATCHES') warnings.push('여러 항목과 매칭되었습니다.');
      if (variance.severity === 'HIGH') warnings.push('단가 차이가 큽니다.');
      return {
        ...row,
        match_status: result.status,
        matched_target_type: result.status === 'MATCHED' ? targetType : null,
        matched_target_id: result.status === 'MATCHED' ? target.id : null,
        matched_target_name: result.status === 'MATCHED' ? target.target_name : null,
        current_price: result.status === 'MATCHED' ? Number(target.current_price || 0) : 0,
        variance_amount: variance.varianceAmount,
        variance_rate: variance.varianceRate,
        variance_label_ko: variance.labelKo,
        variance_severity: variance.severity,
        validation_message: [row.validation_message, ...warnings].filter(Boolean).join(' ')
      };
    });
  }

  function updateImportCounts(database, importId, status = null) {
    const stats = database.prepare(`
      SELECT
        COUNT(*) AS row_count,
        SUM(CASE WHEN validation_status = 'VALID' THEN 1 ELSE 0 END) AS valid_count,
        SUM(CASE WHEN validation_status = 'INVALID' THEN 1 ELSE 0 END) AS invalid_count,
        SUM(CASE WHEN match_status IN ('MATCHED', 'MATCHED_MANUAL') THEN 1 ELSE 0 END) AS matched_count,
        SUM(CASE WHEN match_status IN ('UNMATCHED', 'MULTIPLE_MATCHES', 'INVALID') THEN 1 ELSE 0 END) AS unmatched_count,
        SUM(CASE WHEN queue_id IS NOT NULL AND queue_id != '' THEN 1 ELSE 0 END) AS queue_created_count
      FROM price_workbook_import_rows
      WHERE import_id = ?
    `).get(importId);
    database.prepare(`
      UPDATE price_workbook_imports
      SET row_count = ?, valid_count = ?, invalid_count = ?, matched_count = ?,
          unmatched_count = ?, queue_created_count = ?, status = COALESCE(?, status)
      WHERE import_id = ?
    `).run(
      Number(stats.row_count || 0),
      Number(stats.valid_count || 0),
      Number(stats.invalid_count || 0),
      Number(stats.matched_count || 0),
      Number(stats.unmatched_count || 0),
      Number(stats.queue_created_count || 0),
      status,
      importId
    );
  }

  function previewPriceImport(filePath, importType) {
    const importId = id('PWI');
    return withDb((database) => {
      try {
        const parsed = parsePriceWorkbook(filePath, importType);
        const mappingResult = inferColumnMapping(parsed.headers, importType);
        const normalized = validateImportedPriceRows(normalizeImportedRows(parsed.rows, importType, mappingResult));
        const matchedRows = matchRows(database, normalized);
        database.prepare(`
          INSERT INTO price_workbook_imports (
            id, import_id, import_type, file_name, file_path, row_count, valid_count,
            invalid_count, matched_count, unmatched_count, queue_created_count,
            status, error_message, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 'PREVIEWED', '', ?)
        `).run(importId, importId, importType, path.basename(filePath), filePath, matchedRows.length, nowIso());
        matchedRows.forEach((row, index) => {
          const rowId = id('PWIR');
          database.prepare(`
            INSERT INTO price_workbook_import_rows (
              id, import_id, row_index, raw_json, normalized_json, match_status,
              matched_target_type, matched_target_id, matched_target_name,
              proposed_price, current_price, unit, variance_amount, variance_rate,
              validation_status, validation_message, queue_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            rowId,
            importId,
            row.row_index || index + 1,
            toJson(parsed.rows[index]),
            toJson(row),
            row.match_status,
            row.matched_target_type || null,
            row.matched_target_id || null,
            row.matched_target_name || null,
            row.price || 0,
            row.current_price || 0,
            row.unit || '',
            row.variance_amount || 0,
            row.variance_rate ?? null,
            row.validation_status || 'VALID',
            row.validation_message || '',
            '',
            nowIso()
          );
          row.row_db_id = rowId;
        });
        updateImportCounts(database, importId, 'PREVIEWED');
        return { importId, importType, importTypeKo: IMPORT_TYPE_LABELS[importType], headers: parsed.headers, columnMapping: mappingResult, rows: matchedRows, summary: summarizeRows(matchedRows) };
      } catch (error) {
        const existing = database.prepare('SELECT import_id FROM price_workbook_imports WHERE import_id = ?').get(importId);
        if (existing) {
          database.prepare("UPDATE price_workbook_imports SET status = 'FAILED', error_message = ? WHERE import_id = ?").run(error.message, importId);
        } else {
          database.prepare(`
            INSERT INTO price_workbook_imports (
              id, import_id, import_type, file_name, file_path, row_count, valid_count,
              invalid_count, matched_count, unmatched_count, queue_created_count,
              status, error_message, created_at
            ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'FAILED', ?, ?)
          `).run(importId, importId, importType, path.basename(filePath), filePath, error.message, nowIso());
        }
        throw error;
      }
    });
  }

  function summarizeRows(rows) {
    return {
      rowCount: rows.length,
      validCount: rows.filter((row) => row.validation_status === 'VALID').length,
      invalidCount: rows.filter((row) => row.validation_status === 'INVALID').length,
      matchedCount: rows.filter((row) => row.match_status === 'MATCHED' || row.match_status === 'MATCHED_MANUAL').length,
      manuallyMatchedCount: rows.filter((row) => row.match_status === 'MATCHED_MANUAL').length,
      unmatchedCount: rows.filter((row) => row.match_status === 'UNMATCHED').length,
      multipleMatchCount: rows.filter((row) => row.match_status === 'MULTIPLE_MATCHES').length,
      excludedCount: rows.filter((row) => row.match_status === 'EXCLUDED').length,
      highVarianceCount: rows.filter((row) => row.variance_severity === 'HIGH').length
    };
  }

  function createPriceUpdateQueueFromImport(payload) {
    const importId = typeof payload === 'string' ? payload : payload?.importId;
    const selectedRowIds = new Set((payload?.selectedRowIds || []).map(String));
    const selectedRowIndexes = new Set((payload?.selectedRowIndexes || []).map(Number));
    return withDb((database) => {
      const importRecord = database.prepare('SELECT * FROM price_workbook_imports WHERE import_id = ?').get(importId);
      if (!importRecord) throw new Error('가져오기 이력을 찾을 수 없습니다.');
      const rows = database.prepare('SELECT * FROM price_workbook_import_rows WHERE import_id = ? ORDER BY row_index').all(importId);
      const eligible = rows.filter((row) => {
        const selected = selectedRowIds.size === 0 && selectedRowIndexes.size === 0
          ? true
          : selectedRowIds.has(String(row.id)) || selectedRowIndexes.has(Number(row.row_index));
        return selected && row.validation_status === 'VALID' && (row.match_status === 'MATCHED' || row.match_status === 'MATCHED_MANUAL') && !row.queue_id;
      });
      const created = eligible.map((row) => {
        const normalized = parseJson(row.normalized_json);
        const queueId = id('RPUQ');
        const targetType = row.matched_target_type || normalized.target_type || TARGET_TYPE_BY_IMPORT_TYPE[importRecord.import_type];
        const priceSource = PRICE_SOURCE_BY_IMPORT_TYPE[importRecord.import_type] || 'MANUAL';
        const priority = classifyPriority(targetType, `${row.matched_target_name} ${normalized.category} ${normalized.process}`);
        database.prepare(`
          INSERT INTO real_price_update_queue (
            id, target_type, target_id, target_name, current_price, proposed_price,
            unit, price_source, vendor_id, vendor_name, evidence_note, evidence_file_path,
            variance_amount, variance_rate, priority, status, approval_note, backup_id,
            created_at, approved_at, applied_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', '', '', ?, NULL, NULL)
        `).run(
          queueId,
          targetType,
          row.matched_target_id,
          row.matched_target_name,
          row.current_price || 0,
          row.proposed_price || 0,
          row.unit || normalized.unit || '',
          priceSource,
          '',
          normalized.vendor_name || '',
          `단가표 일괄 가져오기 ${importRecord.file_name}${normalized.note ? ` / ${normalized.note}` : ''}`,
          '',
          row.variance_amount || 0,
          row.variance_rate ?? null,
          priority,
          nowIso()
        );
        database.prepare('UPDATE price_workbook_import_rows SET queue_id = ? WHERE id = ?').run(queueId, row.id);
        return { queueId, rowId: row.id, targetType, targetName: row.matched_target_name, status: 'PENDING_REVIEW' };
      });
      updateImportCounts(database, importId, 'QUEUE_CREATED');
      return { importId, createdCount: created.length, queueItems: created, detail: detailFromDb(database, importId) };
    });
  }

  function getPriceImportHistory() {
    return withDb((database) => database.prepare('SELECT * FROM price_workbook_imports ORDER BY created_at DESC LIMIT 100').all());
  }

  function getPriceImportDetail(importId) {
    return withDb((database) => {
      return detailFromDb(database, importId);
    });
  }

  function detailFromDb(database, importId) {
    const importRecord = database.prepare('SELECT * FROM price_workbook_imports WHERE import_id = ?').get(importId);
    if (!importRecord) return null;
    const rows = database.prepare('SELECT * FROM price_workbook_import_rows WHERE import_id = ? ORDER BY row_index').all(importId).map((row) => ({
      ...row,
      raw: parseJson(row.raw_json),
      normalized: parseJson(row.normalized_json)
    }));
    const readiness = getImportQueueReadinessFromDb(database, importId);
    return { import: importRecord, rows, readiness };
  }

  function getRowById(database, importRowId) {
    const row = database.prepare('SELECT * FROM price_workbook_import_rows WHERE id = ?').get(importRowId);
    if (!row) throw new Error('가져오기 행을 찾을 수 없습니다.');
    return row;
  }

  function updateRowVariance(database, importRowId) {
    const row = getRowById(database, importRowId);
    if (!row.matched_target_type || !row.matched_target_id || row.match_status === 'EXCLUDED') return row;
    const target = getTargetRow(database, row.matched_target_type, row.matched_target_id);
    if (!target) return row;
    const variance = calculatePriceVariance(target.current_price, row.proposed_price);
    database.prepare(`
      UPDATE price_workbook_import_rows
      SET current_price = ?, variance_amount = ?, variance_rate = ?, validation_status = ?,
          validation_message = ?
      WHERE id = ?
    `).run(
      Number(target.current_price || 0),
      variance.varianceAmount,
      variance.varianceRate ?? null,
      row.validation_status === 'INVALID' ? 'INVALID' : 'VALID',
      row.validation_status === 'INVALID' ? row.validation_message : `수동 매칭 기준 차이율 재계산: ${variance.labelKo}`,
      importRowId
    );
    updateImportCounts(database, row.import_id, null);
    return getRowById(database, importRowId);
  }

  function searchPriceImportMatchCandidates(importType, keyword = '', filters = {}) {
    const normalizedPayload = typeof importType === 'object'
      ? { importType: importType.importType, keyword: importType.keyword, filters: importType.filters || importType }
      : { importType, keyword, filters };
    return withDb((database) => {
      const targetType = normalizedPayload.filters?.targetType || normalizedPayload.filters?.target_type || matchTargetTypeFromImport(normalizedPayload.importType);
      const rows = targetRows(database, targetType);
      const keywordKey = normalizeText(normalizedPayload.keyword || '');
      const categoryKey = normalizeText(normalizedPayload.filters?.category || '');
      const unitKey = normalizeText(normalizedPayload.filters?.unit || '');
      const candidates = rows
        .filter((row) => {
          const haystack = normalizeText(`${row.target_name} ${row.category} ${row.process} ${row.spec} ${row.brand}`);
          const keywordOk = !keywordKey || haystack.includes(keywordKey) || keywordKey.includes(normalizeText(row.target_name));
          const categoryOk = !categoryKey || normalizeText(`${row.category} ${row.process}`).includes(categoryKey);
          const unitOk = !unitKey || normalizeText(row.unit) === unitKey;
          return keywordOk && categoryOk && unitOk;
        })
        .map((row) => decorateCandidate(row, targetType, normalizedPayload.keyword, normalizedPayload.filters))
        .sort((a, b) => b.match_score - a.match_score || String(a.target_name).localeCompare(String(b.target_name), 'ko-KR'))
        .slice(0, 30);
      return { importType: normalizedPayload.importType, targetType, keyword: normalizedPayload.keyword || '', candidates };
    });
  }

  function manuallyMatchImportRow(importRowId, targetType, targetId, note = '') {
    const normalized = typeof importRowId === 'object'
      ? { importRowId: importRowId.importRowId || importRowId.rowId, targetType: importRowId.targetType, targetId: importRowId.targetId, note: importRowId.note || '' }
      : { importRowId, targetType, targetId, note };
    return withDb((database) => {
      const row = getRowById(database, normalized.importRowId);
      if (row.queue_id) throw new Error('이미 Queue가 생성된 행은 매칭을 변경할 수 없습니다.');
      const target = getTargetRow(database, normalized.targetType, normalized.targetId);
      if (!target) throw new Error('선택한 마스터 항목을 찾을 수 없습니다.');
      const variance = calculatePriceVariance(target.current_price, row.proposed_price);
      const action = row.match_status === 'MULTIPLE_MATCHES' ? 'MULTIPLE_MATCH_RESOLVED' : 'MANUAL_MATCH';
      database.prepare(`
        UPDATE price_workbook_import_rows
        SET match_status = 'MATCHED_MANUAL',
            matched_target_type = ?,
            matched_target_id = ?,
            matched_target_name = ?,
            current_price = ?,
            variance_amount = ?,
            variance_rate = ?,
            validation_status = CASE WHEN validation_status = 'INVALID' THEN 'INVALID' ELSE 'VALID' END,
            validation_message = CASE WHEN validation_status = 'INVALID' THEN validation_message ELSE ? END,
            manual_match_note = ?,
            excluded_reason = '',
            matched_by = ?,
            matched_at = ?
        WHERE id = ?
      `).run(
        normalized.targetType,
        target.id,
        target.target_name,
        Number(target.current_price || 0),
        variance.varianceAmount,
        variance.varianceRate ?? null,
        `수동 매칭이 저장되었습니다. ${variance.labelKo}`,
        normalized.note || '',
        'CEO',
        nowIso(),
        normalized.importRowId
      );
      logMatchAction(database, row, action, { matchStatus: 'MATCHED_MANUAL', targetType: normalized.targetType, targetId: target.id }, normalized.note);
      updateImportCounts(database, row.import_id, 'MATCHED');
      return { row: detailRow(database, normalized.importRowId), readiness: getImportQueueReadinessFromDb(database, row.import_id) };
    });
  }

  function clearImportRowMatch(importRowId) {
    const normalized = typeof importRowId === 'object' ? importRowId.importRowId || importRowId.rowId : importRowId;
    return withDb((database) => {
      const row = getRowById(database, normalized);
      if (row.queue_id) throw new Error('이미 Queue가 생성된 행은 매칭을 해제할 수 없습니다.');
      database.prepare(`
        UPDATE price_workbook_import_rows
        SET match_status = 'UNMATCHED',
            matched_target_type = NULL,
            matched_target_id = NULL,
            matched_target_name = NULL,
            current_price = 0,
            variance_amount = 0,
            variance_rate = NULL,
            validation_message = '마스터 데이터와 매칭되지 않았습니다.',
            manual_match_note = '',
            excluded_reason = '',
            matched_by = '',
            matched_at = NULL
        WHERE id = ?
      `).run(normalized);
      logMatchAction(database, row, 'CLEAR_MATCH', { matchStatus: 'UNMATCHED', targetType: '', targetId: '' }, '매칭 해제');
      updateImportCounts(database, row.import_id, 'MATCHED');
      return { row: detailRow(database, normalized), readiness: getImportQueueReadinessFromDb(database, row.import_id) };
    });
  }

  function excludeImportRow(importRowId, reason = '') {
    const normalized = typeof importRowId === 'object'
      ? { importRowId: importRowId.importRowId || importRowId.rowId, reason: importRowId.reason || importRowId.excludedReason || '' }
      : { importRowId, reason };
    return withDb((database) => {
      const row = getRowById(database, normalized.importRowId);
      if (row.queue_id) throw new Error('이미 Queue가 생성된 행은 제외할 수 없습니다.');
      database.prepare(`
        UPDATE price_workbook_import_rows
        SET match_status = 'EXCLUDED',
            validation_message = '제외된 행은 Queue 생성 대상에서 제외됩니다.',
            excluded_reason = ?,
            matched_by = ?,
            matched_at = ?
        WHERE id = ?
      `).run(normalized.reason || '사용자 제외', 'CEO', nowIso(), normalized.importRowId);
      logMatchAction(database, row, 'EXCLUDE_ROW', { matchStatus: 'EXCLUDED', targetType: row.matched_target_type || '', targetId: row.matched_target_id || '' }, normalized.reason || '사용자 제외');
      updateImportCounts(database, row.import_id, 'MATCHED');
      return { row: detailRow(database, normalized.importRowId), readiness: getImportQueueReadinessFromDb(database, row.import_id) };
    });
  }

  function detailRow(database, rowId) {
    const row = getRowById(database, rowId);
    return { ...row, raw: parseJson(row.raw_json), normalized: parseJson(row.normalized_json) };
  }

  function getUnmatchedImportRows(importId) {
    const normalized = typeof importId === 'object' ? importId.importId || importId.id : importId;
    return withDb((database) => database.prepare(`
      SELECT * FROM price_workbook_import_rows
      WHERE import_id = ? AND match_status = 'UNMATCHED'
      ORDER BY row_index
    `).all(normalized).map((row) => ({ ...row, raw: parseJson(row.raw_json), normalized: parseJson(row.normalized_json) })));
  }

  function getMultipleMatchImportRows(importId) {
    const normalized = typeof importId === 'object' ? importId.importId || importId.id : importId;
    return withDb((database) => database.prepare(`
      SELECT * FROM price_workbook_import_rows
      WHERE import_id = ? AND match_status = 'MULTIPLE_MATCHES'
      ORDER BY row_index
    `).all(normalized).map((row) => ({ ...row, raw: parseJson(row.raw_json), normalized: parseJson(row.normalized_json) })));
  }

  function recalculateImportRowVariance(importRowId) {
    const normalized = typeof importRowId === 'object' ? importRowId.importRowId || importRowId.rowId : importRowId;
    return withDb((database) => ({ row: updateRowVariance(database, normalized) }));
  }

  function getImportQueueReadiness(importId) {
    const normalized = typeof importId === 'object' ? importId.importId || importId.id : importId;
    return withDb((database) => getImportQueueReadinessFromDb(database, normalized));
  }

  function getImportQueueReadinessFromDb(database, importId) {
    const rows = database.prepare('SELECT * FROM price_workbook_import_rows WHERE import_id = ?').all(importId);
    const queueEligibleRows = rows.filter((row) => row.validation_status === 'VALID' && (row.match_status === 'MATCHED' || row.match_status === 'MATCHED_MANUAL') && !row.queue_id);
    const queueBlockedRows = rows.filter((row) => !queueEligibleRows.includes(row) && !row.queue_id);
    return {
      importId,
      totalRows: rows.length,
      matchedRows: rows.filter((row) => row.match_status === 'MATCHED').length,
      manuallyMatchedRows: rows.filter((row) => row.match_status === 'MATCHED_MANUAL').length,
      unmatchedRows: rows.filter((row) => row.match_status === 'UNMATCHED').length,
      multipleMatchRows: rows.filter((row) => row.match_status === 'MULTIPLE_MATCHES').length,
      invalidRows: rows.filter((row) => row.validation_status === 'INVALID').length,
      excludedRows: rows.filter((row) => row.match_status === 'EXCLUDED').length,
      queueEligibleRows: queueEligibleRows.length,
      queueBlockedRows: queueBlockedRows.length,
      queueCreatedRows: rows.filter((row) => row.queue_id).length,
      statusKo: queueEligibleRows.length > 0 ? 'Queue 생성 가능' : rows.some((row) => row.match_status === 'UNMATCHED' || row.match_status === 'MULTIPLE_MATCHES') ? '매칭 필요' : rows.some((row) => row.validation_status === 'INVALID') ? '검증 오류' : '제외됨'
    };
  }

  function createImportReport(importId) {
    const detail = getPriceImportDetail(importId);
    if (!detail) throw new Error('가져오기 이력을 찾을 수 없습니다.');
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, `RC_0_3_0_PRICE_WORKBOOK_IMPORT_REPORT_${importId}.md`);
    const lines = [
      '# RC-0.3.0 단가표 일괄 가져오기 리포트',
      '',
      `- import_id: ${importId}`,
      `- 유형: ${IMPORT_TYPE_LABELS[detail.import.import_type] || detail.import.import_type}`,
      `- 파일: ${detail.import.file_name}`,
      `- 전체 행: ${detail.import.row_count}`,
      `- 정상 행: ${detail.import.valid_count}`,
      `- 매칭 행: ${detail.import.matched_count}`,
      `- 미매칭/확인 필요: ${detail.import.unmatched_count}`,
      `- 승인 대기 생성: ${detail.import.queue_created_count}`,
      '',
      '가져온 단가는 마스터 데이터에 직접 반영되지 않았습니다. 실제 단가 보정 센터에서 승인 및 백업 후 반영하세요.'
    ];
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return { importId, reportPath };
  }

  function validateImportedPriceRowsPublic(rows) {
    return validateImportedPriceRows(rows);
  }

  return {
    parsePriceWorkbook,
    parseCSV,
    parseXLSX,
    normalizeImportedRows,
    inferColumnMapping,
    previewPriceImport,
    matchImportedRowsToMasterData,
    createPriceUpdateQueueFromImport,
    searchPriceImportMatchCandidates,
    manuallyMatchImportRow,
    clearImportRowMatch,
    excludeImportRow,
    getUnmatchedImportRows,
    getMultipleMatchImportRows,
    recalculateImportRowVariance,
    getImportQueueReadiness,
    getPriceImportHistory,
    getPriceImportDetail,
    validateImportedPriceRows: validateImportedPriceRowsPublic,
    createImportReport
  };
}

module.exports = {
  createPriceWorkbookImportService,
  parseCSV,
  parseXLSX,
  parsePriceWorkbook,
  inferColumnMapping,
  normalizeImportedRows,
  validateImportedPriceRows,
  calculatePriceVariance
};
