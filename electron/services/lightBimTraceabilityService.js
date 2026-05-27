'use strict';

const { basisKeysForText } = require('./lightBimExecutionBindingService');

const PROCESS_LABELS = {
  bathroom_tile_area_m2: '욕실 타일',
  kitchen_wall_tile_area_m2: '주방 벽 타일',
  tile_area_m2: '타일',
  wallpaper_area_m2: '도배',
  painting_area_m2: '도장',
  flooring_area_m2: '바닥재',
  ceiling_area_m2: '천장',
  baseboard_length_m: '걸레받이',
  molding_length_m: '몰딩',
  door_count: '문',
  window_count: '창호'
};

const REVIEW_STATUSES = ['OVER_USED', 'SHORTAGE', 'WASTE_HIGH'];
const CRITICAL_WARNINGS = ['INVALID_POLYGON', 'MISSING_VERTEX', 'ZERO_AREA_SPACE'];

function createLightBIMTraceabilityService({ db, nowIso, fromJson }) {
  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cleanId(value) {
    return String(value || 'NA').replace(/[^A-Za-z0-9_-]/g, '-');
  }

  function mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      importId: row.import_id,
      projectId: row.project_id,
      estimateType: row.estimate_type,
      estimateId: row.estimate_id,
      sourceEntityType: row.source_entity_type,
      sourceEntityId: row.source_entity_id,
      sourceEntityName: row.source_entity_name,
      sourceQuantityKey: row.source_quantity_key,
      sourceQuantity: number(row.source_quantity),
      sourceUnit: row.source_unit,
      estimateItemId: row.estimate_item_id,
      estimateItemName: row.estimate_item_name,
      estimateQuantity: number(row.estimate_quantity),
      estimateUnit: row.estimate_unit,
      scheduleItemId: row.schedule_item_id,
      scheduleProcessName: row.schedule_process_name,
      scheduleQuantity: number(row.schedule_quantity),
      scheduleUnit: row.schedule_unit,
      purchaseOrderId: row.purchase_order_id,
      purchaseOrderItemId: row.purchase_order_item_id,
      purchaseItemName: row.purchase_item_name,
      purchaseQuantity: number(row.purchase_quantity),
      purchaseUnit: row.purchase_unit,
      materialReceivingId: row.material_receiving_id,
      receivedQuantity: number(row.received_quantity),
      executionFeedbackId: row.execution_feedback_id,
      actualUsedQuantity: number(row.actual_used_quantity),
      varianceQuantity: number(row.variance_quantity),
      varianceRate: number(row.variance_rate),
      feedbackStatus: row.feedback_status || '',
      calibrationRuleId: row.calibration_rule_id,
      calibrationStatus: row.calibration_status || '',
      traceStatus: row.trace_status || 'PARTIAL',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function estimateItemTable(estimateType) {
    if (estimateType === 'BATHROOM') return 'bathroom_estimate_items';
    if (estimateType === 'KITCHEN') return 'kitchen_estimate_items';
    return 'full_remodeling_estimate_items';
  }

  function findImport(importId, estimateId) {
    if (importId) {
      return db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(importId);
    }
    const review = db.project.prepare(`
      SELECT import_id FROM lightbim_quantity_reviews
      WHERE estimate_id = ? AND import_id IS NOT NULL
      ORDER BY updated_at DESC LIMIT 1
    `).get(estimateId);
    return review?.import_id
      ? db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(review.import_id)
      : db.project.prepare('SELECT * FROM lightbim_imports WHERE created_estimate_id = ? ORDER BY created_at DESC LIMIT 1').get(estimateId);
  }

  function parseImport(row) {
    return row ? fromJson(row.raw_json, {}) || {} : {};
  }

  function spaces(payload) {
    return Array.isArray(payload?.bocEstimateInput?.spaces)
      ? payload.bocEstimateInput.spaces
      : Array.isArray(payload?.project?.spaces) ? payload.project.spaces : [];
  }

  function spaceType(space) {
    const value = `${space.type || space.space_type || ''} ${space.name || space.space_name || ''}`.toUpperCase();
    if (/BATH|욕실|화장실/.test(value)) return 'BATHROOM';
    if (/KITCHEN|주방/.test(value)) return 'KITCHEN';
    return value;
  }

  function sourceForKey(payload, key, quantity, unit) {
    const allSpaces = spaces(payload);
    if (key === 'bathroom_tile_area_m2' || (
      key === 'tile_area_m2' &&
      allSpaces.some((space) => spaceType(space) === 'BATHROOM') &&
      !number(payload?.quantities?.process_quantities?.kitchen_wall_tile_area_m2)
    )) {
      const room = allSpaces.find((space) => spaceType(space) === 'BATHROOM');
      if (room) return { type: 'SPACE', id: room.id || room.space_id, name: room.name || room.space_name || '욕실', quantity, unit };
    }
    if (key === 'kitchen_wall_tile_area_m2') {
      const room = allSpaces.find((space) => spaceType(space) === 'KITCHEN');
      if (room) return { type: 'SPACE', id: room.id || room.space_id, name: room.name || room.space_name || '주방', quantity, unit };
    }
    if (key === 'door_count' || key === 'window_count') {
      return { type: 'OPENING', id: key, name: key === 'door_count' ? '문' : '창호', quantity, unit };
    }
    if (PROCESS_LABELS[key]) {
      return { type: 'PROCESS_QUANTITY', id: key, name: PROCESS_LABELS[key], quantity, unit };
    }
    return {
      type: 'PROJECT_QUANTITY',
      id: payload?.project?.project_id || payload?.project?.id || 'PROJECT',
      name: payload?.project?.name || '프로젝트 전체 수량',
      quantity,
      unit
    };
  }

  function availableQuantities(payload) {
    const process = payload?.quantities?.process_quantities || {};
    const quantities = { ...process };
    const quantityBasis = payload?.bocEstimateInput?.quantity_basis || {};
    Object.keys(quantityBasis).forEach((key) => {
      const raw = quantityBasis[key];
      if (typeof raw === 'number') quantities[key] = raw;
    });
    const bath = spaces(payload).some((space) => spaceType(space) === 'BATHROOM');
    if (bath && !quantities.bathroom_tile_area_m2 && quantities.tile_area_m2) {
      quantities.bathroom_tile_area_m2 = quantities.tile_area_m2;
    }
    return quantities;
  }

  function hasCriticalWarning(estimateType, estimateId, basisKey) {
    const row = db.project.prepare(`
      SELECT warning_code FROM lightbim_quantity_reviews
      WHERE estimate_type = ? AND estimate_id = ? AND quantity_basis_key = ?
      ORDER BY updated_at DESC LIMIT 1
    `).get(estimateType, estimateId, basisKey);
    return CRITICAL_WARNINGS.includes(row?.warning_code);
  }

  function traceStatus(trace) {
    if (
      Math.abs(number(trace.variance_rate)) > 0.1 ||
      REVIEW_STATUSES.includes(trace.feedback_status) ||
      hasCriticalWarning(trace.estimate_type, trace.estimate_id, trace.source_quantity_key)
    ) return 'REVIEW_REQUIRED';
    if (!trace.estimate_item_id) return 'MISSING';
    if (trace.schedule_item_id && trace.purchase_order_item_id && trace.execution_feedback_id) return 'LINKED';
    return 'PARTIAL';
  }

  function upsertTrace(trace) {
    const createdAt = nowIso();
    const status = traceStatus(trace);
    db.project.prepare(`
      INSERT OR REPLACE INTO lightbim_traceability_links (
        id, import_id, project_id, estimate_type, estimate_id,
        source_entity_type, source_entity_id, source_entity_name, source_quantity_key,
        source_quantity, source_unit, estimate_item_id, estimate_item_name,
        estimate_quantity, estimate_unit, schedule_item_id, schedule_process_name,
        schedule_quantity, schedule_unit, purchase_order_id, purchase_order_item_id,
        purchase_item_name, purchase_quantity, purchase_unit, material_receiving_id,
        received_quantity, execution_feedback_id, actual_used_quantity, variance_quantity,
        variance_rate, feedback_status, calibration_rule_id, calibration_status,
        trace_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM lightbim_traceability_links WHERE id = ?), ?), ?)
    `).run(
      trace.id,
      trace.import_id || null,
      trace.project_id || trace.estimate_id,
      trace.estimate_type,
      trace.estimate_id,
      trace.source_entity_type,
      trace.source_entity_id || '',
      trace.source_entity_name || '',
      trace.source_quantity_key,
      number(trace.source_quantity),
      trace.source_unit || '',
      trace.estimate_item_id || null,
      trace.estimate_item_name || null,
      trace.estimate_quantity == null ? null : number(trace.estimate_quantity),
      trace.estimate_unit || null,
      trace.schedule_item_id || null,
      trace.schedule_process_name || null,
      trace.schedule_quantity == null ? null : number(trace.schedule_quantity),
      trace.schedule_unit || null,
      trace.purchase_order_id || null,
      trace.purchase_order_item_id || null,
      trace.purchase_item_name || null,
      trace.purchase_quantity == null ? null : number(trace.purchase_quantity),
      trace.purchase_unit || null,
      trace.material_receiving_id || null,
      trace.received_quantity == null ? null : number(trace.received_quantity),
      trace.execution_feedback_id || null,
      trace.actual_used_quantity == null ? null : number(trace.actual_used_quantity),
      trace.variance_quantity == null ? null : number(trace.variance_quantity),
      trace.variance_rate == null ? null : number(trace.variance_rate),
      trace.feedback_status || null,
      trace.calibration_rule_id || null,
      trace.calibration_status || null,
      status,
      trace.id,
      createdAt,
      createdAt
    );
    return mapRow(db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE id = ?').get(trace.id));
  }

  function createTraceabilityForEstimate(importId, estimateType, estimateId) {
    const importRow = findImport(importId, estimateId);
    const payload = parseImport(importRow);
    const table = estimateItemTable(estimateType);
    const reviews = db.project.prepare(`
      SELECT * FROM lightbim_quantity_reviews
      WHERE estimate_type = ? AND estimate_id = ? ORDER BY id
    `).all(estimateType, estimateId);
    const savedItems = db.project.prepare(`SELECT * FROM ${table} WHERE estimate_id = ? ORDER BY id`).all(estimateId);
    const byId = new Map(savedItems.map((item) => [item.id, item]));
    const linkedKeys = new Set();
    reviews.filter((review) => review.quantity_basis_key).forEach((review) => {
      const saved = byId.get(review.estimate_item_id);
      const source = sourceForKey(payload, review.quantity_basis_key, review.lightbim_quantity ?? review.current_quantity, review.unit);
      linkedKeys.add(review.quantity_basis_key);
      upsertTrace({
        id: `LBIM-TRACE-${cleanId(estimateId)}-${cleanId(review.estimate_item_id)}`,
        import_id: importRow?.id || review.import_id,
        project_id: estimateId,
        estimate_type: estimateType,
        estimate_id: estimateId,
        source_entity_type: source.type,
        source_entity_id: source.id,
        source_entity_name: source.name,
        source_quantity_key: review.quantity_basis_key,
        source_quantity: source.quantity,
        source_unit: source.unit,
        estimate_item_id: review.estimate_item_id,
        estimate_item_name: saved?.item_name || review.item_name,
        estimate_quantity: saved?.quantity ?? review.current_quantity,
        estimate_unit: saved?.unit || review.unit
      });
    });
    Object.entries(availableQuantities(payload)).forEach(([key, value]) => {
      if (key === 'bathroom_tile_area_m2' && linkedKeys.has('tile_area_m2')) return;
      if (linkedKeys.has(key) || number(value) <= 0 || !PROCESS_LABELS[key]) return;
      const source = sourceForKey(payload, key, value, key.endsWith('_count') ? '개' : key.endsWith('_m') ? 'm' : '㎡');
      upsertTrace({
        id: `LBIM-TRACE-${cleanId(estimateId)}-${cleanId(key)}-MISSING`,
        import_id: importRow?.id || importId,
        project_id: estimateId,
        estimate_type: estimateType,
        estimate_id: estimateId,
        source_entity_type: source.type,
        source_entity_id: source.id,
        source_entity_name: source.name,
        source_quantity_key: key,
        source_quantity: value,
        source_unit: source.unit
      });
    });
    return getTraceabilitySummary({ importId: importRow?.id || importId, estimateId });
  }

  function updateTraceabilityFromSchedule(estimateId, scheduleId = '') {
    const schedule = scheduleId
      ? db.project.prepare('SELECT * FROM construction_schedules WHERE id = ?').get(scheduleId)
      : db.project.prepare('SELECT * FROM construction_schedules WHERE estimate_id = ? ORDER BY updated_at DESC LIMIT 1').get(estimateId);
    if (!schedule) return getTraceabilitySummary({ estimateId });
    const items = db.project.prepare('SELECT * FROM construction_schedule_items WHERE schedule_id = ? ORDER BY sort_order').all(schedule.id);
    const links = db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE estimate_id = ?').all(estimateId);
    links.forEach((link) => {
      const item = items.find((candidate) => basisKeysForText(candidate.process_name || '').includes(link.source_quantity_key));
      if (!item) return;
      upsertTrace({
        ...link,
        schedule_item_id: item.id,
        schedule_process_name: item.process_name,
        schedule_quantity: item.quantity,
        schedule_unit: item.unit
      });
    });
    return getTraceabilitySummary({ estimateId });
  }

  function createTraceabilityForPurchaseOrder(estimateId, purchaseOrderId) {
    const items = db.project.prepare('SELECT * FROM purchase_order_items WHERE purchase_order_id = ? ORDER BY id').all(purchaseOrderId);
    const links = db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE estimate_id = ?').all(estimateId);
    links.forEach((link) => {
      const item = items.find((candidate) => candidate.quantity_basis_key === link.source_quantity_key);
      if (!item) return;
      const feedback = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE purchase_order_item_id = ?').get(item.id);
      upsertTrace({
        ...link,
        purchase_order_id: purchaseOrderId,
        purchase_order_item_id: item.id,
        purchase_item_name: item.item_name,
        purchase_quantity: item.order_quantity ?? item.quantity,
        purchase_unit: item.unit,
        execution_feedback_id: feedback?.id,
        actual_used_quantity: feedback?.actual_used_quantity,
        variance_quantity: feedback?.variance_quantity,
        variance_rate: feedback?.variance_rate,
        feedback_status: feedback?.feedback_status
      });
    });
    return getTraceabilitySummary({ estimateId });
  }

  function updateTraceabilityFromReceiving(purchaseOrderId) {
    const links = db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE purchase_order_id = ?').all(purchaseOrderId);
    links.forEach((link) => {
      const receipt = db.project.prepare(`
        SELECT MAX(receiving_log_id) AS receiving_log_id, SUM(received_quantity) AS received_quantity
        FROM material_receiving_logs WHERE purchase_order_id = ? AND item_name_ko = ?
      `).get(purchaseOrderId, link.purchase_item_name);
      const feedback = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE purchase_order_item_id = ?').get(link.purchase_order_item_id);
      upsertTrace({
        ...link,
        material_receiving_id: receipt?.receiving_log_id || link.material_receiving_id,
        received_quantity: receipt?.received_quantity ?? link.received_quantity,
        execution_feedback_id: feedback?.id || link.execution_feedback_id,
        actual_used_quantity: feedback?.actual_used_quantity,
        variance_quantity: feedback?.variance_quantity,
        variance_rate: feedback?.variance_rate,
        feedback_status: feedback?.feedback_status
      });
    });
    return getTraceabilitySummary({ purchaseOrderId });
  }

  function updateTraceabilityFromExecutionFeedback(selector = {}) {
    const query = typeof selector === 'string' ? { projectId: selector } : selector;
    let where = '1 = 1';
    let params = [];
    if (query.feedbackId) {
      where = 'id = ?';
      params = [query.feedbackId];
    } else if (query.estimateId) {
      where = 'estimate_id = ?';
      params = [query.estimateId];
    } else if (query.projectId) {
      where = 'project_id = ?';
      params = [query.projectId];
    }
    const feedbackRows = db.project.prepare(`SELECT * FROM lightbim_execution_quantity_feedback WHERE ${where}`).all(...params);
    feedbackRows.forEach((feedback) => {
      const links = db.project.prepare(`
        SELECT * FROM lightbim_traceability_links
        WHERE purchase_order_item_id = ? OR execution_feedback_id = ?
      `).all(feedback.purchase_order_item_id, feedback.id);
      const ruleId = `ECR-LBIM-${feedback.id}`;
      const rule = db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(ruleId);
      links.forEach((link) => upsertTrace({
        ...link,
        execution_feedback_id: feedback.id,
        actual_used_quantity: feedback.actual_used_quantity,
        variance_quantity: feedback.variance_quantity,
        variance_rate: feedback.variance_rate,
        feedback_status: feedback.feedback_status,
        calibration_rule_id: rule?.id || link.calibration_rule_id,
        calibration_status: rule?.status || link.calibration_status
      }));
    });
    return getTraceabilitySummary(query);
  }

  function getTraceabilityByImport(importId) {
    return db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE import_id = ? ORDER BY source_entity_name, source_quantity_key').all(importId).map(mapRow);
  }

  function getTraceabilityByEstimate(estimateType, estimateId) {
    const rows = estimateType
      ? db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE estimate_type = ? AND estimate_id = ? ORDER BY source_entity_name, source_quantity_key').all(estimateType, estimateId)
      : db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE estimate_id = ? ORDER BY source_entity_name, source_quantity_key').all(estimateId);
    return rows.map(mapRow);
  }

  function getTraceabilityBySpace(importId, spaceId) {
    const items = db.project.prepare(`
      SELECT * FROM lightbim_traceability_links
      WHERE import_id = ? AND source_entity_type = 'SPACE' AND source_entity_id = ?
      ORDER BY source_quantity_key
    `).all(importId, spaceId).map(mapRow);
    return { spaceId, items, itemCount: items.length };
  }

  function selectedRows(selector = {}) {
    if (selector.importId) return getTraceabilityByImport(selector.importId);
    if (selector.estimateId) return getTraceabilityByEstimate(selector.estimateType || '', selector.estimateId);
    if (selector.purchaseOrderId) {
      return db.project.prepare('SELECT * FROM lightbim_traceability_links WHERE purchase_order_id = ? ORDER BY source_entity_name, source_quantity_key').all(selector.purchaseOrderId).map(mapRow);
    }
    return db.project.prepare('SELECT * FROM lightbim_traceability_links ORDER BY updated_at DESC LIMIT 100').all().map(mapRow);
  }

  function getTraceabilitySummary(selector = {}) {
    const items = selectedRows(selector || {});
    const spaceMap = new Map();
    items.filter((item) => item.sourceEntityType === 'SPACE').forEach((item) => {
      const value = spaceMap.get(item.sourceEntityId) || {
        spaceId: item.sourceEntityId,
        spaceName: item.sourceEntityName,
        items: []
      };
      value.items.push(item);
      spaceMap.set(item.sourceEntityId, value);
    });
    return {
      items,
      spaces: Array.from(spaceMap.values()),
      summary: {
        totalCount: items.length,
        linkedCount: items.filter((item) => item.traceStatus === 'LINKED').length,
        partialCount: items.filter((item) => item.traceStatus === 'PARTIAL').length,
        missingCount: items.filter((item) => item.traceStatus === 'MISSING').length,
        reviewRequiredCount: items.filter((item) => item.traceStatus === 'REVIEW_REQUIRED').length,
        varianceCount: items.filter((item) => Math.abs(item.varianceRate) > 0).length
      }
    };
  }

  function findTraceByQuantityKey(estimateId, quantityBasisKey) {
    return db.project.prepare(`
      SELECT * FROM lightbim_traceability_links
      WHERE estimate_id = ? AND source_quantity_key = ? ORDER BY updated_at DESC
    `).all(estimateId, quantityBasisKey).map(mapRow);
  }

  return {
    createTraceabilityForEstimate,
    updateTraceabilityFromSchedule,
    createTraceabilityForPurchaseOrder,
    updateTraceabilityFromReceiving,
    updateTraceabilityFromExecutionFeedback,
    getTraceabilityByImport,
    getTraceabilityByEstimate,
    getTraceabilityBySpace,
    getTraceabilitySummary,
    findTraceByQuantityKey
  };
}

module.exports = {
  createLightBIMTraceabilityService
};
