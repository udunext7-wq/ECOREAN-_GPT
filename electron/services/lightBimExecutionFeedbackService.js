'use strict';

const MATCHED_RATE = 0.05;
const REVIEW_RATE = 0.1;
const LEFTOVER_RATE = 0.1;

function createLightBIMExecutionFeedbackService({ db, nowIso, toJson }) {
  function safeNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundQuantity(value) {
    return Math.round(safeNumber(value) * 10000) / 10000;
  }

  function rate(value, basis) {
    return basis > 0 ? Math.round((value / basis) * 10000) / 10000 : 0;
  }

  function mapRow(row) {
    if (!row) return null;
    return {
      id: row.id,
      importId: row.import_id,
      estimateType: row.estimate_type,
      estimateId: row.estimate_id,
      projectId: row.project_id,
      purchaseOrderId: row.purchase_order_id,
      purchaseOrderItemId: row.purchase_order_item_id,
      materialReceivingId: row.material_receiving_id,
      itemName: row.item_name,
      category: row.category,
      unit: row.unit,
      lightBimQuantity: safeNumber(row.lightbim_quantity),
      reviewedQuantity: safeNumber(row.reviewed_quantity),
      estimateQuantity: safeNumber(row.estimate_quantity),
      purchaseOrderQuantity: safeNumber(row.purchase_order_quantity),
      receivedQuantity: safeNumber(row.received_quantity),
      actualUsedQuantity: safeNumber(row.actual_used_quantity),
      remainingQuantity: safeNumber(row.remaining_quantity),
      wasteQuantity: safeNumber(row.waste_quantity),
      shortageQuantity: safeNumber(row.shortage_quantity),
      varianceQuantity: safeNumber(row.variance_quantity),
      varianceRate: safeNumber(row.variance_rate),
      varianceReason: row.variance_reason || '',
      feedbackStatus: row.feedback_status || 'PENDING',
      confirmedBy: row.confirmed_by || '',
      photoPath: row.photo_path || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function calculateQuantityVariance(feedback = {}, hasActual = true, hasReceiving = true) {
    const reviewed = safeNumber(feedback.reviewedQuantity ?? feedback.reviewed_quantity, safeNumber(feedback.lightBimQuantity ?? feedback.lightbim_quantity));
    const purchased = safeNumber(feedback.purchaseOrderQuantity ?? feedback.purchase_order_quantity);
    const received = safeNumber(feedback.receivedQuantity ?? feedback.received_quantity);
    const actual = safeNumber(feedback.actualUsedQuantity ?? feedback.actual_used_quantity);
    const waste = safeNumber(feedback.wasteQuantity ?? feedback.waste_quantity);
    const remaining = feedback.remainingQuantity != null || feedback.remaining_quantity != null
      ? safeNumber(feedback.remainingQuantity ?? feedback.remaining_quantity)
      : Math.max(0, received - actual - waste);
    const varianceQuantity = roundQuantity(actual - reviewed);
    const varianceRate = roundQuantity(rate(varianceQuantity, reviewed));
    const shortageQuantity = roundQuantity(Math.max(
      hasReceiving ? purchased - received : 0,
      hasActual ? actual - received : 0,
      0
    ));
    const remainingRate = received > 0 ? remaining / received : 0;
    const wasteRate = received > 0 ? waste / received : 0;
    let feedbackStatus = 'PENDING';
    let varianceLabelKo = '수량 입력 대기';

    if (hasReceiving && shortageQuantity > 0) {
      feedbackStatus = 'SHORTAGE';
      varianceLabelKo = '입고 부족';
    } else if (!hasActual) {
      feedbackStatus = 'IN_PROGRESS';
      varianceLabelKo = '사용량 입력 대기';
    } else if (wasteRate > LEFTOVER_RATE) {
      feedbackStatus = 'WASTE_HIGH';
      varianceLabelKo = '자재 손실 과다';
    } else if (remainingRate > LEFTOVER_RATE) {
      feedbackStatus = 'UNDER_USED';
      varianceLabelKo = '잔량 발생';
    } else if (varianceRate > REVIEW_RATE) {
      feedbackStatus = 'OVER_USED';
      varianceLabelKo = '현장 사용량 초과';
    } else if (Math.abs(varianceRate) > REVIEW_RATE) {
      feedbackStatus = 'UNDER_USED';
      varianceLabelKo = '잔량 발생';
    } else if (Math.abs(varianceRate) > MATCHED_RATE) {
      feedbackStatus = 'REVIEW_REQUIRED';
      varianceLabelKo = varianceRate > 0 ? '계획 수량 부족' : '잔량 발생';
    } else {
      feedbackStatus = 'MATCHED';
      varianceLabelKo = '정상 일치';
    }

    return {
      reviewedQuantity: roundQuantity(reviewed),
      remainingQuantity: roundQuantity(remaining),
      wasteQuantity: roundQuantity(waste),
      shortageQuantity,
      varianceQuantity,
      varianceRate,
      feedbackStatus,
      varianceLabelKo
    };
  }

  function estimateItemTable(estimateType) {
    if (estimateType === 'BATHROOM') return 'bathroom_estimate_items';
    if (estimateType === 'KITCHEN') return 'kitchen_estimate_items';
    return 'full_remodeling_estimate_items';
  }

  function createFeedbackFromPurchaseOrder({ estimateId, purchaseOrderId, projectId = estimateId, estimateType = 'FULL_REMODELING' }) {
    const createdAt = nowIso();
    const table = estimateItemTable(estimateType);
    const items = db.project.prepare(`
      SELECT *
      FROM purchase_order_items
      WHERE purchase_order_id = ?
        AND quantity_source IN ('USER_REVIEW', 'LIGHTBIM_REVIEWED', 'LIGHTBIM')
      ORDER BY id
    `).all(purchaseOrderId);
    const estimateItems = db.project.prepare(`SELECT * FROM ${table} WHERE estimate_id = ?`).all(estimateId);
    const estimateByName = new Map(estimateItems.map((item) => [item.item_name, item]));
    const insert = db.project.prepare(`
      INSERT OR IGNORE INTO lightbim_execution_quantity_feedback (
        id, import_id, estimate_type, estimate_id, project_id, purchase_order_id,
        purchase_order_item_id, material_receiving_id, item_name, category, unit,
        lightbim_quantity, reviewed_quantity, estimate_quantity, purchase_order_quantity,
        received_quantity, actual_used_quantity, remaining_quantity, waste_quantity,
        shortage_quantity, variance_quantity, variance_rate, variance_reason,
        feedback_status, confirmed_by, photo_path, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    items.forEach((item) => {
      const estimateItem = estimateByName.get(item.item_name) || {};
      const review = db.project.prepare(`
        SELECT * FROM lightbim_quantity_reviews
        WHERE estimate_id = ? AND item_name = ?
        ORDER BY updated_at DESC LIMIT 1
      `).get(estimateId, item.item_name);
      const lightBimQuantity = safeNumber(review?.lightbim_quantity, safeNumber(item.base_quantity, item.quantity));
      const reviewedQuantity = safeNumber(item.base_quantity, item.quantity);
      const id = `LBIM-FEEDBACK-${item.id}`;
      insert.run(
        id,
        review?.import_id || null,
        estimateType,
        estimateId,
        projectId,
        purchaseOrderId,
        item.id,
        null,
        item.item_name,
        item.quantity_basis_key || item.specification || item.item_name,
        item.unit,
        lightBimQuantity,
        reviewedQuantity,
        safeNumber(estimateItem.quantity, reviewedQuantity),
        safeNumber(item.order_quantity, item.quantity),
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        '',
        'PENDING',
        '',
        '',
        createdAt,
        createdAt
      );
    });
    return getExecutionFeedbackSummary({ estimateId, projectId });
  }

  function syncReceivingQuantities(purchaseOrderId, projectId = '') {
    const createdAt = nowIso();
    const feedbackRows = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE purchase_order_id = ?').all(purchaseOrderId);
    feedbackRows.forEach((row) => {
      const receipt = db.project.prepare(`
        SELECT receiving_log_id, SUM(received_quantity) AS received_quantity, COUNT(*) AS receiving_count
        FROM material_receiving_logs
        WHERE purchase_order_id = ? AND item_name_ko = ?
      `).get(purchaseOrderId, row.item_name);
      if (!receipt || !receipt.receiving_count) return;
      const calculation = calculateQuantityVariance({
        ...row,
        received_quantity: receipt.received_quantity
      }, row.actual_used_quantity > 0, true);
      db.project.prepare(`
        UPDATE lightbim_execution_quantity_feedback
        SET project_id = ?, material_receiving_id = ?, received_quantity = ?,
          remaining_quantity = ?, shortage_quantity = ?, variance_quantity = ?,
          variance_rate = ?, feedback_status = ?, updated_at = ?
        WHERE id = ?
      `).run(
        projectId || row.project_id,
        receipt.receiving_log_id || row.material_receiving_id,
        safeNumber(receipt.received_quantity),
        calculation.remainingQuantity,
        calculation.shortageQuantity,
        calculation.varianceQuantity,
        calculation.varianceRate,
        calculation.feedbackStatus,
        createdAt,
        row.id
      );
      if (calculation.feedbackStatus === 'SHORTAGE') {
        createRiskAlert(row, calculation, '입고 수량이 발주 수량보다 부족합니다.');
      }
    });
    return getExecutionFeedbackSummary({ projectId, purchaseOrderId });
  }

  function createRiskAlert(row, calculation, reasonKo) {
    const createdAt = nowIso();
    const titleKo = calculation.feedbackStatus === 'SHORTAGE'
      ? `${row.item_name} 입고 수량이 부족합니다.`
      : `${row.item_name} 실제 사용량이 도면 수량보다 ${(calculation.varianceRate * 100).toFixed(1)}% 초과했습니다.`;
    db.project.prepare(`
      INSERT OR REPLACE INTO ceo_decision_queue (
        decision_id, source_module, entity_type, entity_id, decision_type, title_ko,
        project_id, site_name_ko, financial_impact, risk_level, required_action_ko,
        deadline, status, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM ceo_decision_queue WHERE decision_id = ?), ?), ?)
    `).run(
      `CEO-LBIM-FEEDBACK-${row.id}`,
      'LightBIMExecutionFeedback',
      'QuantityFeedback',
      row.id,
      calculation.feedbackStatus,
      titleKo,
      row.project_id,
      row.project_id,
      0,
      'RED',
      '수량 차이 및 보정 검토',
      createdAt.slice(0, 10),
      'PENDING',
      toJson({ calculation, reasonKo }),
      `CEO-LBIM-FEEDBACK-${row.id}`,
      createdAt,
      createdAt
    );
    db.project.prepare(`
      INSERT OR REPLACE INTO red_alert_events (
        red_alert_id, source_module, entity_id, project_id, title_ko, reason_ko,
        severity, financial_impact, blocking_required, status, created_at, resolved_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM red_alert_events WHERE red_alert_id = ?), ?), NULL, ?)
    `).run(
      `RED-LBIM-FEEDBACK-${row.id}`,
      'LightBIMExecutionFeedback',
      row.id,
      row.project_id,
      titleKo,
      reasonKo,
      'RED',
      0,
      0,
      'ACTIVE',
      `RED-LBIM-FEEDBACK-${row.id}`,
      createdAt,
      toJson({ calculation })
    );
  }

  function updateActualUsedQuantity(feedbackId, actualUsedQuantity, reason = '', options = {}) {
    const row = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE id = ?').get(feedbackId);
    if (!row) throw new Error('실행 피드백 항목을 찾을 수 없습니다.');
    const hasReceiving = safeNumber(row.received_quantity) > 0;
    const calculation = calculateQuantityVariance({
      ...row,
      actual_used_quantity: actualUsedQuantity,
      remaining_quantity: options.remainingQuantity,
      waste_quantity: options.wasteQuantity
    }, true, hasReceiving);
    const updatedAt = nowIso();
    db.project.prepare(`
      UPDATE lightbim_execution_quantity_feedback
      SET actual_used_quantity = ?, remaining_quantity = ?, waste_quantity = ?,
        shortage_quantity = ?, variance_quantity = ?, variance_rate = ?,
        variance_reason = ?, feedback_status = ?, confirmed_by = ?, photo_path = ?, updated_at = ?
      WHERE id = ?
    `).run(
      roundQuantity(actualUsedQuantity),
      calculation.remainingQuantity,
      calculation.wasteQuantity,
      calculation.shortageQuantity,
      calculation.varianceQuantity,
      calculation.varianceRate,
      reason || '',
      calculation.feedbackStatus,
      options.confirmedBy || '',
      options.photoPath || '',
      updatedAt,
      feedbackId
    );
    const updated = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE id = ?').get(feedbackId);
    if (['OVER_USED', 'WASTE_HIGH', 'SHORTAGE'].includes(calculation.feedbackStatus)) {
      createRiskAlert(updated, calculation, reason || calculation.varianceLabelKo);
    }
    return { feedback: mapRow(updated), analysis: calculation };
  }

  function closeFeedbackItem(feedbackId) {
    db.project.prepare(`
      UPDATE lightbim_execution_quantity_feedback SET feedback_status = 'CLOSED', updated_at = ? WHERE id = ?
    `).run(nowIso(), feedbackId);
    return mapRow(db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE id = ?').get(feedbackId));
  }

  function generateCalibrationRecommendation(feedbackId) {
    const row = db.project.prepare('SELECT * FROM lightbim_execution_quantity_feedback WHERE id = ?').get(feedbackId);
    if (!row) throw new Error('실행 피드백 항목을 찾을 수 없습니다.');
    const purchaseItem = db.project.prepare('SELECT * FROM purchase_order_items WHERE id = ?').get(row.purchase_order_item_id) || {};
    const currentFactor = safeNumber(purchaseItem.waste_factor, 1);
    const raiseFactor = row.feedback_status === 'OVER_USED' || row.feedback_status === 'SHORTAGE';
    const recommendedFactor = roundQuantity(raiseFactor ? Math.min(1.3, currentFactor + 0.05) : Math.max(1, currentFactor - 0.03));
    const reason = raiseFactor
      ? `${row.item_name} 실제 사용량/부족 수량 편차가 발생하여 발주 할증률 상향 검토가 필요합니다.`
      : `${row.item_name} 잔량 또는 손실이 커 발주 할증률 하향 검토가 필요합니다.`;
    const createdAt = nowIso();
    const purchaseRuleId = `LBIM-PO-CAL-${row.id}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO lightbim_purchase_quantity_calibration_rules (
        id, item_category, material_name, unit, current_waste_factor,
        recommended_waste_factor, reason, source_feedback_ids, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM lightbim_purchase_quantity_calibration_rules WHERE id = ?), ?), ?)
    `).run(
      purchaseRuleId,
      row.category,
      row.item_name,
      row.unit,
      currentFactor,
      recommendedFactor,
      reason,
      toJson([row.id]),
      'PENDING_APPROVAL',
      purchaseRuleId,
      createdAt,
      createdAt
    );
    const estimateRuleId = `ECR-LBIM-${row.id}`;
    db.project.prepare(`
      INSERT OR REPLACE INTO estimate_calibration_rules (
        id, source_project_id, source_category, rule_type, adjustment_target,
        adjustment_value, reason, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM estimate_calibration_rules WHERE id = ?), ?))
    `).run(
      estimateRuleId,
      row.project_id,
      row.category,
      'LIGHTBIM_QUANTITY_VARIANCE',
      row.item_name,
      Math.abs(safeNumber(row.variance_rate)),
      reason,
      'PENDING_APPROVAL',
      estimateRuleId,
      createdAt
    );
    createRiskAlert(row, { feedbackStatus: row.feedback_status, varianceRate: row.variance_rate }, '반복 수량 차이로 보정 승인이 필요합니다.');
    return {
      estimateCalibrationRule: db.project.prepare('SELECT * FROM estimate_calibration_rules WHERE id = ?').get(estimateRuleId),
      purchaseCalibrationRule: db.project.prepare('SELECT * FROM lightbim_purchase_quantity_calibration_rules WHERE id = ?').get(purchaseRuleId)
    };
  }

  function getFeedbackByEstimate(estimateType, estimateId) {
    return db.project.prepare(`
      SELECT * FROM lightbim_execution_quantity_feedback
      WHERE estimate_type = ? AND estimate_id = ? ORDER BY item_name
    `).all(estimateType, estimateId).map(mapRow);
  }

  function getFeedbackByProject(projectId) {
    return db.project.prepare(`
      SELECT * FROM lightbim_execution_quantity_feedback
      WHERE project_id = ? ORDER BY item_name
    `).all(projectId).map(mapRow);
  }

  function getExecutionFeedbackSummary({ projectId = '', estimateId = '', purchaseOrderId = '' } = {}) {
    const where = projectId ? 'project_id = ?' : estimateId ? 'estimate_id = ?' : purchaseOrderId ? 'purchase_order_id = ?' : '1 = 1';
    const value = projectId || estimateId || purchaseOrderId;
    const rows = db.project.prepare(`
      SELECT * FROM lightbim_execution_quantity_feedback WHERE ${where} ORDER BY updated_at DESC
    `).all(...(value ? [value] : [])).map(mapRow);
    return {
      items: rows,
      summary: {
        totalCount: rows.length,
        matchedCount: rows.filter((item) => item.feedbackStatus === 'MATCHED').length,
        overUsedCount: rows.filter((item) => item.feedbackStatus === 'OVER_USED').length,
        shortageCount: rows.filter((item) => item.feedbackStatus === 'SHORTAGE').length,
        wasteHighCount: rows.filter((item) => ['WASTE_HIGH', 'UNDER_USED'].includes(item.feedbackStatus)).length,
        calibrationRequiredCount: rows.filter((item) => ['OVER_USED', 'SHORTAGE', 'WASTE_HIGH', 'UNDER_USED', 'REVIEW_REQUIRED'].includes(item.feedbackStatus)).length
      },
      purchaseCalibrationRules: db.project.prepare(`
        SELECT * FROM lightbim_purchase_quantity_calibration_rules
        ORDER BY updated_at DESC LIMIT 30
      `).all()
    };
  }

  return {
    calculateQuantityVariance,
    createFeedbackFromPurchaseOrder,
    syncReceivingQuantities,
    getFeedbackByProject,
    getFeedbackByEstimate,
    updateActualUsedQuantity,
    closeFeedbackItem,
    generateCalibrationRecommendation,
    getExecutionFeedbackSummary
  };
}

module.exports = {
  MATCHED_RATE,
  REVIEW_RATE,
  LEFTOVER_RATE,
  createLightBIMExecutionFeedbackService
};
