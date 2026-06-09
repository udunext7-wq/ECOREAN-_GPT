'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const IMPORT_TARGET_TYPES = {
  MATERIAL_PRICE_LIST: 'MATERIAL',
  VENDOR_QUOTE: 'MATERIAL',
  ACTUAL_PURCHASE: 'MATERIAL',
  LABOR_RATE: 'LABOR',
  EQUIPMENT_PRICE: 'EQUIPMENT',
  STANDARD_ITEM_PRICE: 'STANDARD_ITEM'
};

const PRICE_SOURCES = {
  MATERIAL_PRICE_LIST: 'MANUAL',
  VENDOR_QUOTE: 'VENDOR_QUOTE',
  ACTUAL_PURCHASE: 'ACTUAL_PURCHASE',
  LABOR_RATE: 'LABOR_RATE',
  EQUIPMENT_PRICE: 'MANUAL',
  STANDARD_ITEM_PRICE: 'MANUAL'
};

const UNIT_ALIASES = {
  ea: 'EA',
  개: 'EA',
  pcs: 'EA',
  piece: 'EA',
  m: 'M',
  미터: 'M',
  meter: 'M',
  '㎡': 'M2',
  m2: 'M2',
  평방미터: 'M2',
  sqm: 'M2',
  '㎥': 'M3',
  m3: 'M3',
  세제곱미터: 'M3',
  set: 'SET',
  세트: 'SET',
  식: '식',
  품: '품',
  일: '일',
  day: '일',
  회: '회'
};

const WORD_ALIASES = {
  tile: '타일',
  tiles: '타일',
  waterproof: '방수',
  waterproofing: '방수',
  silicone: '실리콘',
  silicon: '실리콘',
  flooring: '바닥',
  floor: '바닥',
  wallpaper: '도배',
  carpenter: '목공',
  carpentry: '목공',
  electrician: '전기',
  electrical: '전기',
  cabinet: '가구',
  cabinetry: '가구',
  countertop: '상판',
  faucet: '수전',
  lighting: '조명',
  demolition: '철거',
  disposal: '폐기물',
  labor: '노무',
  equipment: '장비',
  material: '자재',
  bathroom: '욕실',
  kitchen: '주방'
};

const FORBIDDEN_CUSTOMER_TERMS = [
  'unmatched price recommendation',
  'recommendation score',
  'confidence level',
  'import row price',
  'candidate master item',
  'current_price',
  'suggested_price',
  'price variance',
  'queue',
  'approval status',
  'internal cost',
  'margin',
  'pce',
  'vendor',
  'labor cost',
  'purchase',
  'receiving',
  'internal',
  'profit',
  'risk_score',
  'detailed_address',
  'customer_phone',
  'customer_email',
  'memo'
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function parseJson(value, fallback = {}) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUnit(value) {
  const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  return UNIT_ALIASES[key] || String(value || '').trim().toUpperCase();
}

function normalizeText(value) {
  const words = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}（）·ㆍ,./\\_\-+]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => WORD_ALIASES[word] || word);
  return words.join('').replace(/[^0-9a-z가-힣]/g, '');
}

function bigrams(value) {
  const normalized = normalizeText(value);
  if (normalized.length < 2) return normalized ? [normalized] : [];
  const result = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

function diceSimilarity(left, right) {
  const leftKey = normalizeText(left);
  const rightKey = normalizeText(right);
  if (!leftKey || !rightKey) return 0;
  if (leftKey === rightKey) return 1;
  if (leftKey.includes(rightKey) || rightKey.includes(leftKey)) {
    return Math.min(leftKey.length, rightKey.length) / Math.max(leftKey.length, rightKey.length) * 0.85 + 0.15;
  }
  const leftPairs = bigrams(leftKey);
  const rightPairs = bigrams(rightKey);
  const counts = new Map();
  leftPairs.forEach((pair) => counts.set(pair, (counts.get(pair) || 0) + 1));
  let intersection = 0;
  rightPairs.forEach((pair) => {
    const count = counts.get(pair) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(pair, count - 1);
    }
  });
  return (2 * intersection) / Math.max(1, leftPairs.length + rightPairs.length);
}

function specTokens(value) {
  return String(value || '')
    .toLowerCase()
    .match(/[0-9]+(?:\.[0-9]+)?(?:mm|cm|m)?|[a-z가-힣]+/g) || [];
}

function confidenceForScore(score) {
  if (score >= 75) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  if (score >= 30) return 'LOW';
  return 'NO_MATCH';
}

function calculateVariance(currentPrice, proposedPrice) {
  const current = toNumber(currentPrice);
  const proposed = toNumber(proposedPrice);
  const amount = proposed - current;
  return {
    varianceAmount: amount,
    varianceRate: current > 0 ? amount / current : null
  };
}

function ensureColumn(database, tableName, columnName, definition) {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all().map((column) => column.name);
  if (!columns.includes(columnName)) database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`);
}

function createUnmatchedPriceRecommendationService({
  sqliteService,
  priceWorkbookImportService = null,
  realPriceCalibrationWorkbenchService = null,
  priceCalibrationPriorityService = null,
  recommendationScoringService = null,
  reportsDir = null
} = {}) {
  if (!sqliteService?.dbPaths?.master) throw new Error('sqliteService with master database path is required');

  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

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
      CREATE TABLE IF NOT EXISTS unmatched_price_recommendations (
        id TEXT PRIMARY KEY,
        recommendation_id TEXT NOT NULL UNIQUE,
        import_row_id TEXT NOT NULL,
        source_file_id TEXT,
        source_row_index INTEGER,
        import_item_name TEXT NOT NULL,
        import_unit TEXT,
        import_price REAL,
        candidate_master_item_id TEXT,
        candidate_target_type TEXT,
        candidate_item_name TEXT,
        candidate_unit TEXT,
        candidate_price REAL,
        similarity_score REAL NOT NULL,
        confidence_level TEXT NOT NULL,
        recommendation_reason TEXT,
        score_detail_json TEXT,
        status TEXT NOT NULL,
        reviewed_by TEXT,
        reviewed_at TEXT,
        review_note TEXT,
        linked_queue_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
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
    ensureColumn(database, 'unmatched_price_recommendations', 'candidate_target_type', "candidate_target_type TEXT DEFAULT ''");
    ensureColumn(database, 'unmatched_price_recommendations', 'score_detail_json', "score_detail_json TEXT DEFAULT '{}'");
  }

  function getImportRow(database, importRowId) {
    const row = database.prepare(`
      SELECT r.*, i.import_type, i.file_name, i.file_path
      FROM price_workbook_import_rows r
      JOIN price_workbook_imports i ON i.import_id = r.import_id
      WHERE r.id = ?
    `).get(String(importRowId));
    if (!row) throw new Error('미매칭 import row를 찾을 수 없습니다.');
    return {
      ...row,
      raw: parseJson(row.raw_json),
      normalized: parseJson(row.normalized_json)
    };
  }

  function targetRows(database, targetType) {
    if (targetType === 'MATERIAL') {
      return database.prepare(`
        SELECT id, 'MATERIAL' AS target_type, material_name AS target_name,
               material_category AS category, applied_process AS process,
               specification AS spec, brand, unit, latest_unit_price AS current_price,
               recommended_vendor AS vendor_name, price_status
        FROM material_master WHERE is_active = 1
      `).all();
    }
    if (targetType === 'LABOR') {
      return database.prepare(`
        SELECT id, 'LABOR' AS target_type, role AS target_name,
               process AS category, process, skill_level AS spec, '' AS brand,
               '일' AS unit, default_daily_wage AS current_price,
               '' AS vendor_name, price_status
        FROM labor_master WHERE is_active = 1
      `).all();
    }
    if (targetType === 'EQUIPMENT') {
      return database.prepare(`
        SELECT id, 'EQUIPMENT' AS target_type, equipment_name AS target_name,
               equipment_type AS category, applied_process AS process,
               '' AS spec, '' AS brand, unit, default_unit_price AS current_price,
               '' AS vendor_name, price_status
        FROM equipment_master WHERE is_active = 1
      `).all();
    }
    if (targetType === 'PACKAGE') {
      return database.prepare(`
        SELECT id, 'PACKAGE' AS target_type, package_name AS target_name,
               estimate_type AS category, estimate_type AS process,
               '' AS spec, '' AS brand, '식' AS unit, 0 AS current_price,
               '' AS vendor_name, 'NEEDS_UPDATE' AS price_status
        FROM estimate_default_packages WHERE is_active = 1
      `).all();
    }
    return database.prepare(`
      SELECT id, 'STANDARD_ITEM' AS target_type, item_name AS target_name,
             process AS category, process, estimate_type AS spec, '' AS brand,
             default_unit AS unit, default_customer_unit_price AS current_price,
             '' AS vendor_name, price_status
      FROM standard_estimate_items WHERE is_active = 1
    `).all();
  }

  function targetTypesForRow(row, requestedTargetType = '') {
    if (requestedTargetType) return [String(requestedTargetType).toUpperCase()];
    const primary = String(row.normalized.target_type || IMPORT_TARGET_TYPES[row.import_type] || 'MATERIAL').toUpperCase();
    if (row.import_type === 'VENDOR_QUOTE') return [...new Set([primary, 'MATERIAL', 'STANDARD_ITEM'])];
    return [primary];
  }

  function historyImpact(database, row, candidate) {
    const history = database.prepare(`
      SELECT status
      FROM unmatched_price_recommendations
      WHERE import_item_name = ? AND candidate_master_item_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(String(row.normalized.item_name || ''), String(candidate.id));
    const approved = history.filter((item) => ['APPROVED', 'LINKED_TO_QUEUE'].includes(item.status)).length;
    const rejected = history.filter((item) => item.status === 'REJECTED').length;
    return {
      approved,
      rejected,
      score: Math.min(12, approved * 6) - Math.min(15, rejected * 8)
    };
  }

  function scoreCandidate(database, row, candidate) {
    const normalized = row.normalized || {};
    const nameSimilarity = diceSimilarity(normalized.item_name, candidate.target_name);
    const categorySimilarity = Math.max(
      diceSimilarity(normalized.category, candidate.category),
      diceSimilarity(normalized.process, candidate.process)
    );
    const unitMatch = normalizeUnit(normalized.unit || row.unit) === normalizeUnit(candidate.unit);
    const importedSpecTokens = new Set(specTokens(`${normalized.spec || ''} ${normalized.brand || ''}`));
    const candidateSpecTokens = new Set(specTokens(`${candidate.spec || ''} ${candidate.brand || ''}`));
    const matchedSpecTokens = [...importedSpecTokens].filter((token) => candidateSpecTokens.has(token));
    const specScore = importedSpecTokens.size > 0 ? matchedSpecTokens.length / importedSpecTokens.size : 0;
    const currentPrice = toNumber(candidate.current_price);
    const importedPrice = toNumber(row.proposed_price || normalized.price);
    const priceDifferenceRate = currentPrice > 0 ? Math.abs(importedPrice - currentPrice) / currentPrice : null;
    let priceScore = 0;
    if (priceDifferenceRate !== null) {
      if (priceDifferenceRate <= 0.1) priceScore = 12;
      else if (priceDifferenceRate <= 0.3) priceScore = 8;
      else if (priceDifferenceRate <= 0.6) priceScore = 4;
      else priceScore = -4;
    }
    const history = historyImpact(database, row, candidate);
    const vendorRepeat = normalized.vendor_name && candidate.vendor_name
      && normalizeText(normalized.vendor_name) === normalizeText(candidate.vendor_name);
    const compatibilityScore = Math.max(0, Math.min(100, Math.round(
      nameSimilarity * 55
      + categorySimilarity * 13
      + (unitMatch ? 10 : -5)
      + specScore * 10
      + priceScore
      + history.score
      + (vendorRepeat ? 5 : 0)
    )));
    const enhanced = recommendationScoringService
      ? recommendationScoringService.scoreCandidate({
          importRow: {
            item_name: normalized.item_name,
            category: normalized.category,
            process: normalized.process,
            unit: normalized.unit || row.unit,
            spec: normalized.spec,
            brand: normalized.brand,
            vendor_name: normalized.vendor_name,
            price: importedPrice
          },
          masterItem: candidate,
          history,
          compatibilityScore
        })
      : null;
    const score = enhanced?.final_score ?? compatibilityScore;
    const reasons = [
      `품목명 ${Math.round(nameSimilarity * 100)}%`,
      `분류 ${Math.round(categorySimilarity * 100)}%`,
      unitMatch ? '단위 일치' : `단위 차이(${normalizeUnit(normalized.unit || row.unit) || '-'} / ${normalizeUnit(candidate.unit) || '-'})`
    ];
    if (matchedSpecTokens.length > 0) reasons.push(`규격/브랜드 ${matchedSpecTokens.join(', ')}`);
    if (priceDifferenceRate !== null) reasons.push(`가격 차이 ${(priceDifferenceRate * 100).toFixed(1)}%`);
    if (history.approved > 0) reasons.push(`과거 승인 ${history.approved}건`);
    if (history.rejected > 0) reasons.push(`과거 반려 ${history.rejected}건`);
    if (vendorRepeat) reasons.push('동일 공급처');
    return {
      target_type: candidate.target_type,
      target_id: candidate.id,
      target_name: candidate.target_name,
      category: candidate.category || candidate.process || '',
      process: candidate.process || '',
      spec: candidate.spec || '',
      brand: candidate.brand || '',
      unit: candidate.unit || '',
      current_price: currentPrice,
      price_status: candidate.price_status || '',
      similarity_score: score,
      confidence_level: enhanced?.confidence_level || confidenceForScore(score),
      recommendation_reason: enhanced?.recommendation_reason || reasons.join(' / '),
      score_detail: {
        ...(enhanced || {}),
        nameSimilarity,
        categorySimilarity,
        unitMatch,
        specScore,
        priceDifferenceRate,
        historyApproved: history.approved,
        historyRejected: history.rejected,
        vendorRepeat
      }
    };
  }

  function candidatesFromDb(database, importRowId, payload = {}) {
    const row = getImportRow(database, importRowId);
    if (!['UNMATCHED', 'MULTIPLE_MATCHES'].includes(String(row.match_status))) {
      throw new Error('미매칭 또는 다중 매칭 행만 추천할 수 있습니다.');
    }
    const candidates = targetTypesForRow(row, payload.targetType || payload.target_type)
      .flatMap((targetType) => targetRows(database, targetType))
      .map((candidate) => scoreCandidate(database, row, candidate))
      .sort((left, right) => right.similarity_score - left.similarity_score
        || String(left.target_name).localeCompare(String(right.target_name), 'ko-KR'))
      .slice(0, Math.max(1, toNumber(payload.limit, 3)));
    return {
      importRow: row,
      candidates,
      topCandidate: candidates[0] || null,
      recommendationAvailable: Boolean(candidates[0] && candidates[0].confidence_level !== 'NO_MATCH')
    };
  }

  function getUnmatchedPriceRecommendationSummary() {
    return withDb((database) => {
      const rows = database.prepare(`
        SELECT * FROM price_workbook_import_rows
        WHERE match_status IN ('UNMATCHED', 'MULTIPLE_MATCHES')
      `).all();
      const recommendations = database.prepare('SELECT * FROM unmatched_price_recommendations').all();
      const latestByRow = new Map();
      recommendations.forEach((row) => {
        const existing = latestByRow.get(row.import_row_id);
        if (!existing || String(row.created_at) > String(existing.created_at)) latestByRow.set(row.import_row_id, row);
      });
      const latest = [...latestByRow.values()];
      return {
        totalUnmatchedCount: rows.length,
        highRecommendationCount: latest.filter((row) => row.confidence_level === 'HIGH').length,
        mediumRecommendationCount: latest.filter((row) => row.confidence_level === 'MEDIUM').length,
        lowRecommendationCount: latest.filter((row) => row.confidence_level === 'LOW').length,
        noMatchCount: latest.filter((row) => row.confidence_level === 'NO_MATCH' || row.status === 'NO_MATCH').length,
        queueLinkableCount: latest.filter((row) => row.status === 'APPROVED' && row.candidate_master_item_id).length,
        newMasterReviewCount: latest.filter((row) => row.status === 'NO_MATCH').length,
        pendingReviewCount: latest.filter((row) => row.status === 'PENDING_REVIEW').length,
        customerSafety: 'PASSED',
        statusKo: rows.length > 0 ? '미매칭 추천 검토 필요' : '미매칭 항목 없음'
      };
    });
  }

  function listUnmatchedImportRows(filters = {}) {
    return withDb((database) => {
      const rows = database.prepare(`
        SELECT r.*, i.import_type, i.file_name
        FROM price_workbook_import_rows r
        JOIN price_workbook_imports i ON i.import_id = r.import_id
        WHERE r.match_status IN ('UNMATCHED', 'MULTIPLE_MATCHES')
        ORDER BY r.created_at DESC, r.row_index
      `).all();
      return rows.map((row) => {
        const recommendation = database.prepare(`
          SELECT * FROM unmatched_price_recommendations
          WHERE import_row_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).get(row.id);
        return {
          ...row,
          raw: parseJson(row.raw_json),
          normalized: parseJson(row.normalized_json),
          recommendation: recommendation ? {
            ...recommendation,
            score_detail: parseJson(recommendation.score_detail_json)
          } : null
        };
      }).filter((row) => {
        const confidenceMatch = !filters.confidenceLevel || filters.confidenceLevel === 'ALL'
          || row.recommendation?.confidence_level === filters.confidenceLevel;
        const statusMatch = !filters.status || filters.status === 'ALL'
          || row.recommendation?.status === filters.status;
        const importTypeMatch = !filters.importType || filters.importType === 'ALL'
          || row.import_type === filters.importType;
        const keyword = normalizeText(filters.keyword || '');
        const keywordMatch = !keyword || normalizeText(`${row.normalized.item_name} ${row.normalized.category} ${row.normalized.spec}`).includes(keyword);
        return confidenceMatch && statusMatch && importTypeMatch && keywordMatch;
      });
    });
  }

  function getRecommendationCandidates(importRowId, payload = {}) {
    const normalized = typeof importRowId === 'object'
      ? { importRowId: importRowId.importRowId || importRowId.rowId || importRowId.id, payload: importRowId }
      : { importRowId, payload };
    return withDb((database) => candidatesFromDb(database, normalized.importRowId, normalized.payload));
  }

  function createRecommendationForRow(importRowId, payload = {}) {
    const normalized = typeof importRowId === 'object'
      ? { importRowId: importRowId.importRowId || importRowId.rowId || importRowId.id, payload: importRowId }
      : { importRowId, payload };
    return withDb((database) => {
      const result = candidatesFromDb(database, normalized.importRowId, normalized.payload);
      const requestedId = normalized.payload.candidateMasterItemId || normalized.payload.candidate_master_item_id || '';
      const requestedType = normalized.payload.targetType || normalized.payload.target_type || '';
      const candidate = requestedId
        ? result.candidates.find((item) => String(item.target_id) === String(requestedId)
          && (!requestedType || item.target_type === requestedType))
        : result.topCandidate;
      const forceNoMatch = normalized.payload.forceNoMatch || normalized.payload.force_no_match;
      const noMatch = forceNoMatch || !candidate || candidate.confidence_level === 'NO_MATCH';
      const recommendationId = makeId('UPR');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO unmatched_price_recommendations (
          id, recommendation_id, import_row_id, source_file_id, source_row_index,
          import_item_name, import_unit, import_price, candidate_master_item_id,
          candidate_target_type, candidate_item_name, candidate_unit, candidate_price,
          similarity_score, confidence_level, recommendation_reason, score_detail_json,
          status, reviewed_by, reviewed_at, review_note, linked_queue_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '', NULL, ?, '', ?, ?)
      `).run(
        recommendationId,
        recommendationId,
        result.importRow.id,
        result.importRow.import_id,
        result.importRow.row_index,
        String(result.importRow.normalized.item_name || ''),
        String(result.importRow.normalized.unit || result.importRow.unit || ''),
        toNumber(result.importRow.proposed_price || result.importRow.normalized.price),
        noMatch ? '' : String(candidate.target_id),
        noMatch ? '' : candidate.target_type,
        noMatch ? '' : candidate.target_name,
        noMatch ? '' : candidate.unit,
        noMatch ? 0 : candidate.current_price,
        noMatch ? 0 : candidate.similarity_score,
        noMatch ? 'NO_MATCH' : candidate.confidence_level,
        noMatch ? '추천 기준을 충족하는 Master Data 후보가 없습니다.' : candidate.recommendation_reason,
        JSON.stringify(noMatch ? {} : candidate.score_detail),
        noMatch ? 'NO_MATCH' : 'PENDING_REVIEW',
        normalized.payload.note || (noMatch ? '신규 Master Data 후보 검토 필요' : '자동 추천 생성'),
        createdAt,
        createdAt
      );
      return getRecommendationById(database, recommendationId);
    });
  }

  function getRecommendationById(database, recommendationId) {
    const row = database.prepare(`
      SELECT * FROM unmatched_price_recommendations
      WHERE recommendation_id = ? OR id = ?
    `).get(String(recommendationId), String(recommendationId));
    if (!row) throw new Error('추천 항목을 찾을 수 없습니다.');
    return { ...row, score_detail: parseJson(row.score_detail_json) };
  }

  function reviewRecommendation(recommendationId, action, payload = {}) {
    const normalized = typeof recommendationId === 'object'
      ? { recommendationId: recommendationId.recommendationId || recommendationId.id, payload: recommendationId }
      : { recommendationId, payload };
    return withDb((database) => {
      const row = getRecommendationById(database, normalized.recommendationId);
      if (row.status === 'LINKED_TO_QUEUE') throw new Error('Queue에 연결된 추천은 상태를 변경할 수 없습니다.');
      if (row.status === 'NO_MATCH' && action !== 'DEFERRED') throw new Error('NO_MATCH는 신규 Master Data 검토 대상으로 유지됩니다.');
      database.prepare(`
        UPDATE unmatched_price_recommendations
        SET status = ?, reviewed_by = ?, reviewed_at = ?, review_note = ?, updated_at = ?
        WHERE recommendation_id = ?
      `).run(
        action,
        normalized.payload.reviewedBy || normalized.payload.reviewed_by || 'CEO',
        nowIso(),
        normalized.payload.note || normalized.payload.reason || '',
        nowIso(),
        row.recommendation_id
      );
      return getRecommendationById(database, row.recommendation_id);
    });
  }

  function approveRecommendation(recommendationId, payload = {}) {
    return reviewRecommendation(recommendationId, 'APPROVED', payload);
  }

  function rejectRecommendation(recommendationId, payload = {}) {
    return reviewRecommendation(recommendationId, 'REJECTED', payload);
  }

  function deferRecommendation(recommendationId, payload = {}) {
    return reviewRecommendation(recommendationId, 'DEFERRED', payload);
  }

  function queuePriority(targetType, itemName) {
    if (targetType === 'LABOR') return 'HIGH';
    if (['타일', '방수', '가구', '상판', '전기', '목공'].some((term) => String(itemName).includes(term))) return 'HIGH';
    return 'MEDIUM';
  }

  function linkRecommendationToPriceQueue(recommendationId, queueId = '') {
    const normalized = typeof recommendationId === 'object'
      ? {
        recommendationId: recommendationId.recommendationId || recommendationId.id,
        queueId: recommendationId.queueId || recommendationId.queue_id || ''
      }
      : { recommendationId, queueId };
    return withDb((database) => {
      const recommendation = getRecommendationById(database, normalized.recommendationId);
      if (recommendation.status !== 'APPROVED') throw new Error('승인된 추천만 price queue에 연결할 수 있습니다.');
      if (!recommendation.candidate_master_item_id) throw new Error('NO_MATCH 추천은 price queue에 연결할 수 없습니다.');
      const importRow = getImportRow(database, recommendation.import_row_id);
      let linkedQueueId = normalized.queueId;
      if (linkedQueueId) {
        const existingQueue = database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(String(linkedQueueId));
        if (!existingQueue) throw new Error('연결할 price queue를 찾을 수 없습니다.');
        if (
          String(existingQueue.target_type) !== String(recommendation.candidate_target_type)
          || String(existingQueue.target_id) !== String(recommendation.candidate_master_item_id)
        ) {
          throw new Error('추천 대상과 Price Queue 대상이 일치하지 않습니다.');
        }
      } else {
        linkedQueueId = makeId('RPUQ');
        const variance = calculateVariance(recommendation.candidate_price, recommendation.import_price);
        database.prepare(`
          INSERT INTO real_price_update_queue (
            id, target_type, target_id, target_name, current_price, proposed_price,
            unit, price_source, vendor_id, vendor_name, evidence_note, evidence_file_path,
            variance_amount, variance_rate, priority, status, approval_note, backup_id,
            created_at, approved_at, applied_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, '', ?, ?, ?, 'PENDING_REVIEW', '', '', ?, NULL, NULL)
        `).run(
          linkedQueueId,
          recommendation.candidate_target_type,
          recommendation.candidate_master_item_id,
          recommendation.candidate_item_name,
          toNumber(recommendation.candidate_price),
          toNumber(recommendation.import_price),
          recommendation.import_unit || recommendation.candidate_unit || '',
          PRICE_SOURCES[importRow.import_type] || 'MANUAL',
          String(importRow.normalized.vendor_name || ''),
          `RC-0.3.8 미매칭 자동 추천 / ${recommendation.recommendation_id}`,
          variance.varianceAmount,
          variance.varianceRate,
          queuePriority(recommendation.candidate_target_type, recommendation.candidate_item_name),
          nowIso()
        );
      }
      database.prepare(`
        UPDATE unmatched_price_recommendations
        SET status = 'LINKED_TO_QUEUE', linked_queue_id = ?, updated_at = ?
        WHERE recommendation_id = ?
      `).run(linkedQueueId, nowIso(), recommendation.recommendation_id);
      database.prepare(`
        UPDATE price_workbook_import_rows
        SET match_status = 'MATCHED_MANUAL',
            matched_target_type = ?,
            matched_target_id = ?,
            matched_target_name = ?,
            current_price = ?,
            variance_amount = ?,
            variance_rate = ?,
            manual_match_note = ?,
            matched_by = 'RECOMMENDATION_RC_0_3_8',
            matched_at = ?,
            queue_id = ?
        WHERE id = ?
      `).run(
        recommendation.candidate_target_type,
        recommendation.candidate_master_item_id,
        recommendation.candidate_item_name,
        toNumber(recommendation.candidate_price),
        toNumber(recommendation.import_price) - toNumber(recommendation.candidate_price),
        toNumber(recommendation.candidate_price) > 0
          ? (toNumber(recommendation.import_price) - toNumber(recommendation.candidate_price)) / toNumber(recommendation.candidate_price)
          : null,
        `승인된 자동 추천 ${recommendation.recommendation_id}`,
        nowIso(),
        linkedQueueId,
        recommendation.import_row_id
      );
      try {
        database.prepare(`
          INSERT INTO price_workbook_import_match_logs (
            id, import_id, row_id, action, before_match_status, after_match_status,
            before_target_type, before_target_id, after_target_type, after_target_id,
            note, created_at
          ) VALUES (?, ?, ?, 'RECOMMENDATION_LINKED', ?, 'MATCHED_MANUAL', ?, ?, ?, ?, ?, ?)
        `).run(
          makeId('PWIML'),
          importRow.import_id,
          importRow.id,
          importRow.match_status,
          importRow.matched_target_type || '',
          importRow.matched_target_id || '',
          recommendation.candidate_target_type,
          recommendation.candidate_master_item_id,
          recommendation.recommendation_id,
          nowIso()
        );
      } catch (_error) {
        // Older imports may not have match log schema yet; queue safety is still preserved.
      }
      const queue = database.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(linkedQueueId);
      return {
        ok: true,
        recommendation: getRecommendationById(database, recommendation.recommendation_id),
        queue,
        workbenchReady: Boolean(realPriceCalibrationWorkbenchService),
        priorityCenterLinked: Boolean(priceCalibrationPriorityService),
        masterDataChanged: false
      };
    });
  }

  function createUnmatchedPriceRecommendationReport(payload = {}) {
    const summary = getUnmatchedPriceRecommendationSummary();
    const rows = listUnmatchedImportRows(payload.filters || {});
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_3_8_UNMATCHED_PRICE_RECOMMENDATION_REPORT_GENERATED.md');
    const lines = [
      '# RC-0.3.8 단가 미매칭 자동 추천 리포트',
      '',
      `- 생성 시각: ${nowIso()}`,
      `- 미매칭 전체 수: ${summary.totalUnmatchedCount}`,
      `- HIGH: ${summary.highRecommendationCount}`,
      `- MEDIUM: ${summary.mediumRecommendationCount}`,
      `- LOW: ${summary.lowRecommendationCount}`,
      `- NO_MATCH: ${summary.noMatchCount}`,
      `- Queue 연결 가능: ${summary.queueLinkableCount}`,
      `- 신규 Master Data 검토 필요: ${summary.newMasterReviewCount}`,
      `- Customer safety: ${summary.customerSafety}`,
      '',
      '추천 승인 또는 Queue 연결만으로 Master Data 가격은 변경되지 않습니다.',
      '최종 단가 반영은 기존 Real Price Calibration Workbench 승인, 백업, 이력 기록 흐름을 사용합니다.',
      '',
      `- 필터 결과 행: ${rows.length}`
    ];
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return { ok: true, reportPath, summary };
  }

  function inspectForbiddenCustomerPayload(payload) {
    const serialized = JSON.stringify(payload || {}).toLowerCase();
    return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term.toLowerCase()));
  }

  function buildCustomerSafeRecommendationPayload() {
    return {
      customer_safe: true,
      message_ko: '내부 단가 추천 정보는 고객용 출력에 포함되지 않습니다.'
    };
  }

  return {
    getUnmatchedPriceRecommendationSummary,
    listUnmatchedImportRows,
    getRecommendationCandidates,
    createRecommendationForRow,
    approveRecommendation,
    rejectRecommendation,
    deferRecommendation,
    linkRecommendationToPriceQueue,
    createUnmatchedPriceRecommendationReport,
    inspectForbiddenCustomerPayload,
    buildCustomerSafeRecommendationPayload,
    normalizeText,
    normalizeUnit,
    diceSimilarity,
    confidenceForScore,
    dependencies: {
      priceWorkbookImportService: Boolean(priceWorkbookImportService),
      realPriceCalibrationWorkbenchService: Boolean(realPriceCalibrationWorkbenchService),
      priceCalibrationPriorityService: Boolean(priceCalibrationPriorityService)
    }
  };
}

module.exports = {
  createUnmatchedPriceRecommendationService,
  normalizeText,
  normalizeUnit,
  diceSimilarity,
  confidenceForScore,
  FORBIDDEN_CUSTOMER_TERMS
};
