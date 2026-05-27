'use strict';

const CRITICAL_WARNING_CODES = new Set([
  'INVALID_POLYGON',
  'MISSING_VERTEX',
  'ZERO_AREA_SPACE',
  'ZERO_QUANTITY_REQUIRED',
  'MISSING_BATHROOM_TILE_QUANTITY',
  'MISSING_FLOORING_QUANTITY'
]);

const NON_CRITICAL_WARNING_CODES = new Set([
  'DEFAULT_WALL_HEIGHT_USED',
  'DEFAULT_OPENING_SIZE_USED',
  'ESTIMATED_KITCHEN_TILE_AREA',
  'WALL_WITHOUT_SPACE',
  'LIGHTBIM_QUANTITY_AVAILABLE'
]);

function createLightBIMQuantityReviewService({ db, nowIso, toJson, fromJson }) {
  function safeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function roundMoney(value) {
    return Math.round(safeNumber(value, 0));
  }

  function roundQuantity(value) {
    return Math.round(safeNumber(value, 0) * 10000) / 10000;
  }

  function getItemValue(item, ...keys) {
    for (const key of keys) {
      if (item && item[key] !== undefined && item[key] !== null) return item[key];
    }
    return undefined;
  }

  function makeId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getQuantityBasisValue(quantityBasis = {}, key) {
    if (!key) return 0;
    const direct = safeNumber(quantityBasis[key], 0);
    if (direct > 0) return direct;
    const process = quantityBasis.process_quantities || quantityBasis.processQuantities || {};
    return safeNumber(process[key], 0);
  }

  function normalizeWarning(raw = {}) {
    if (!raw || typeof raw !== 'object') return null;
    return {
      code: String(raw.code || raw.warning_code || '').trim(),
      severity: String(raw.severity || '').trim() || 'WARNING',
      message: raw.message || raw.messageKo || raw.warning_message || ''
    };
  }

  function findBasisWarning(quantityBasis = {}, basisKey) {
    const warnings = Array.isArray(quantityBasis.warnings) ? quantityBasis.warnings : [];
    const normalized = warnings.map(normalizeWarning).filter(Boolean);
    if (!basisKey) return normalized[0] || null;
    return normalized.find((warning) => String(warning.message || '').includes(basisKey) || String(warning.code || '').includes(String(basisKey).toUpperCase())) || null;
  }

  function deriveWarning({ item, quantityBasis, source, basisKey, currentQuantity, lightBimQuantity }) {
    const existingWarning = findBasisWarning(quantityBasis, basisKey);
    if (existingWarning) return existingWarning;

    const itemName = String(getItemValue(item, 'itemName', 'item_name', 'name') || '');
    const category = String(getItemValue(item, 'category', 'process', 'group') || '');

    if (currentQuantity <= 0) {
      return {
        code: 'ZERO_QUANTITY_REQUIRED',
        severity: 'CRITICAL',
        message: '필수 견적 항목 수량이 0입니다.'
      };
    }
    if (/욕실|타일/.test(`${category} ${itemName}`) && /bathroom_tile_area_m2|tile_area_m2/.test(String(basisKey)) && lightBimQuantity <= 0) {
      return {
        code: 'MISSING_BATHROOM_TILE_QUANTITY',
        severity: 'CRITICAL',
        message: '욕실 공정에 필요한 타일 수량이 없습니다.'
      };
    }
    if (/바닥/.test(`${category} ${itemName}`) && String(basisKey) === 'flooring_area_m2' && lightBimQuantity <= 0) {
      return {
        code: 'MISSING_FLOORING_QUANTITY',
        severity: 'CRITICAL',
        message: '바닥 공정에 필요한 바닥 면적 수량이 없습니다.'
      };
    }
    if (source === 'DEFAULT' && getQuantityBasisValue(quantityBasis, basisKey) > 0) {
      return {
        code: 'LIGHTBIM_QUANTITY_AVAILABLE',
        severity: 'INFO',
        message: '관련 LightBIM 도면 수량이 있어 검토가 필요합니다.'
      };
    }
    if (currentQuantity > 1000) {
      return {
        code: 'UNUSUALLY_HIGH_QUANTITY',
        severity: 'WARNING',
        message: '일반 범위보다 큰 수량입니다.'
      };
    }
    return null;
  }

  function requiresReview({ source, warning, currentQuantity, lightBimQuantity }) {
    if (source === 'LIGHTBIM' || source === 'USER') return true;
    if (warning) return true;
    if (currentQuantity <= 0) return true;
    if (lightBimQuantity > 0) return true;
    return false;
  }

  function pricingFromItem(item = {}, quantity = 0) {
    const safeQuantity = safeNumber(quantity, 0);
    const customerUnitPrice = safeNumber(getItemValue(item, 'customerUnitPrice', 'customer_unit_price', 'unitPrice'), 0);
    const customerTotal = safeNumber(getItemValue(item, 'customerTotal', 'customer_total', 'amount'), 0);
    const materialCost = safeNumber(getItemValue(item, 'materialCost', 'material_cost'), 0);
    const laborCost = safeNumber(getItemValue(item, 'laborCost', 'labor_cost'), 0);
    const subcontractCost = safeNumber(getItemValue(item, 'subcontractCost', 'subcontract_cost'), 0);
    const internalTotal = safeNumber(getItemValue(item, 'internalTotal', 'internal_total'), materialCost + laborCost + subcontractCost);
    const divisor = safeQuantity > 0 ? safeQuantity : 1;

    return {
      customerUnitPrice: customerUnitPrice || customerTotal / divisor,
      materialUnitCost: materialCost / divisor,
      laborUnitCost: laborCost / divisor,
      subcontractUnitCost: subcontractCost / divisor,
      internalUnitCost: internalTotal / divisor
    };
  }

  function mapReviewRow(row = {}) {
    return {
      id: row.id,
      importId: row.import_id,
      estimateType: row.estimate_type,
      estimateId: row.estimate_id,
      lineItemId: row.estimate_item_id,
      category: row.category,
      itemName: row.item_name,
      unit: row.unit,
      originalQuantity: safeNumber(row.original_quantity, 0),
      defaultQuantity: safeNumber(row.default_quantity, 0),
      lightBimQuantity: row.lightbim_quantity == null ? null : safeNumber(row.lightbim_quantity, 0),
      currentQuantity: safeNumber(row.current_quantity, 0),
      quantitySource: row.quantity_source || 'DEFAULT',
      quantityBasisKey: row.quantity_basis_key || '',
      quantityNote: row.quantity_note || '',
      warningCode: row.warning_code || '',
      warningMessage: row.warning_message || '',
      warningStatus: CRITICAL_WARNING_CODES.has(row.warning_code) ? 'CRITICAL' : row.warning_code ? 'WARNING' : 'NONE',
      reviewedStatus: row.reviewed_status || 'PENDING',
      overrideReason: row.override_reason || '',
      pricing: fromJson(row.pricing_json, {}),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function insertReviewLog(reviewId, action, beforeQuantity, afterQuantity, reason = '') {
    db.project.prepare(`
      INSERT INTO lightbim_quantity_review_logs (
        id, review_id, action, before_quantity, after_quantity, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      makeId('LBIM-QTY-LOG'),
      reviewId,
      action,
      safeNumber(beforeQuantity, 0),
      safeNumber(afterQuantity, 0),
      reason || '',
      nowIso()
    );
  }

  function createReviewsForEstimate(importId, estimateType, estimateId, lineItems = [], quantityBasis = {}) {
    if (!estimateType || !estimateId || !Array.isArray(lineItems)) {
      return getReviewSummary(estimateType, estimateId);
    }

    let createdCount = 0;
    let skippedCount = 0;
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO lightbim_quantity_reviews (
        id, import_id, estimate_type, estimate_id, estimate_item_id,
        category, item_name, unit, original_quantity, default_quantity, lightbim_quantity, current_quantity,
        quantity_source, quantity_basis_key, quantity_note,
        warning_code, warning_message, reviewed_status, override_reason,
        pricing_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    lineItems.forEach((item, index) => {
      const source = String(getItemValue(item, 'quantity_source', 'quantitySource') || 'DEFAULT').toUpperCase();
      const basisKey = String(getItemValue(item, 'quantity_basis_key', 'quantityBasisKey') || '');
      const currentQuantity = roundQuantity(getItemValue(item, 'quantity', 'qty'));
      const originalQuantity = currentQuantity;
      const defaultQuantity = roundQuantity(getItemValue(item, 'original_default_quantity', 'originalDefaultQuantity', 'defaultQuantity', 'quantity'));
      const rawLightBimQuantity = getItemValue(item, 'original_lightbim_quantity', 'originalLightBimQuantity');
      const basisLightBimQuantity = getQuantityBasisValue(quantityBasis, basisKey);
      const lightBimQuantity = roundQuantity(rawLightBimQuantity || basisLightBimQuantity || (source === 'LIGHTBIM' ? currentQuantity : 0));
      const warning = deriveWarning({ item, quantityBasis, source, basisKey, currentQuantity, lightBimQuantity });

      const reviewRequired = requiresReview({ source, warning, currentQuantity, lightBimQuantity });

      const category = String(getItemValue(item, 'category', 'process', 'group') || '기타');
      const itemName = String(getItemValue(item, 'itemName', 'item_name', 'name') || `항목 ${index + 1}`);
      const lineItemId = String(getItemValue(item, 'id', 'lineItemId', 'line_item_id') || `${estimateId}-${index + 1}-${category}-${itemName}`);
      const pricing = pricingFromItem(item, currentQuantity);
      const importedReviewStatus = String(getItemValue(item, 'quantity_review_status', 'quantityReviewStatus') || '');
      const reviewedStatus = ['CONFIRMED', 'OVERRIDDEN', 'IGNORED'].includes(importedReviewStatus)
        ? importedReviewStatus
        : (reviewRequired ? 'PENDING' : 'CONFIRMED');
      const now = nowIso();
      const result = insert.run(
        makeId('LBIM-QTY-REVIEW'),
        importId || null,
        estimateType,
        estimateId,
        lineItemId,
        category,
        itemName,
        String(getItemValue(item, 'unit') || ''),
        originalQuantity,
        defaultQuantity,
        lightBimQuantity || null,
        currentQuantity,
        source,
        basisKey,
        String(getItemValue(item, 'quantity_note', 'quantityNote') || ''),
        warning?.code || '',
        warning?.message || '',
        reviewedStatus,
        '',
        toJson(pricing),
        now,
        now
      );
      if (result.changes > 0) createdCount += 1;
      else skippedCount += 1;
    });

    return {
      ...getReviewSummary(estimateType, estimateId),
      createdCount,
      skippedCount
    };
  }

  function getReviewsByEstimate(estimateType, estimateId) {
    let targetType = estimateType;
    let targetId = estimateId;
    if (!targetType || !targetId) {
      const latest = db.project.prepare(`
        SELECT estimate_type, estimate_id
        FROM lightbim_quantity_reviews
        ORDER BY created_at DESC
        LIMIT 1
      `).get();
      targetType = targetType || latest?.estimate_type;
      targetId = targetId || latest?.estimate_id;
    }
    if (!targetType || !targetId) return [];
    return db.project.prepare(`
      SELECT *
      FROM lightbim_quantity_reviews
      WHERE estimate_type = ? AND estimate_id = ?
      ORDER BY category, item_name, created_at
    `).all(targetType, targetId).map(mapReviewRow);
  }

  function getReviewById(reviewId) {
    const row = db.project.prepare('SELECT * FROM lightbim_quantity_reviews WHERE id = ?').get(reviewId);
    if (!row) throw new Error('LightBIM 수량 검토 항목을 찾을 수 없습니다.');
    return row;
  }

  function updateReviewQuantity(reviewId, quantity, reason) {
    if (!reason || !String(reason).trim()) {
      throw new Error('수량 수정 사유를 입력하세요.');
    }
    const row = getReviewById(reviewId);
    const nextQuantity = roundQuantity(quantity);
    const now = nowIso();
    db.project.prepare(`
      UPDATE lightbim_quantity_reviews
      SET current_quantity = ?, quantity_source = ?, override_reason = ?, reviewed_status = ?, updated_at = ?
      WHERE id = ?
    `).run(nextQuantity, 'USER', reason, 'OVERRIDDEN', now, reviewId);
    insertReviewLog(reviewId, 'OVERRIDE', row.current_quantity, nextQuantity, reason);
    return mapReviewRow(getReviewById(reviewId));
  }

  function confirmReview(reviewId) {
    const row = getReviewById(reviewId);
    const now = nowIso();
    db.project.prepare(`
      UPDATE lightbim_quantity_reviews
      SET reviewed_status = ?, updated_at = ?
      WHERE id = ?
    `).run('CONFIRMED', now, reviewId);
    insertReviewLog(reviewId, 'CONFIRM', row.current_quantity, row.current_quantity, '확인');
    return mapReviewRow(getReviewById(reviewId));
  }

  function ignoreReview(reviewId, reason = '') {
    const row = getReviewById(reviewId);
    const now = nowIso();
    db.project.prepare(`
      UPDATE lightbim_quantity_reviews
      SET reviewed_status = ?, override_reason = ?, updated_at = ?
      WHERE id = ?
    `).run('IGNORED', reason || '무시', now, reviewId);
    insertReviewLog(reviewId, 'IGNORE', row.current_quantity, row.current_quantity, reason || '무시');
    return mapReviewRow(getReviewById(reviewId));
  }

  function resetReviewToDefault(reviewId) {
    const row = getReviewById(reviewId);
    const nextQuantity = roundQuantity(row.default_quantity || row.original_quantity);
    const now = nowIso();
    db.project.prepare(`
      UPDATE lightbim_quantity_reviews
      SET current_quantity = ?, quantity_source = ?, reviewed_status = ?, override_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(nextQuantity, 'DEFAULT', 'CONFIRMED', '', now, reviewId);
    insertReviewLog(reviewId, 'RESET_DEFAULT', row.current_quantity, nextQuantity, '기본값으로 되돌림');
    return mapReviewRow(getReviewById(reviewId));
  }

  function applyLightBIMQuantity(reviewId) {
    const row = getReviewById(reviewId);
    const nextQuantity = roundQuantity(row.lightbim_quantity || row.current_quantity || row.original_quantity);
    const now = nowIso();
    db.project.prepare(`
      UPDATE lightbim_quantity_reviews
      SET current_quantity = ?, quantity_source = ?, reviewed_status = ?, override_reason = ?, updated_at = ?
      WHERE id = ?
    `).run(nextQuantity, 'LIGHTBIM', 'CONFIRMED', '', now, reviewId);
    insertReviewLog(reviewId, 'APPLY_LIGHTBIM', row.current_quantity, nextQuantity, 'LightBIM 수량 적용');
    return mapReviewRow(getReviewById(reviewId));
  }

  function calculateReviewTotals(reviews, quantityKey) {
    return reviews.reduce((totals, review) => {
      const pricing = review.pricing || {};
      const quantity = safeNumber(review[quantityKey], 0);
      const customerTotal = quantity * safeNumber(pricing.customerUnitPrice, 0);
      const materialCost = quantity * safeNumber(pricing.materialUnitCost, 0);
      const laborCost = quantity * safeNumber(pricing.laborUnitCost, 0);
      const subcontractCost = quantity * safeNumber(pricing.subcontractUnitCost, 0);
      const totalCost = materialCost + laborCost + subcontractCost;
      totals.revenue += customerTotal;
      totals.materialCost += materialCost;
      totals.laborCost += laborCost;
      totals.subcontractCost += subcontractCost;
      totals.totalCost += totalCost;
      return totals;
    }, {
      revenue: 0,
      materialCost: 0,
      laborCost: 0,
      subcontractCost: 0,
      totalCost: 0
    });
  }

  function decidePce(revenue, totalCost) {
    const margin = revenue - totalCost;
    const marginRate = revenue > 0 ? margin / revenue : 0;
    let decision = 'BLOCK';
    if (marginRate >= 0.35) decision = 'SCALE';
    else if (marginRate >= 0.3) decision = 'GO';
    else if (marginRate >= 0.25) decision = 'MODIFY';
    return {
      decision,
      revenue: roundMoney(revenue),
      totalCost: roundMoney(totalCost),
      expectedMargin: roundMoney(margin),
      expectedMarginRate: Math.round(marginRate * 10000) / 10000
    };
  }

  function recalculateEstimateAfterReview(estimateType, estimateId) {
    const reviews = getReviewsByEstimate(estimateType, estimateId);
    const beforeTotals = calculateReviewTotals(reviews, 'originalQuantity');
    const afterTotals = calculateReviewTotals(reviews, 'currentQuantity');
    const beforePce = decidePce(beforeTotals.revenue, beforeTotals.totalCost);
    const afterPce = decidePce(afterTotals.revenue, afterTotals.totalCost);
    return {
      estimateType,
      estimateId,
      before: beforePce,
      after: afterPce,
      pce: afterPce,
      lineItemCount: reviews.length,
      customerView: reviews.map((review) => ({
        itemName: review.itemName,
        quantity: review.currentQuantity,
        unit: review.unit,
        amount: roundMoney(review.currentQuantity * safeNumber(review.pricing.customerUnitPrice, 0))
      })),
      internalView: reviews.map((review) => ({
        ...review,
        customerTotal: roundMoney(review.currentQuantity * safeNumber(review.pricing.customerUnitPrice, 0)),
        internalTotal: roundMoney(review.currentQuantity * (
          safeNumber(review.pricing.materialUnitCost, 0)
          + safeNumber(review.pricing.laborUnitCost, 0)
          + safeNumber(review.pricing.subcontractUnitCost, 0)
        ))
      })),
      messageKo: '재계산 완료',
      pceMessageKo: 'PCE 재검증 완료'
    };
  }

  function getReviewSummary(estimateType, estimateId) {
    const reviews = getReviewsByEstimate(estimateType, estimateId);
    const summary = {
      estimateType: estimateType || reviews[0]?.estimateType || '',
      estimateId: estimateId || reviews[0]?.estimateId || '',
      totalCount: reviews.length,
      pendingCount: 0,
      confirmedCount: 0,
      overriddenCount: 0,
      ignoredCount: 0,
      warningCount: 0,
      criticalUnresolvedCount: 0,
      lightbimCount: 0,
      userCount: 0,
      defaultCount: 0
    };
    reviews.forEach((review) => {
      if (review.reviewedStatus === 'PENDING') summary.pendingCount += 1;
      if (review.reviewedStatus === 'CONFIRMED') summary.confirmedCount += 1;
      if (review.reviewedStatus === 'OVERRIDDEN') summary.overriddenCount += 1;
      if (review.reviewedStatus === 'IGNORED') summary.ignoredCount += 1;
      if (review.quantitySource === 'LIGHTBIM') summary.lightbimCount += 1;
      else if (review.quantitySource === 'USER') summary.userCount += 1;
      else summary.defaultCount += 1;
      if (review.warningCode) summary.warningCount += 1;
      if (CRITICAL_WARNING_CODES.has(review.warningCode) && !['CONFIRMED', 'OVERRIDDEN', 'IGNORED'].includes(review.reviewedStatus)) {
        summary.criticalUnresolvedCount += 1;
      }
    });
    return summary;
  }

  function toExecutionSource(item, review) {
    if (review?.reviewedStatus === 'OVERRIDDEN' || item.quantity_source === 'USER' || item.quantitySource === 'USER') {
      return 'USER_REVIEW';
    }
    if (review?.reviewedStatus === 'CONFIRMED' && review.quantitySource === 'LIGHTBIM') {
      return 'LIGHTBIM_REVIEWED';
    }
    if (item.quantity_source === 'LIGHTBIM' || item.quantitySource === 'LIGHTBIM') return 'LIGHTBIM';
    return item.quantity_source === 'DEFAULT' || item.quantitySource === 'DEFAULT' ? 'DEFAULT' : 'ESTIMATE';
  }

  function buildExecutionQuantityContext(estimateType, estimateId, estimateItems = []) {
    const reviews = getReviewsByEstimate(estimateType, estimateId);
    const reviewByItemId = new Map(reviews.map((review) => [review.lineItemId, review]));
    const basis = {};
    const executionItems = estimateItems.map((item) => {
      const review = reviewByItemId.get(item.id);
      const useReview = review && review.reviewedStatus !== 'IGNORED';
      const quantity = useReview ? review.currentQuantity : safeNumber(item.quantity, 0);
      const quantityBasisKey = (useReview ? review.quantityBasisKey : (item.quantity_basis_key || item.quantityBasisKey)) || '';
      const quantitySource = toExecutionSource(item, useReview ? review : null);
      const mapped = {
        ...item,
        quantity,
        quantitySource,
        quantity_source: quantitySource,
        quantityBasisKey,
        quantity_basis_key: quantityBasisKey,
        quantityNote: useReview ? review.quantityNote : (item.quantity_note || item.quantityNote || '견적 수량 기준'),
        quantity_note: useReview ? review.quantityNote : (item.quantity_note || item.quantityNote || '견적 수량 기준'),
        reviewedStatus: review?.reviewedStatus || item.quantity_review_status || 'NOT_REVIEWED',
        reviewWarningCode: review?.warningCode || ''
      };
      if (quantityBasisKey && quantity > 0 && ['USER_REVIEW', 'LIGHTBIM_REVIEWED', 'LIGHTBIM'].includes(quantitySource)) {
        const priority = { USER_REVIEW: 5, LIGHTBIM_REVIEWED: 4, LIGHTBIM: 3, ESTIMATE: 2, DEFAULT: 1 }[quantitySource] || 0;
        const previous = basis[quantityBasisKey];
        if (!previous || priority > previous.priority) {
          basis[quantityBasisKey] = {
            quantity,
            unit: item.unit,
            quantitySource,
            quantityBasisKey,
            quantityNote: mapped.quantityNote,
            priority
          };
        }
      }
      return mapped;
    });
    const summary = getReviewSummary(estimateType, estimateId);
    return {
      estimateType,
      estimateId,
      items: executionItems,
      basis,
      summary: {
        lightbim_quantity_used: Object.values(basis).some((item) => ['LIGHTBIM', 'LIGHTBIM_REVIEWED', 'USER_REVIEW'].includes(item.quantitySource)),
        reviewed_quantity_used: Object.values(basis).some((item) => ['LIGHTBIM_REVIEWED', 'USER_REVIEW'].includes(item.quantitySource)),
        quantity_warning_count: summary.warningCount || 0,
        critical_unresolved_count: summary.criticalUnresolvedCount || 0
      }
    };
  }

  return {
    createReviewsForEstimate,
    getReviewsByEstimate,
    updateReviewQuantity,
    confirmReview,
    ignoreReview,
    resetReviewToDefault,
    applyLightBIMQuantity,
    recalculateEstimateAfterReview,
    getReviewSummary,
    buildExecutionQuantityContext,
    CRITICAL_WARNING_CODES,
    NON_CRITICAL_WARNING_CODES
  };
}

module.exports = {
  createLightBIMQuantityReviewService,
  CRITICAL_WARNING_CODES,
  NON_CRITICAL_WARNING_CODES
};
