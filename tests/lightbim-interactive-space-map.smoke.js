'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const { createEstimateDraftFromLightBIM } = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

function fixture(name) {
  return require(path.join(__dirname, 'fixtures', 'lightbim', name));
}

(async () => {
  const { normalizeMapGeometry, getSpaceCenter } = await import(pathToFileURL(path.join(__dirname, '..', 'ui', 'app', 'lightbim', 'lightBimMapUtils.ts')).href);
  const { service } = createTestService('boc-lightbim-space-map');
  const payload = fixture('real-minicad-export.lightbim.json');
  const imported = service.importLightBIMPayload({ payload, sourceFileName: 'real-minicad-space-map.json' });
  assert.ok(imported.ok, 'Real LightBIM geometry import succeeds');

  let map = service.getLightBIMSpaceMapData({ importId: imported.importId });
  assert.ok(map.project, 'Space map data loads from LightBIM import');
  assert.strictEqual(map.project.vertices.length, 13, 'Project vertices are returned');
  assert.strictEqual(map.spaces.length, 5, 'Project spaces are returned');

  const geometry = normalizeMapGeometry(map.project);
  assert.strictEqual(geometry.spaces.length, 5, 'View geometry normalizes safely');
  const bathroomGeometry = geometry.spaces.find((space) => space.id === 'space-bath');
  assert.ok(bathroomGeometry, 'Bathroom polygon is normalized');
  assert.deepStrictEqual(getSpaceCenter(bathroomGeometry.points), bathroomGeometry.center, 'Space centers are calculated');

  const draft = createEstimateDraftFromLightBIM(payload);
  const lightBimQuantityReviewState = [
    'bathroom_tile_area_m2',
    'kitchen_wall_tile_area_m2',
    'flooring_area_m2',
    'wallpaper_area_m2',
    'painting_area_m2',
    'ceiling_area_m2',
    'baseboard_length_m',
    'molding_length_m',
    'door_count',
    'window_count'
  ].reduce((state, key) => ({
    ...state,
    [key]: { reviewedStatus: 'CONFIRMED', quantitySource: 'LIGHTBIM' }
  }), {});
  const saved = service.saveFullRemodelingEstimate({
    ...draft.input,
    estimateId: 'FULL-LBIM-MAP-SMOKE',
    lightBimImportId: imported.importId,
    lightBimQuantityReviewState
  });

  map = service.getLightBIMSpaceMapDataByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
  let bathSummary = map.traceSummaries.find((item) => item.spaceId === 'space-bath');
  assert.ok(bathSummary.traces.length > 0, 'Space trace summaries are returned');
  assert.strictEqual(bathSummary.traceStatus, 'PARTIAL', 'Space status is PARTIAL before downstream generation');

  service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, startDate: '2026-05-21' });
  const purchase = service.generateFullRemodelingPurchaseOrder({ estimateId: saved.estimateId, requiredDate: '2026-05-20' });
  map = service.getLightBIMSpaceMapDataByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
  bathSummary = map.traceSummaries.find((item) => item.spaceId === 'space-bath');
  assert.strictEqual(bathSummary.traceStatus, 'LINKED', 'Space status LINKED is calculated when chain is connected');

  const bathTrace = bathSummary.traces.find((item) => item.purchaseItemName);
  const feedback = service.getLightBIMExecutionFeedbackSummary({ estimateId: saved.estimateId }).items.find((item) => item.itemName === bathTrace.purchaseItemName);
  assert.ok(feedback, 'Bathroom feedback exists for selected space');
  const purchaseItem = purchase.purchaseOrder.items.find((item) => item.itemName === feedback.itemName);
  service.createMaterialReceivingLog({
    projectId: saved.estimateId,
    purchaseOrderId: purchase.purchaseOrderId,
    receivedItems: [{ itemNameKo: purchaseItem.itemName, receivedQuantity: purchaseItem.order_quantity, unit: purchaseItem.unit }],
    actor: 'CEO'
  });
  service.updateLightBIMActualUsedQuantity({
    feedbackId: feedback.id,
    actualUsedQuantity: Number((feedback.reviewedQuantity * 1.12).toFixed(4)),
    remainingQuantity: 0,
    wasteQuantity: 0,
    reason: '공간 맵 위험 표시 검증',
    confirmedBy: '현장 관리자'
  });
  map = service.getLightBIMSpaceMapDataByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
  bathSummary = map.traceSummaries.find((item) => item.spaceId === 'space-bath');
  assert.strictEqual(bathSummary.traceStatus, 'REVIEW_REQUIRED', 'Space status REVIEW_REQUIRED is calculated for high variance');

  const emptyPayload = JSON.parse(JSON.stringify(payload));
  emptyPayload.project.vertices = [];
  emptyPayload.project.spaces = [];
  const emptyImport = service.importLightBIMPayload({ payload: emptyPayload, sourceFileName: 'empty-map.json' });
  const emptyMap = service.getLightBIMSpaceMapData({ importId: emptyImport.importId });
  assert.strictEqual(emptyMap.statusKo, '표시할 공간 정보가 없습니다.', 'Missing geometry returns safe empty state');

  const portal = JSON.stringify(service.getClientPortalData({ projectId: saved.estimateId }));
  ['traceSummaries', 'space-map', 'varianceRate', 'actualUsedQuantity'].forEach((forbidden) => {
    assert.ok(!portal.includes(forbidden), `Customer portal hides internal map metadata: ${forbidden}`);
  });

  console.log(JSON.stringify({
    ok: true,
    test: 'lightbim-interactive-space-map.smoke',
    spaceCount: geometry.spaces.length,
    selectedSpace: bathSummary.spaceName,
    selectedStatus: bathSummary.traceStatus
  }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
