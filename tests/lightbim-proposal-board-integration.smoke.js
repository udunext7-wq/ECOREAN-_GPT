'use strict';

const assert = require('assert');
const path = require('path');
const { createEstimateDraftFromLightBIM } = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

const payload = require(path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json'));
const { service } = createTestService('boc-lightbim-proposal-board-integration');
const imported = service.importLightBIMPayload({ payload, sourceFileName: 'proposal-board-lightbim.json' });
const draft = createEstimateDraftFromLightBIM(payload);
const saved = service.saveFullRemodelingEstimate({
  ...draft.input,
  estimateId: 'FULL-LIGHTBIM-PROPOSAL-BOARD',
  customerName: '제안 고객',
  siteName: '제안 현장',
  lightBimImportId: imported.importId
});

service.saveMoodboardProfile({
  estimateId: saved.estimateId,
  style: '모던 미니멀',
  colorTone: '웜 화이트',
  primaryMaterials: '오크 바닥, 포세린 타일',
  lightingMood: '간접 조명',
  referenceNotes: '차분한 자연 소재'
});

function createResult({ id, spaceId, spaceName, spaceType, imagePath, action }) {
  const brief = service.createVisualizationBrief({
    briefId: `BRIEF-${id}`,
    estimateType: 'full_remodel',
    estimateId: saved.estimateId,
    spaceId,
    spaceName,
    spaceType,
    projectName: 'LightBIM Proposal Board',
    customerName: '제안 고객'
  });
  const job = service.queueVisualizationJob({ briefId: brief.briefId, promptType: 'PERSPECTIVE', provider: 'MANUAL' });
  const attached = service.attachVisualizationResult({ jobId: job.jobId, imagePath, resultType: 'PERSPECTIVE' });
  service.decideVisualizationResult({ resultId: attached.resultId, action, reviewNote: action });
  return attached.resultId;
}

const bathroomApprovedId = createResult({
  id: 'BATH-APPROVED',
  spaceId: 'space-bath',
  spaceName: '욕실',
  spaceType: 'BATHROOM',
  imagePath: 'C:/proposal/bath-approved.png',
  action: 'SET_PROPOSAL'
});
createResult({
  id: 'KITCHEN-APPROVED',
  spaceName: '주방',
  spaceType: 'KITCHEN',
  imagePath: 'C:/proposal/kitchen-approved.png',
  action: 'APPROVE'
});
const rejectedId = createResult({
  id: 'BATH-REJECTED',
  spaceId: 'space-bath',
  spaceName: '욕실',
  spaceType: 'BATHROOM',
  imagePath: 'C:/proposal/bath-rejected.png',
  action: 'REJECT'
});

const a3 = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  projectName: 'LightBIM Proposal Board',
  title: '고객 디자인 제안서',
  printFormat: 'A3_LANDSCAPE',
  estimateSummary: {
    totalAmount: 45800000,
    totalCost: 30000000,
    scheduleDays: 28,
    processGroups: [{ processKo: '전체 리모델링', amount: 45800000, internalCost: 30000000, margin: 15800000, pceDecision: 'SCALE' }]
  }
});

const mapSection = a3.layout.sections.find((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP');
const scopeSection = a3.layout.sections.find((section) => section.sectionType === 'CUSTOMER_SPACE_SCOPE');
assert.ok(mapSection, 'Customer proposal map section payload is generated');
assert.ok(scopeSection && scopeSection.tableArea.rows.length === 5, 'Space-scope table is generated');
assert.strictEqual(mapSection.customer_safe, true, 'Map section is marked customer-safe');
assert.strictEqual(mapSection.approved_images.length, 2, 'Approved images are included');
assert.ok(mapSection.spaces.find((space) => space.id === 'space-bath').approvedImages.some((image) => image.id === bathroomApprovedId), 'Approved image is matched by space id');
assert.ok(mapSection.spaces.find((space) => space.name === '주방').approvedImages.length === 1, 'Approved image is matched by space fallback');
assert.ok(!JSON.stringify(mapSection).includes(rejectedId), 'Rejected images are not included');
assert.ok(a3.layout.sections.findIndex((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP') < a3.layout.sections.findIndex((section) => section.sectionType === 'MOODBOARD'), 'Proposal page order places map before moodboard');
assert.strictEqual(mapSection.map_payload.layout.composition, 'MAP_LEFT_SCOPE_RIGHT', 'A3 landscape layout includes map safely');

const a4 = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  projectName: 'Portrait Proposal Board',
  title: '세로 제안서',
  printFormat: 'A4_PORTRAIT'
});
assert.strictEqual(
  a4.layout.sections.find((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP').map_payload.layout.composition,
  'MAP_THEN_TABLE',
  'A4 portrait layout includes map safely'
);

const exportPayload = JSON.stringify(a3.layout.customerPdfPayload).toLowerCase();
[
  'internalcost',
  'margin',
  'pcedecision',
  'vendor',
  'laborcost',
  'purchase',
  'receiving',
  'actual_used',
  'variance',
  'calibration',
  'red_alert',
  'internal'
].forEach((forbidden) => {
  assert.ok(!exportPayload.includes(forbidden), `Export payload does not contain forbidden customer key: ${forbidden}`);
});
assert.strictEqual(a3.layout.customerPdfPayload.customer_safe, true, 'Customer PDF payload is sanitized');
assert.strictEqual(mapSection.customer_estimate_summary.totalAmount, 45800000, 'Customer estimate summary is included');
assert.ok(!Object.prototype.hasOwnProperty.call(mapSection.customer_estimate_summary, 'totalCost'), 'Customer estimate summary hides internal cost');
assert.strictEqual(a3.layout.exportMetadata.includes_lightbim_customer_map, true, 'Board export log records LightBIM map usage');
assert.strictEqual(a3.layout.exportMetadata.approved_image_count, 2, 'Board export log records approved image count');
assert.strictEqual(a3.layout.exportMetadata.customer_safe_checked, true, 'Board export log records safety check');
const exported = service.exportDesignBoardPdf({ boardId: a3.boardId, exportMode: 'CLIENT_PROPOSAL' });
assert.strictEqual(exported.board.boardLayout.exportMetadata.includes_lightbim_customer_map, true, 'Exported board keeps LightBIM map export log');

const noMap = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: 'ESTIMATE-WITHOUT-LIGHTBIM',
  projectId: 'ESTIMATE-WITHOUT-LIGHTBIM',
  projectName: 'Empty Proposal Board',
  title: '빈 제안서',
  printFormat: 'A3_LANDSCAPE'
});
assert.ok(!noMap.layout.sections.some((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP'), 'Missing LightBIM data renders clean empty state');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-proposal-board-integration.smoke',
  approvedImageCount: mapSection.approved_images.length,
  sectionCount: a3.layout.sections.length,
  layout: mapSection.map_payload.layout.composition
}));
