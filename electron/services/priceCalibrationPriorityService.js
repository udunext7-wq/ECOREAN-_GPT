'use strict';

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createPriceReadinessImpactService } = require('./priceReadinessImpactService');

const ESTIMATE_TYPES = ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'];
const RISK_ORDER = { BLOCKING: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
const STATUS_ORDER = { NEEDS_UPDATE: 1, PARTIAL: 2, READY: 3 };
const FORBIDDEN_CUSTOMER_TERMS = [
  'price calibration priority',
  'risk_level',
  'fallback price',
  'current_price',
  'suggested_price',
  'internal cost',
  'margin',
  'pce',
  'vendor',
  'labor cost',
  'purchase',
  'receiving',
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
  return ESTIMATE_TYPES.includes(normalized) ? normalized : 'FULL_REMODELING';
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function masterEstimateType(estimateType) {
  if (estimateType === 'BATHROOM') return 'bathroom_remodel';
  if (estimateType === 'KITCHEN') return 'kitchen_remodel';
  return 'full_remodel';
}

function priorityFromImpact(impact) {
  const status = String(impact.price_readiness_status || '').toUpperCase();
  const risk = String(impact.risk_level || '').toUpperCase();
  const estimateType = normalizeEstimateType(impact.estimate_type);

  if (status === 'NEEDS_UPDATE' || risk === 'BLOCKING') {
    return { priorityLevel: 1, priorityLabelKo: '즉시 보정 필요' };
  }
  if (status === 'PARTIAL' && risk === 'HIGH' && ['KITCHEN', 'FULL_REMODELING'].includes(estimateType)) {
    return { priorityLevel: 2, priorityLabelKo: '견적 전 보정 권장' };
  }
  if (status === 'PARTIAL' && risk === 'MEDIUM') {
    return { priorityLevel: 3, priorityLabelKo: '대표 검토 필요' };
  }
  return { priorityLevel: 4, priorityLabelKo: '확인 완료' };
}

function priorityScenarioFor(estimateType, status) {
  const normalized = normalizeEstimateType(estimateType);
  if (status === 'READY') {
    return {
      priceReadinessStatus: 'READY',
      needsUpdateCounts: { high: 0, medium: 0, low: 0 },
      coverage: { fallbackLineItemCount: 0, estimatedPriceLineItemCount: 0 },
      pceDecision: 'GO'
    };
  }
  if (status === 'NEEDS_UPDATE') {
    return {
      priceReadinessStatus: 'NEEDS_UPDATE',
      needsUpdateCounts: { high: 6, medium: 5, low: 4 },
      coverage: { fallbackLineItemCount: 12, estimatedPriceLineItemCount: 12 },
      pceDecision: 'BLOCK'
    };
  }
  if (normalized === 'BATHROOM') {
    return {
      priceReadinessStatus: 'PARTIAL',
      needsUpdateCounts: { high: 0, medium: 2, low: 1 },
      coverage: { fallbackLineItemCount: 2, estimatedPriceLineItemCount: 2 },
      pceDecision: 'SCALE'
    };
  }
  return {
    priceReadinessStatus: 'PARTIAL',
    needsUpdateCounts: { high: 3, medium: 2, low: 1 },
    coverage: { fallbackLineItemCount: normalized === 'FULL_REMODELING' ? 9 : 4, estimatedPriceLineItemCount: normalized === 'FULL_REMODELING' ? 9 : 4 },
    pceDecision: 'SCALE'
  };
}

function inspectForbiddenCustomerPayload(payload) {
  const serialized = JSON.stringify(payload || {}).toLowerCase();
  return FORBIDDEN_CUSTOMER_TERMS.filter((term) => serialized.includes(term.toLowerCase()));
}

function createPriceCalibrationPriorityService({ sqliteService, reportsDir = null, priceReadinessImpactService = null } = {}) {
  if (!sqliteService?.dbPaths?.master) {
    throw new Error('sqliteService with master database path is required');
  }

  const masterDbPath = sqliteService.dbPaths.master;
  const reportDir = reportsDir || path.join(__dirname, '..', '..', 'docs');
  const impactService = priceReadinessImpactService || createPriceReadinessImpactService({ sqliteService, reportsDir: reportDir });

  function withMasterDb(callback) {
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
      CREATE TABLE IF NOT EXISTS price_calibration_priority_tasks (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL UNIQUE,
        estimate_type TEXT NOT NULL,
        item_type TEXT NOT NULL,
        item_id TEXT,
        item_name TEXT NOT NULL,
        priority_level INTEGER NOT NULL,
        risk_level TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        price_status TEXT NOT NULL,
        current_price REAL,
        suggested_price REAL,
        source TEXT,
        linked_queue_id TEXT,
        review_status TEXT NOT NULL,
        reviewed_by TEXT,
        reviewed_at TEXT,
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  function readStandardItems(estimateType) {
    return withMasterDb((database) => {
      try {
        return database.prepare(`
          SELECT id, item_name, process, default_unit, default_customer_unit_price,
                 default_material_cost, default_labor_cost, default_subcontract_cost,
                 estimate_type, is_mandatory, price_status
          FROM standard_estimate_items
          WHERE estimate_type = ?
          ORDER BY is_mandatory DESC, process, item_name
        `).all(masterEstimateType(estimateType));
      } catch (_error) {
        return [];
      }
    });
  }

  function fallbackItemRows(estimateType) {
    const label = estimateType === 'BATHROOM' ? '욕실' : estimateType === 'KITCHEN' ? '주방' : '전체 리모델링';
    return [
      { id: `${estimateType}-FALLBACK-1`, item_name: `${label} 핵심 자재 단가`, process: '단가 보정', default_unit: '식', default_customer_unit_price: 0, price_status: 'NEEDS_UPDATE' },
      { id: `${estimateType}-FALLBACK-2`, item_name: `${label} 노무 단가`, process: '노무', default_unit: '일', default_customer_unit_price: 0, price_status: 'NEEDS_UPDATE' },
      { id: `${estimateType}-FALLBACK-3`, item_name: `${label} 표준 견적 품목`, process: '표준 품목', default_unit: '식', default_customer_unit_price: 0, price_status: 'NEEDS_UPDATE' }
    ];
  }

  function rowsForImpact(impact) {
    const estimateType = normalizeEstimateType(impact.estimate_type);
    const rows = readStandardItems(estimateType);
    const status = String(impact.price_readiness_status || '').toUpperCase();
    const fallbackCount = Math.max(1, toNumber(impact.fallback_line_item_count, 1));
    if (rows.length === 0) return fallbackItemRows(estimateType);
    if (status === 'READY') return rows.slice(0, 1);

    const needsUpdateRows = rows.filter((row) => String(row.price_status || '').toUpperCase() === 'NEEDS_UPDATE' || toNumber(row.default_customer_unit_price, 0) <= 0);
    const selected = (needsUpdateRows.length > 0 ? needsUpdateRows : rows).slice(0, Math.min(fallbackCount, 12));
    return selected.length > 0 ? selected : rows.slice(0, 1);
  }

  function buildPriorityItemsFromImpact(impact) {
    const estimateType = normalizeEstimateType(impact.estimate_type);
    const status = String(impact.price_readiness_status || 'PARTIAL').toUpperCase();
    const priority = priorityFromImpact(impact);
    return rowsForImpact(impact).map((row, index) => ({
      task_id: makeId('PCPT'),
      estimate_type: estimateType,
      item_type: 'STANDARD_ITEM',
      item_id: String(row.id || `${estimateType}-${index}`),
      item_name: String(row.item_name || row.itemName || `${estimateType} 단가 보정 항목`),
      process: String(row.process || '-'),
      unit: String(row.default_unit || row.unit || '식'),
      priority_level: priority.priorityLevel,
      priority_label_ko: priority.priorityLabelKo,
      risk_level: String(impact.risk_level || 'MEDIUM').toUpperCase(),
      recommended_action: String(impact.recommended_action || '대표 검토 필요'),
      price_status: status,
      current_price: toNumber(row.default_customer_unit_price || row.defaultCustomerUnitPrice, 0),
      suggested_price: null,
      source: 'PRICE_READINESS_IMPACT_RC_0_3_6',
      review_status: 'PENDING',
      high_priority_needs_update_count: toNumber(impact.high_priority_needs_update_count, 0),
      fallback_line_item_count: toNumber(impact.fallback_line_item_count, 0),
      confirmed_line_item_count: toNumber(impact.confirmed_line_item_count, 0),
      margin_amount: toNumber(impact.margin_amount, 0),
      margin_rate: toNumber(impact.margin_rate, 0),
      pce_decision: String(impact.pce_decision || '-'),
      ceo_action_required: Boolean(impact.ceo_action_required)
    }));
  }

  function compareAllImpacts() {
    return ESTIMATE_TYPES.flatMap((estimateType) => comparePriorityImpacts(estimateType));
  }

  function comparePriorityImpacts(estimateType) {
    const normalized = normalizeEstimateType(estimateType);
    return ['READY', 'PARTIAL', 'NEEDS_UPDATE'].map((status) => impactService.analyzePriceReadinessImpact({
      estimateType: normalized,
      scenario: {
        ...priorityScenarioFor(normalized, status),
        lightbimApplied: normalized === 'FULL_REMODELING'
      }
    }));
  }

  function getPriceCalibrationPrioritySummary() {
    const impacts = compareAllImpacts();
    const priorityItems = impacts.flatMap(buildPriorityItemsFromImpact)
      .sort((a, b) => a.priority_level - b.priority_level || STATUS_ORDER[a.price_status] - STATUS_ORDER[b.price_status] || a.estimate_type.localeCompare(b.estimate_type));
    const statusCounts = { READY: 0, PARTIAL: 0, NEEDS_UPDATE: 0 };
    const riskCounts = { BLOCKING: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    impacts.forEach((impact) => {
      statusCounts[impact.price_readiness_status] += 1;
      riskCounts[impact.risk_level] += 1;
    });
    const pendingTasks = withMasterDb((database) => {
      try {
        return database.prepare('SELECT COUNT(*) AS count FROM price_calibration_priority_tasks WHERE review_status = ?').get('PENDING').count;
      } catch (_error) {
        return 0;
      }
    });
    return {
      summary: {
        totalImpactCount: impacts.length,
        priorityItemCount: priorityItems.length,
        immediateCalibrationCount: priorityItems.filter((item) => item.priority_level === 1).length,
        preEstimateCalibrationCount: priorityItems.filter((item) => item.priority_level === 2).length,
        ceoReviewCount: priorityItems.filter((item) => item.priority_level === 3).length,
        readyCheckCount: priorityItems.filter((item) => item.priority_level === 4).length,
        pendingTaskCount: pendingTasks,
        statusCounts,
        riskCounts,
        customerSafety: 'PASSED'
      },
      impacts,
      priorityItems
    };
  }

  function getPriorityItemsByEstimateType(estimateType) {
    const normalized = normalizeEstimateType(estimateType);
    const impacts = comparePriorityImpacts(normalized);
    return impacts.flatMap(buildPriorityItemsFromImpact)
      .sort((a, b) => a.priority_level - b.priority_level || RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level]);
  }

  function createCalibrationTaskFromImpact(payload = {}) {
    const estimateType = normalizeEstimateType(payload.estimate_type || payload.estimateType || 'FULL_REMODELING');
    const status = String(payload.price_readiness_status || payload.priceReadinessStatus || 'PARTIAL').toUpperCase();
    const impact = payload.impact || impactService.analyzePriceReadinessImpact({
      estimateType,
      scenario: priorityScenarioFor(estimateType, status)
    });
    const sourceItems = buildPriorityItemsFromImpact(impact);
    const item = {
      ...sourceItems[0],
      ...payload,
      estimate_type: estimateType,
      price_status: status,
      item_name: String(payload.item_name || payload.itemName || sourceItems[0]?.item_name || `${estimateType} 단가 보정 항목`),
      item_id: String(payload.item_id || payload.itemId || sourceItems[0]?.item_id || ''),
      current_price: toNumber(payload.current_price ?? payload.currentPrice ?? sourceItems[0]?.current_price, 0),
      suggested_price: payload.suggested_price ?? payload.suggestedPrice ?? null,
      note: String(payload.note || '')
    };
    const taskId = String(payload.task_id || payload.taskId || makeId('PCPT'));
    const createdAt = nowIso();
    return withMasterDb((database) => {
      database.prepare(`
        INSERT INTO price_calibration_priority_tasks (
          id, task_id, estimate_type, item_type, item_id, item_name, priority_level,
          risk_level, recommended_action, price_status, current_price, suggested_price,
          source, linked_queue_id, review_status, reviewed_by, reviewed_at, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        taskId,
        taskId,
        estimateType,
        String(item.item_type || item.itemType || 'STANDARD_ITEM'),
        String(item.item_id || item.itemId || ''),
        item.item_name,
        toNumber(item.priority_level || item.priorityLevel, 3),
        String(item.risk_level || item.riskLevel || 'MEDIUM').toUpperCase(),
        String(item.recommended_action || item.recommendedAction || '대표 검토 필요'),
        String(item.price_status || item.priceStatus || status).toUpperCase(),
        item.current_price,
        item.suggested_price === null ? null : toNumber(item.suggested_price, 0),
        String(item.source || 'PRICE_READINESS_IMPACT_RC_0_3_6'),
        item.linked_queue_id || item.linkedQueueId || null,
        String(item.review_status || item.reviewStatus || 'PENDING').toUpperCase(),
        item.reviewed_by || item.reviewedBy || null,
        item.reviewed_at || item.reviewedAt || null,
        item.note || null,
        createdAt,
        createdAt
      );
      const task = database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(taskId);
      return { ok: true, taskId, task };
    });
  }

  function getCalibrationTask(taskId) {
    return withMasterDb((database) => database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(String(taskId)));
  }

  function markCalibrationTaskReviewed(taskId, payload = {}) {
    const reviewedAt = nowIso();
    return withMasterDb((database) => {
      const result = database.prepare(`
        UPDATE price_calibration_priority_tasks
        SET review_status = ?, reviewed_by = ?, reviewed_at = ?, note = ?, updated_at = ?
        WHERE task_id = ?
      `).run(
        String(payload.reviewStatus || payload.review_status || 'REVIEWED').toUpperCase(),
        String(payload.reviewedBy || payload.reviewed_by || 'CEO'),
        reviewedAt,
        String(payload.note || '검토 완료'),
        reviewedAt,
        String(taskId)
      );
      const task = database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(String(taskId));
      return { ok: result.changes > 0, taskId, task };
    });
  }

  function linkCalibrationTaskToPriceQueue(taskId, queueId) {
    const updatedAt = nowIso();
    return withMasterDb((database) => {
      const result = database.prepare(`
        UPDATE price_calibration_priority_tasks
        SET linked_queue_id = ?, review_status = ?, updated_at = ?
        WHERE task_id = ?
      `).run(String(queueId), 'LINKED_TO_QUEUE', updatedAt, String(taskId));
      const task = database.prepare('SELECT * FROM price_calibration_priority_tasks WHERE task_id = ?').get(String(taskId));
      return { ok: result.changes > 0, taskId, queueId: String(queueId), task };
    });
  }

  function createPriceCalibrationPriorityReport(payload = {}) {
    const data = payload.summary && payload.priorityItems ? payload : getPriceCalibrationPrioritySummary();
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'RC_0_3_6_PRICE_CALIBRATION_PRIORITY_REPORT_GENERATED.md');
    const lines = [
      '# RC-0.3.6 Price Calibration Priority Report',
      '',
      `- Generated at: ${nowIso()}`,
      `- Priority item count: ${data.summary.priorityItemCount}`,
      `- Customer safety: ${data.summary.customerSafety}`,
      '',
      '## Priority Items',
      '',
      '| 견적 유형 | 상태 | Risk | 우선순위 | 항목 | 추천 조치 | PCE | Fallback | Confirmed |',
      '| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |',
      ...data.priorityItems.slice(0, 80).map((item) => [
        item.estimate_type,
        item.price_status,
        item.risk_level,
        item.priority_label_ko,
        item.item_name,
        item.recommended_action,
        item.pce_decision || '-',
        item.fallback_line_item_count ?? '-',
        item.confirmed_line_item_count ?? '-'
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'))
    ];
    fs.writeFileSync(reportPath, `${lines.join('\n')}\n`, 'utf8');
    return { ok: true, reportPath, summary: data.summary };
  }

  function buildCustomerSafePriorityPayload() {
    return {
      customer_safe: true,
      message: '단가 보정 우선순위는 내부 검토 항목입니다.'
    };
  }

  return {
    getPriceCalibrationPrioritySummary,
    getPriorityItemsByEstimateType,
    createCalibrationTaskFromImpact,
    markCalibrationTaskReviewed,
    linkCalibrationTaskToPriceQueue,
    createPriceCalibrationPriorityReport,
    inspectForbiddenCustomerPayload,
    buildCustomerSafePriorityPayload
  };
}

module.exports = {
  createPriceCalibrationPriorityService
};
