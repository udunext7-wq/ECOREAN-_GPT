'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const VALID_ESTIMATE_TYPES = new Set(['BATHROOM', 'KITCHEN', 'FULL_REMODELING']);
const PRICE_STATUSES = new Set(['READY', 'PARTIAL', 'NEEDS_UPDATE']);
const PCE_DECISIONS = new Set(['GO', 'MODIFY', 'SCALE', 'BLOCK']);
const HIGH_TERMS = ['욕실 타일', '타일', '방수', '도기', '수전', '주방 가구', '상판', '바닥', '도배', '목공', '전기', '철거', '폐기물', '노무'];
const MEDIUM_TERMS = ['조명', '환풍기', '실리콘', '필름', '몰딩', '걸레받이', '욕실장', '싱크볼', '후드'];
const FORBIDDEN_CUSTOMER_TERMS = [
  'price readiness impact',
  'risk_level',
  'fallback price',
  'internal cost',
  'margin',
  'pce',
  'vendor',
  'labor',
  'purchase',
  'receiving',
  'variance',
  'calibration',
  'approval queue',
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

function normalizeEstimateType(value) {
  const normalized = String(value || '').trim().toUpperCase();
  if (!VALID_ESTIMATE_TYPES.has(normalized)) {
    throw new Error(`Unsupported estimate type: ${value}`);
  }
  return normalized;
}

function normalizeReadinessStatus(value) {
  const normalized = String(value || '').trim().toUpperCase();
  return PRICE_STATUSES.has(normalized) ? normalized : 'PARTIAL';
}

function masterEstimateType(estimateType) {
  if (estimateType === 'BATHROOM') return 'bathroom_remodel';
  if (estimateType === 'KITCHEN') return 'kitchen_remodel';
  return 'full_remodel';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function roundMoney(value) {
  return Math.round(toNumber(value, 0));
}

function roundRate(value) {
  return Math.round(toNumber(value, 0) * 10000) / 10000;
}

function classifyPriority(name) {
  const text = String(name || '');
  if (HIGH_TERMS.some((term) => text.includes(term))) return 'HIGH';
  if (MEDIUM_TERMS.some((term) => text.includes(term))) return 'MEDIUM';
  return 'LOW';
}

function inspectForbiddenCustomerPayload(payload) {
  const serialized = JSON.stringify(payload || {}).toLowerCase();
  return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term.toLowerCase()));
}

function createPriceReadinessImpactService({ sqliteService, reportsDir } = {}) {
  if (!sqliteService?.dbPaths?.master) {
    throw new Error('sqliteService with master database path is required');
  }

  const masterDbPath = sqliteService.dbPaths.master;
  const projectDbPath = sqliteService.dbPaths.project || sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');

  function withMasterDb(callback) {
    const database = new DatabaseSync(masterDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function withProjectDb(callback) {
    const database = new DatabaseSync(projectDbPath);
    try {
      ensureSchema(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function ensureSchema(database) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS price_readiness_impact_issues (
        id TEXT PRIMARY KEY,
        estimate_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT,
        description TEXT NOT NULL,
        target_version TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  function readMasterRows(estimateType) {
    return withMasterDb((database) => {
      try {
        return database.prepare(`
          SELECT id, item_name, process, default_unit, default_customer_unit_price,
                 default_material_cost, default_labor_cost, default_subcontract_cost,
                 default_margin_rate, estimate_type, is_mandatory, price_status
          FROM standard_estimate_items
          WHERE estimate_type = ?
          ORDER BY is_mandatory DESC, process, item_name
        `).all(masterEstimateType(estimateType));
      } catch (_error) {
        return [];
      }
    });
  }

  function countNeedsUpdateByPriority(estimateType, statusOverride, scenario = {}) {
    if (statusOverride === 'READY') {
      return { high: 0, medium: 0, low: 0 };
    }
    const explicit = scenario.needs_update_counts || scenario.needsUpdateCounts;
    if (explicit) {
      return {
        high: toNumber(explicit.high ?? explicit.HIGH, 0),
        medium: toNumber(explicit.medium ?? explicit.MEDIUM, 0),
        low: toNumber(explicit.low ?? explicit.LOW, 0)
      };
    }

    const rows = readMasterRows(estimateType).filter((row) => String(row.price_status || '').toUpperCase() === 'NEEDS_UPDATE');
    const counts = { high: 0, medium: 0, low: 0 };
    rows.forEach((row) => {
      const priority = classifyPriority(`${row.item_name} ${row.process}`);
      counts[priority.toLowerCase()] += 1;
    });
    if (statusOverride === 'NEEDS_UPDATE' && counts.high === 0 && counts.medium === 0 && counts.low === 0) {
      return { high: 6, medium: 5, low: 4 };
    }
    return counts;
  }

  function coverageFromRows(estimateType, statusOverride, scenario = {}) {
    const rows = readMasterRows(estimateType);
    const explicit = scenario.coverage || {};
    const totalRows = rows.length || toNumber(explicit.total_line_item_count || explicit.totalLineItemCount, 10);
    const rawCustomerPrice = rows.reduce((sum, row) => sum + toNumber(row.default_customer_unit_price, 0), 0);
    const rawInternalCost = rows.reduce((sum, row) => {
      return sum + toNumber(row.default_material_cost, 0) + toNumber(row.default_labor_cost, 0) + toNumber(row.default_subcontract_cost, 0);
    }, 0);
    const baseCustomerPrice = toNumber(scenario.total_customer_price || scenario.totalCustomerPrice, rawCustomerPrice || 1000000);
    const baseInternalCost = toNumber(scenario.total_internal_cost || scenario.totalInternalCost, rawInternalCost || Math.round(baseCustomerPrice * 0.68));
    const fallbackFromRows = rows.filter((row) => {
      const status = String(row.price_status || '').toUpperCase();
      return status === 'NEEDS_UPDATE' || toNumber(row.default_customer_unit_price, 0) <= 0;
    }).length;

    if (statusOverride === 'READY') {
      return {
        totalRows,
        confirmedLineItemCount: totalRows,
        fallbackLineItemCount: 0,
        estimatedPriceLineItemCount: 0,
        totalCustomerPrice: roundMoney(baseCustomerPrice),
        totalInternalCost: roundMoney(baseInternalCost)
      };
    }

    const fallbackLineItemCount = explicit.fallback_line_item_count ?? explicit.fallbackLineItemCount ?? (
      statusOverride === 'PARTIAL'
        ? Math.max(1, Math.ceil(totalRows * 0.25), Math.min(fallbackFromRows, totalRows))
        : Math.max(1, Math.ceil(totalRows * 0.65), fallbackFromRows)
    );
    const estimatedPriceLineItemCount = explicit.estimated_price_line_item_count ?? explicit.estimatedPriceLineItemCount ?? fallbackLineItemCount;
    const confirmedLineItemCount = explicit.confirmed_line_item_count ?? explicit.confirmedLineItemCount ?? Math.max(0, totalRows - fallbackLineItemCount);
    const customerMultiplier = statusOverride === 'NEEDS_UPDATE' ? 1.03 : 1.015;
    const costMultiplier = statusOverride === 'NEEDS_UPDATE' ? 1.13 : 1.06;

    return {
      totalRows,
      confirmedLineItemCount: toNumber(confirmedLineItemCount, 0),
      fallbackLineItemCount: toNumber(fallbackLineItemCount, 0),
      estimatedPriceLineItemCount: toNumber(estimatedPriceLineItemCount, 0),
      totalCustomerPrice: roundMoney(baseCustomerPrice * customerMultiplier),
      totalInternalCost: roundMoney(baseInternalCost * costMultiplier)
    };
  }

  function decideRisk({ status, high, medium, fallbackLineItemCount, totalRows, marginRate, pceDecision }) {
    if (status === 'READY' && fallbackLineItemCount === 0 && ['GO', 'SCALE'].includes(pceDecision) && marginRate >= 0.25) {
      return { riskLevel: 'LOW', ceoActionRequired: false, recommendedAction: '견적 진행 가능' };
    }
    if (pceDecision === 'BLOCK' || status === 'NEEDS_UPDATE' || high >= 6 || marginRate < 0.18) {
      return { riskLevel: 'BLOCKING', ceoActionRequired: true, recommendedAction: '견적 차단' };
    }
    const fallbackRate = totalRows > 0 ? fallbackLineItemCount / totalRows : 0;
    if (high >= 3 || fallbackRate >= 0.4 || pceDecision === 'MODIFY' || marginRate < 0.24) {
      return { riskLevel: 'HIGH', ceoActionRequired: true, recommendedAction: '단가 보정 후 진행' };
    }
    if (status === 'PARTIAL' || medium > 0 || fallbackLineItemCount > 0) {
      return { riskLevel: 'MEDIUM', ceoActionRequired: true, recommendedAction: '대표 검토 후 진행' };
    }
    return { riskLevel: 'LOW', ceoActionRequired: false, recommendedAction: '견적 진행 가능' };
  }

  function analyzePriceReadinessImpact(payload = {}) {
    const estimateType = normalizeEstimateType(payload.estimate_type || payload.estimateType);
    const scenario = payload.scenario || payload;
    const status = normalizeReadinessStatus(
      scenario.price_readiness_status ||
      scenario.priceReadinessStatus ||
      payload.price_readiness_status ||
      payload.status
    );
    const needsUpdate = countNeedsUpdateByPriority(estimateType, status, scenario);
    const coverage = coverageFromRows(estimateType, status, scenario);
    const marginAmount = coverage.totalCustomerPrice - coverage.totalInternalCost;
    const marginRate = coverage.totalCustomerPrice > 0 ? marginAmount / coverage.totalCustomerPrice : 0;
    const pceDecision = PCE_DECISIONS.has(String(scenario.pce_decision || scenario.pceDecision || '').toUpperCase())
      ? String(scenario.pce_decision || scenario.pceDecision).toUpperCase()
      : status === 'READY'
        ? 'GO'
        : status === 'PARTIAL'
          ? 'SCALE'
          : 'BLOCK';
    const decision = decideRisk({
      status,
      high: needsUpdate.high,
      medium: needsUpdate.medium,
      fallbackLineItemCount: coverage.fallbackLineItemCount,
      totalRows: coverage.totalRows,
      marginRate,
      pceDecision
    });

    return {
      estimate_type: estimateType,
      price_readiness_status: status,
      high_priority_needs_update_count: needsUpdate.high,
      medium_priority_needs_update_count: needsUpdate.medium,
      low_priority_needs_update_count: needsUpdate.low,
      lightbim_quantity_applied: Boolean(scenario.lightbim_quantity_applied ?? scenario.lightBimQuantityApplied ?? scenario.lightbimApplied),
      fallback_price_used: coverage.fallbackLineItemCount > 0,
      confirmed_line_item_count: coverage.confirmedLineItemCount,
      fallback_line_item_count: coverage.fallbackLineItemCount,
      estimated_price_line_item_count: coverage.estimatedPriceLineItemCount,
      total_customer_price: coverage.totalCustomerPrice,
      total_internal_cost: coverage.totalInternalCost,
      margin_amount: roundMoney(marginAmount),
      margin_rate: roundRate(marginRate),
      pce_decision: pceDecision,
      risk_level: decision.riskLevel,
      ceo_action_required: decision.ceoActionRequired,
      recommended_action: decision.recommendedAction
    };
  }

  function analyzeEstimatePriceCoverage(estimateId) {
    const id = String(estimateId || '');
    const estimateType = id.includes('KITCHEN') || id.startsWith('KIT') ? 'KITCHEN' : id.includes('BATH') ? 'BATHROOM' : 'FULL_REMODELING';
    return analyzePriceReadinessImpact({ estimateType, priceReadinessStatus: 'PARTIAL', lightbimApplied: id.includes('LIGHTBIM') || id.includes('INTAKE') });
  }

  function compareReadyPartialNeedsUpdateScenarios(estimateType) {
    const normalized = normalizeEstimateType(estimateType);
    return ['READY', 'PARTIAL', 'NEEDS_UPDATE'].map((status) => analyzePriceReadinessImpact({
      estimateType: normalized,
      priceReadinessStatus: status,
      lightbimApplied: normalized === 'FULL_REMODELING',
      pceDecision: status === 'READY' ? 'GO' : status === 'PARTIAL' ? 'SCALE' : 'BLOCK'
    }));
  }

  function createPriceReadinessImpactReport(payload = {}) {
    const analyses = Array.isArray(payload.analyses) && payload.analyses.length > 0
      ? payload.analyses
      : VALID_ESTIMATE_TYPES.values
        ? Array.from(VALID_ESTIMATE_TYPES).flatMap((type) => compareReadyPartialNeedsUpdateScenarios(type))
        : [];
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_3_5_PRICE_READINESS_IMPACT_ANALYSIS_REPORT_GENERATED.md');
    const lines = [
      '# RC-0.3.5 Price Readiness Impact Analysis Report',
      '',
      `- Generated at: ${nowIso()}`,
      `- 분석 건수: ${analyses.length}`,
      '- 고객용 출력 비노출 원칙: internal cost, margin, PCE, risk_level, fallback 항목은 고객-facing payload에 포함하지 않음',
      '',
      '## Results',
      '',
      '| 견적 유형 | 상태 | HIGH | MEDIUM | LOW | Fallback | Confirmed | Margin | PCE | Risk | 추천 조치 |',
      '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- |',
      ...analyses.map((item) => [
        item.estimate_type,
        item.price_readiness_status,
        item.high_priority_needs_update_count,
        item.medium_priority_needs_update_count,
        item.low_priority_needs_update_count,
        item.fallback_line_item_count,
        item.confirmed_line_item_count,
        `${Math.round(item.margin_rate * 1000) / 10}%`,
        item.pce_decision,
        item.risk_level,
        item.recommended_action
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
    ];
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    return { ok: true, reportPath, analyses };
  }

  function createPriceReadinessIssue(payload = {}) {
    const estimateType = normalizeEstimateType(payload.estimate_type || payload.estimateType || 'FULL_REMODELING');
    return withProjectDb((database) => {
      const issueId = makeId('PRI');
      const createdAt = nowIso();
      database.prepare(`
        INSERT INTO price_readiness_impact_issues (
          id, estimate_type, severity, category, description, target_version, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        issueId,
        estimateType,
        String(payload.severity || 'S3').toUpperCase(),
        String(payload.category || 'PRICE_READINESS'),
        String(payload.description || 'Price readiness impact issue'),
        String(payload.target_version || payload.targetVersion || 'RC-0.3.5'),
        String(payload.status || 'OPEN').toUpperCase(),
        createdAt,
        createdAt
      );
      return { ok: true, issueId, estimateType };
    });
  }

  function buildCustomerSafeImpactPayload(analysis) {
    return {
      estimate_type: analysis.estimate_type,
      customer_safe: true,
      message: '단가 준비 상태는 내부 검토 항목입니다.'
    };
  }

  return {
    analyzePriceReadinessImpact,
    analyzeEstimatePriceCoverage,
    compareReadyPartialNeedsUpdateScenarios,
    createPriceReadinessImpactReport,
    createPriceReadinessIssue,
    inspectForbiddenCustomerPayload,
    buildCustomerSafeImpactPayload
  };
}

module.exports = {
  createPriceReadinessImpactService
};
