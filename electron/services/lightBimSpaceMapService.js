'use strict';

function createLightBIMSpaceMapService({ db, fromJson }) {
  function parseJson(value, fallback = {}) {
    return fromJson(value, fallback) || fallback;
  }

  function findImport(importId, estimateId = '') {
    if (importId) return db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(importId);
    if (!estimateId) return db.project.prepare("SELECT * FROM lightbim_imports WHERE status = 'SUCCESS' ORDER BY created_at DESC LIMIT 1").get();
    const review = db.project.prepare(`
      SELECT import_id FROM lightbim_quantity_reviews
      WHERE estimate_id = ? AND import_id IS NOT NULL
      ORDER BY updated_at DESC LIMIT 1
    `).get(estimateId);
    if (review?.import_id) return db.project.prepare('SELECT * FROM lightbim_imports WHERE id = ?').get(review.import_id);
    return db.project.prepare('SELECT * FROM lightbim_imports WHERE created_estimate_id = ? ORDER BY created_at DESC LIMIT 1').get(estimateId);
  }

  function mapTrace(row) {
    return {
      id: row.id,
      sourceEntityType: row.source_entity_type,
      sourceEntityId: row.source_entity_id,
      sourceEntityName: row.source_entity_name,
      sourceQuantityKey: row.source_quantity_key,
      sourceQuantity: Number(row.source_quantity || 0),
      sourceUnit: row.source_unit || '',
      estimateItemName: row.estimate_item_name || '',
      estimateQuantity: Number(row.estimate_quantity || 0),
      estimateUnit: row.estimate_unit || '',
      scheduleProcessName: row.schedule_process_name || '',
      scheduleQuantity: Number(row.schedule_quantity || 0),
      purchaseOrderItemId: row.purchase_order_item_id || '',
      purchaseItemName: row.purchase_item_name || '',
      purchaseQuantity: Number(row.purchase_quantity || 0),
      receivedQuantity: Number(row.received_quantity || 0),
      actualUsedQuantity: Number(row.actual_used_quantity || 0),
      varianceQuantity: Number(row.variance_quantity || 0),
      varianceRate: Number(row.variance_rate || 0),
      feedbackStatus: row.feedback_status || '',
      traceStatus: row.trace_status || 'PARTIAL'
    };
  }

  function statusForTraces(traces) {
    if (traces.some((item) => item.traceStatus === 'REVIEW_REQUIRED')) return 'REVIEW_REQUIRED';
    if (traces.some((item) => item.traceStatus === 'MISSING')) return 'MISSING';
    if (!traces.length || traces.some((item) => item.traceStatus === 'PARTIAL')) return 'PARTIAL';
    return 'LINKED';
  }

  function warningForSpace(warnings, spaceId) {
    return warnings.filter((warning) =>
      String(warning.entity_id || warning.entityId || '') === String(spaceId) ||
      !warning.entity_id
    );
  }

  function buildSpaceTraceSummaries(importRow, payload) {
    if (!importRow) return [];
    const project = payload.project || {};
    const spaces = Array.isArray(project.spaces) ? project.spaces : [];
    const warnings = Array.isArray(payload.quantities?.warnings) ? payload.quantities.warnings : [];
    const links = db.project.prepare(`
      SELECT * FROM lightbim_traceability_links
      WHERE import_id = ? ORDER BY source_entity_name, source_quantity_key
    `).all(importRow.id).map(mapTrace);
    return spaces.map((space) => {
      const traces = links.filter((item) => item.sourceEntityType === 'SPACE' && item.sourceEntityId === space.id);
      const spaceWarnings = warningForSpace(warnings, space.id);
      const traceStatus = statusForTraces(traces);
      return {
        spaceId: space.id,
        spaceName: space.name || space.id,
        spaceType: space.type || 'ETC',
        areaM2: Number(space.area_m2 || 0),
        perimeterM: Number(space.perimeter_m || 0),
        traceStatus: spaceWarnings.some((warning) => String(warning.severity).toUpperCase() === 'CRITICAL') ? 'REVIEW_REQUIRED' : traceStatus,
        traces,
        warnings: spaceWarnings
      };
    });
  }

  function emptyData(messageKo) {
    return {
      project: null,
      spaces: [],
      walls: [],
      openings: [],
      traceSummaries: [],
      warnings: [],
      statusKo: messageKo || '표시할 공간 정보가 없습니다.'
    };
  }

  function getSpaceMapData(importId) {
    const importRow = findImport(importId);
    if (!importRow) return emptyData('도면 정보를 불러오지 못했습니다.');
    const payload = parseJson(importRow.raw_json);
    const project = payload.project || null;
    if (!project || !Array.isArray(project.spaces) || !project.spaces.length) {
      return emptyData('표시할 공간 정보가 없습니다.');
    }
    return {
      importId: importRow.id,
      estimateType: importRow.created_estimate_type || importRow.detected_estimate_type,
      estimateId: importRow.created_estimate_id || '',
      project,
      spaces: project.spaces || [],
      walls: project.walls || [],
      openings: project.openings || [],
      traceSummaries: buildSpaceTraceSummaries(importRow, payload),
      warnings: Array.isArray(payload.quantities?.warnings) ? payload.quantities.warnings : [],
      statusKo: '도면 공간 정보를 불러왔습니다.'
    };
  }

  function getSpaceMapDataByEstimate(estimateType, estimateId) {
    const importRow = findImport('', estimateId);
    if (!importRow) return emptyData('도면 정보를 불러오지 못했습니다.');
    return { ...getSpaceMapData(importRow.id), estimateType: estimateType || importRow.created_estimate_type || importRow.detected_estimate_type, estimateId };
  }

  function getSpaceTraceSummary(importId, spaceId) {
    const payload = getSpaceMapData(importId);
    return payload.traceSummaries.find((item) => item.spaceId === spaceId) || {
      spaceId,
      traces: [],
      warnings: [],
      traceStatus: 'PARTIAL',
      statusKo: '선택한 공간의 추적 데이터가 없습니다.'
    };
  }

  function getAllSpaceTraceSummaries(importId) {
    const payload = getSpaceMapData(importId);
    const items = payload.traceSummaries || [];
    return {
      items,
      summary: {
        totalCount: items.length,
        linkedCount: items.filter((item) => item.traceStatus === 'LINKED').length,
        partialCount: items.filter((item) => item.traceStatus === 'PARTIAL').length,
        missingCount: items.filter((item) => item.traceStatus === 'MISSING').length,
        reviewRequiredCount: items.filter((item) => item.traceStatus === 'REVIEW_REQUIRED').length
      }
    };
  }

  return {
    getSpaceMapData,
    getSpaceMapDataByEstimate,
    getSpaceTraceSummary,
    getAllSpaceTraceSummaries
  };
}

module.exports = {
  createLightBIMSpaceMapService
};
