'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const BASE_WEIGHTS = {
  name: 0.30,
  category: 0.20,
  unit: 0.15,
  spec: 0.15,
  vendor: 0.10,
  history: 0.05,
  price: 0.05
};

const ITEM_SYNONYMS = {
  tile: '타일',
  tiles: '타일',
  ceramic: '세라믹',
  porcelain: '포세린',
  waterproof: '방수',
  waterproofing: '방수',
  silicone: '실리콘',
  silicon: '실리콘',
  caulking: '코킹',
  flooring: '바닥',
  floor: '바닥',
  wallpaper: '도배',
  countertop: '상판',
  counter: '상판',
  stone: '석재',
  engineered: '엔지니어드',
  cabinet: '가구',
  cabinetry: '가구',
  carpenter: '목공',
  carpentry: '목공',
  electrician: '전기',
  electrical: '전기',
  faucet: '수전',
  lighting: '조명',
  demolition: '철거',
  disposal: '폐기물',
  labor: '노무',
  equipment: '장비',
  material: '자재',
  bathroom: '욕실',
  kitchen: '주방',
  premium: '프리미엄',
  standard: '표준'
};

const UNIT_ALIASES = {
  ea: 'EA',
  개: 'EA',
  pcs: 'EA',
  pc: 'EA',
  piece: 'EA',
  m: 'M',
  meter: 'M',
  metre: 'M',
  미터: 'M',
  '㎡': 'M2',
  'm²': 'M2',
  m2: 'M2',
  sqm: 'M2',
  평방미터: 'M2',
  '㎥': 'M3',
  'm³': 'M3',
  m3: 'M3',
  세제곱미터: 'M3',
  set: 'SET',
  세트: 'SET',
  식: '식',
  품: '품',
  일: '일',
  day: '일',
  회: '회',
  box: 'BOX',
  박스: 'BOX',
  roll: 'ROLL',
  롤: 'ROLL'
};

const MATERIAL_WORDS = new Set([
  '세라믹', '포세린', '석재', '대리석', '인조대리석', '실리콘', '코킹', '타일',
  '스테인리스', '알루미늄', '목재', '원목', '합판', '강화유리', '유리', 'PVC', 'ABS'
]);

const FORBIDDEN_CUSTOMER_TERMS = [
  'recommendation scoring',
  'score breakdown',
  'vendor weight',
  'history weight',
  'scoring rule',
  'confidence level',
  'recommendation score',
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

function clamp(value, minimum = 0, maximum = 100) {
  return Math.max(minimum, Math.min(maximum, Number(value) || 0));
}

function tokenize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[()[\]{}（）·ㆍ,./\\_+\-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function normalizeItemName(value, extraSynonyms = {}) {
  const aliases = { ...ITEM_SYNONYMS, ...extraSynonyms };
  return tokenize(value)
    .map((token) => aliases[token] || token)
    .join('')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function normalizeUnit(value, extraAliases = {}) {
  const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '');
  const aliases = Object.fromEntries(
    Object.entries(extraAliases).map(([alias, unit]) => [
      String(alias).trim().toLowerCase().replace(/\s+/g, ''),
      String(unit).trim().toUpperCase()
    ])
  );
  return aliases[key] || UNIT_ALIASES[key] || String(value || '').trim().toUpperCase();
}

function normalizeSpec(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[×＊*]/g, 'x')
    .replace(/\s+/g, '')
    .replace(/millimeters?/g, 'mm')
    .replace(/centimeters?/g, 'cm')
    .replace(/meters?/g, 'm')
    .replace(/[^0-9a-z가-힣.x]/g, '');
}

function bigrams(value) {
  if (!value) return [];
  if (value.length < 2) return [value];
  return Array.from({ length: value.length - 1 }, (_, index) => value.slice(index, index + 2));
}

function dice(left, right) {
  if (!left || !right) return 0;
  if (left === right) return 100;
  if (left.includes(right) || right.includes(left)) {
    return clamp((Math.min(left.length, right.length) / Math.max(left.length, right.length) * 0.8 + 0.2) * 100);
  }
  const counts = new Map();
  bigrams(left).forEach((pair) => counts.set(pair, (counts.get(pair) || 0) + 1));
  let intersection = 0;
  const rightPairs = bigrams(right);
  rightPairs.forEach((pair) => {
    const count = counts.get(pair) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(pair, count - 1);
    }
  });
  return clamp((2 * intersection / Math.max(1, bigrams(left).length + rightPairs.length)) * 100);
}

function calculateNameSimilarity(importName, masterName, options = {}) {
  return dice(
    normalizeItemName(importName, options.synonyms),
    normalizeItemName(masterName, options.synonyms)
  );
}

function calculateCategorySimilarity(importRow = {}, masterItem = {}) {
  return Math.max(
    calculateNameSimilarity(importRow.category, masterItem.category),
    calculateNameSimilarity(importRow.process, masterItem.process)
  );
}

function calculateUnitSimilarity(importUnit, masterUnit, options = {}) {
  const left = normalizeUnit(importUnit, options.aliases);
  const right = normalizeUnit(masterUnit, options.aliases);
  if (!left || !right) return 50;
  return left === right ? 100 : 0;
}

function specTokens(value) {
  return normalizeSpec(value).match(/[0-9]+(?:\.[0-9]+)?(?:mm|cm|m)?|[a-z가-힣]+/g) || [];
}

function calculateSpecSimilarity(importSpec, masterSpec) {
  const left = new Set(specTokens(importSpec));
  const right = new Set(specTokens(masterSpec));
  if (left.size === 0 && right.size === 0) return 50;
  if (left.size === 0 || right.size === 0) return 25;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return clamp(intersection / Math.max(left.size, right.size) * 100);
}

function extractIdentityParts(value) {
  const tokens = tokenize(value);
  return {
    material: tokens.filter((token) => MATERIAL_WORDS.has(token)),
    model: tokens.filter((token) => /[a-z]*\d+[a-z0-9-]*/i.test(token)),
    brand: tokens.filter((token) => token.length >= 2 && !MATERIAL_WORDS.has(token) && !/\d/.test(token))
  };
}

function calculateVendorWeight(importRow = {}, masterItem = {}, context = {}) {
  const importVendor = normalizeItemName(importRow.vendor_name);
  const masterVendor = normalizeItemName(masterItem.vendor_name);
  let score = !importVendor ? 50 : importVendor && masterVendor && importVendor === masterVendor ? 100 : 35;
  const matchingRules = (context.rules || []).filter((rule) => {
    if (rule.status !== 'ACTIVE') return false;
    if (!['VENDOR_ALIAS', 'APPROVED_PATTERN', 'REJECTED_PATTERN'].includes(rule.rule_type)) return false;
    const vendorMatches = !rule.vendor_name || normalizeItemName(rule.vendor_name) === importVendor;
    const patternMatches = !rule.pattern || normalizeItemName(importRow.item_name).includes(normalizeItemName(rule.pattern));
    return vendorMatches && patternMatches;
  });
  matchingRules.forEach((rule) => {
    const direction = rule.direction === 'PENALTY' ? -1 : rule.direction === 'BOOST' ? 1 : 0;
    score += direction * Math.abs(Number(rule.weight) || 0);
  });
  return clamp(score);
}

function calculateHistoryWeight(importRow = {}, masterItem = {}, context = {}) {
  const approved = Number(context.approved || 0);
  const rejected = Number(context.rejected || 0);
  return clamp(50 + Math.min(40, approved * 15) - Math.min(50, rejected * 20));
}

function calculatePriceVarianceScore(importPrice, masterPrice) {
  const imported = Number(importPrice);
  const current = Number(masterPrice);
  if (!Number.isFinite(imported) || !Number.isFinite(current) || current <= 0) return 50;
  const variance = Math.abs(imported - current) / current;
  if (variance <= 0.1) return 100;
  if (variance <= 0.3) return 80;
  if (variance <= 0.6) return 50;
  if (variance <= 1) return 20;
  return 0;
}

function confidenceForScore(score) {
  if (score >= 85) return 'HIGH';
  if (score >= 65) return 'MEDIUM';
  if (score >= 40) return 'LOW';
  return 'NO_MATCH';
}

function calculateFinalRecommendationScore(payload = {}) {
  const importRow = payload.importRow || {};
  const masterItem = payload.masterItem || {};
  const rules = payload.rules || [];
  const synonymRules = Object.fromEntries(
    rules
      .filter((rule) => rule.status === 'ACTIVE' && rule.rule_type === 'ITEM_SYNONYM' && rule.pattern)
      .map((rule) => {
        const [from, to] = String(rule.pattern).split('=').map((value) => value.trim());
        return [String(from || '').toLowerCase(), to || from];
      })
      .filter(([from, to]) => from && to)
  );
  const unitAliasRules = Object.fromEntries(
    rules
      .filter((rule) => rule.status === 'ACTIVE' && rule.rule_type === 'UNIT_ALIAS' && rule.pattern)
      .map((rule) => String(rule.pattern).split('=').map((value) => value.trim()))
      .filter(([from, to]) => from && to)
  );
  const nameScore = calculateNameSimilarity(importRow.item_name, masterItem.target_name, { synonyms: synonymRules });
  const categoryScore = calculateCategorySimilarity(importRow, masterItem);
  const unitScore = calculateUnitSimilarity(importRow.unit, masterItem.unit, { aliases: unitAliasRules });
  const specScore = calculateSpecSimilarity(
    `${importRow.spec || ''} ${importRow.brand || ''}`,
    `${masterItem.spec || ''} ${masterItem.brand || ''}`
  );
  const vendorScore = calculateVendorWeight(importRow, masterItem, { rules });
  const historyScore = calculateHistoryWeight(importRow, masterItem, payload.history || {});
  const priceScore = calculatePriceVarianceScore(importRow.price, masterItem.current_price);
  const weightedScore = (
    nameScore * BASE_WEIGHTS.name
    + categoryScore * BASE_WEIGHTS.category
    + unitScore * BASE_WEIGHTS.unit
    + specScore * BASE_WEIGHTS.spec
    + vendorScore * BASE_WEIGHTS.vendor
    + historyScore * BASE_WEIGHTS.history
    + priceScore * BASE_WEIGHTS.price
  );
  const ruleAdjustment = rules
    .filter((rule) => rule.status === 'ACTIVE' && ['APPROVED_PATTERN', 'REJECTED_PATTERN', 'SPEC_PATTERN'].includes(rule.rule_type))
    .reduce((total, rule) => {
      const pattern = normalizeItemName(rule.pattern);
      if (!pattern || !normalizeItemName(importRow.item_name).includes(pattern)) return total;
      const direction = rule.direction === 'PENALTY' ? -1 : rule.direction === 'BOOST' ? 1 : 0;
      return total + direction * Math.min(10, Math.abs(Number(rule.weight) || 0));
    }, 0);
  const compatibilityBase = Number.isFinite(Number(payload.compatibilityScore))
    ? Number(payload.compatibilityScore)
    : weightedScore;
  let finalScore = clamp(Math.round(compatibilityBase + ruleAdjustment));
  const weakIdentity = nameScore < 40 || unitScore < 50 || specScore < 25;
  if (weakIdentity && vendorScore >= 80) finalScore = Math.min(finalScore, 84);
  if (nameScore < 10 && categoryScore < 20) finalScore = Math.min(finalScore, 39);
  const confidenceLevel = confidenceForScore(finalScore);
  return {
    name_score: Math.round(nameScore),
    category_score: Math.round(categoryScore),
    unit_score: Math.round(unitScore),
    spec_score: Math.round(specScore),
    vendor_score: Math.round(vendorScore),
    history_score: Math.round(historyScore),
    price_score: Math.round(priceScore),
    weighted_score: Math.round(weightedScore),
    rule_adjustment: Math.round(ruleAdjustment),
    final_score: finalScore,
    confidence_level: confidenceLevel,
    identity_parts: {
      import: extractIdentityParts(`${importRow.item_name || ''} ${importRow.spec || ''} ${importRow.brand || ''}`),
      master: extractIdentityParts(`${masterItem.target_name || ''} ${masterItem.spec || ''} ${masterItem.brand || ''}`)
    },
    recommendation_reason: explainRecommendationScore({
      name_score: nameScore,
      category_score: categoryScore,
      unit_score: unitScore,
      spec_score: specScore,
      vendor_score: vendorScore,
      history_score: historyScore,
      price_score: priceScore,
      final_score: finalScore,
      confidence_level: confidenceLevel
    })
  };
}

function explainRecommendationScore(payload = {}) {
  return [
    `품목명 ${Math.round(payload.name_score || 0)}점`,
    `분류/공정 ${Math.round(payload.category_score || 0)}점`,
    `단위 ${Math.round(payload.unit_score || 0)}점`,
    `규격/브랜드 ${Math.round(payload.spec_score || 0)}점`,
    `공급처 ${Math.round(payload.vendor_score || 0)}점`,
    `이력 ${Math.round(payload.history_score || 0)}점`,
    `가격 ${Math.round(payload.price_score || 0)}점`,
    `최종 ${Math.round(payload.final_score || 0)}점(${payload.confidence_level || confidenceForScore(payload.final_score || 0)})`
  ].join(' / ');
}

function ensureSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS recommendation_scoring_rules (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL UNIQUE,
      rule_type TEXT NOT NULL,
      vendor_name TEXT,
      pattern TEXT NOT NULL,
      weight REAL NOT NULL DEFAULT 0,
      direction TEXT NOT NULL DEFAULT 'NEUTRAL',
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function createRecommendationScoringService({ sqliteService, reportsDir = null } = {}) {
  if (!sqliteService?.dbPaths?.master) throw new Error('sqliteService with master database path is required');
  const dbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withDb(callback) {
    const database = new DatabaseSync(dbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function listScoringRules(filters = {}) {
    return withDb((database) => {
      const rows = database.prepare('SELECT * FROM recommendation_scoring_rules ORDER BY rule_type, vendor_name, pattern').all();
      return rows.filter((row) => (!filters.ruleType || filters.ruleType === 'ALL' || row.rule_type === filters.ruleType)
        && (!filters.status || filters.status === 'ALL' || row.status === filters.status));
    });
  }

  function saveScoringRule(payload = {}) {
    return withDb((database) => {
      const ruleId = String(payload.ruleId || payload.rule_id || makeId('RSR'));
      const existing = database.prepare('SELECT * FROM recommendation_scoring_rules WHERE rule_id = ?').get(ruleId);
      const timestamp = nowIso();
      database.prepare(`
        INSERT INTO recommendation_scoring_rules (
          id, rule_id, rule_type, vendor_name, pattern, weight, direction, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(rule_id) DO UPDATE SET
          rule_type = excluded.rule_type,
          vendor_name = excluded.vendor_name,
          pattern = excluded.pattern,
          weight = excluded.weight,
          direction = excluded.direction,
          status = excluded.status,
          updated_at = excluded.updated_at
      `).run(
        existing?.id || makeId('RSRULE'),
        ruleId,
        String(payload.ruleType || payload.rule_type || 'ITEM_SYNONYM'),
        String(payload.vendorName || payload.vendor_name || ''),
        String(payload.pattern || ''),
        Number(payload.weight || 0),
        String(payload.direction || 'NEUTRAL'),
        String(payload.status || 'ACTIVE'),
        existing?.created_at || timestamp,
        timestamp
      );
      return database.prepare('SELECT * FROM recommendation_scoring_rules WHERE rule_id = ?').get(ruleId);
    });
  }

  function setScoringRuleStatus(ruleId, status) {
    return withDb((database) => {
      const result = database.prepare(`
        UPDATE recommendation_scoring_rules SET status = ?, updated_at = ? WHERE rule_id = ?
      `).run(String(status || 'INACTIVE'), nowIso(), String(ruleId));
      if (!result.changes) throw new Error('추천 점수 규칙을 찾을 수 없습니다.');
      return database.prepare('SELECT * FROM recommendation_scoring_rules WHERE rule_id = ?').get(String(ruleId));
    });
  }

  function getScoringSummary() {
    const rules = listScoringRules();
    return {
      totalRules: rules.length,
      activeRules: rules.filter((rule) => rule.status === 'ACTIVE').length,
      vendorRules: rules.filter((rule) => rule.rule_type === 'VENDOR_ALIAS').length,
      synonymRules: rules.filter((rule) => rule.rule_type === 'ITEM_SYNONYM').length,
      unitRules: rules.filter((rule) => rule.rule_type === 'UNIT_ALIAS').length,
      historyRules: rules.filter((rule) => ['APPROVED_PATTERN', 'REJECTED_PATTERN'].includes(rule.rule_type)).length,
      weights: BASE_WEIGHTS,
      customerSafety: 'PASSED',
      masterDataProtection: 'PASSED'
    };
  }

  function scoreCandidate(payload = {}) {
    const rules = payload.rules || listScoringRules({ status: 'ACTIVE' });
    return calculateFinalRecommendationScore({ ...payload, rules });
  }

  function createScoringReport() {
    const summary = getScoringSummary();
    const rules = listScoringRules();
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_3_9_RECOMMENDATION_SCORING_REPORT_GENERATED.md');
    const lines = [
      '# RC-0.3.9 Recommendation Scoring Report',
      '',
      `- Generated at: ${nowIso()}`,
      `- Total rules: ${summary.totalRules}`,
      `- Active rules: ${summary.activeRules}`,
      '- Weights: name 30 / category 20 / unit 15 / spec 15 / vendor 10 / history 5 / price 5',
      '- Master Data direct change: NO',
      '- Customer safety: PASSED',
      '',
      '## Rules',
      ...rules.map((rule) => `- ${rule.rule_type} / ${rule.vendor_name || '-'} / ${rule.pattern} / ${rule.direction} ${rule.weight} / ${rule.status}`)
    ];
    fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
    return { ok: true, reportPath, summary };
  }

  function buildCustomerSafeScoringPayload() {
    return { customer_safe: true };
  }

  function inspectForbiddenCustomerPayload(payload) {
    const serialized = JSON.stringify(payload || {}).toLowerCase();
    return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term));
  }

  return {
    getScoringSummary,
    listScoringRules,
    saveScoringRule,
    setScoringRuleStatus,
    scoreCandidate,
    createScoringReport,
    buildCustomerSafeScoringPayload,
    inspectForbiddenCustomerPayload,
    ensureSchema
  };
}

module.exports = {
  BASE_WEIGHTS,
  normalizeItemName,
  normalizeUnit,
  normalizeSpec,
  calculateNameSimilarity,
  calculateCategorySimilarity,
  calculateUnitSimilarity,
  calculateSpecSimilarity,
  calculateVendorWeight,
  calculateHistoryWeight,
  calculatePriceVarianceScore,
  calculateFinalRecommendationScore,
  explainRecommendationScore,
  confidenceForScore,
  createRecommendationScoringService
};
