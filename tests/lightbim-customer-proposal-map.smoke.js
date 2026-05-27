'use strict';

const assert = require('assert');
const path = require('path');
const { createEstimateDraftFromLightBIM } = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

const payload = require(path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json'));
const { service } = createTestService('boc-lightbim-customer-proposal-map');
const imported = service.importLightBIMPayload({ payload, sourceFileName: 'customer-map-lightbim.json' });
assert.ok(imported.ok, 'Customer proposal map data loads from LightBIM import');

const draft = createEstimateDraftFromLightBIM(payload);
const saved = service.saveFullRemodelingEstimate({
  ...draft.input,
  estimateId: 'FULL-CUSTOMER-MAP-SMOKE',
  customerName: '고객 제안 검증',
  siteName: '고객 맵 현장',
  lightBimImportId: imported.importId
});

service.saveMoodboardProfile({
  estimateId: saved.estimateId,
  style: 'premium minimal',
  colorTone: 'warm white',
  primaryMaterials: 'wood floor, porcelain tile',
  lightingMood: 'soft indirect light',
  referenceNotes: 'customer map smoke'
});

let map = service.getLightBIMCustomerProposalMapData({ importId: imported.importId });
assert.strictEqual(map.customerSafe, true, 'Customer proposal map is explicitly customer-safe');
assert.strictEqual(map.spaces.length, 5, 'Spaces are returned with customer-safe fields');
assert.ok(map.spaces.every((space) => Array.isArray(space.constructionScope)), 'Each space includes customer construction scope');
assert.ok(map.publicScopeSummary.includes('욕실 리모델링'), 'Construction scope summary is generated');

map = service.getLightBIMCustomerProposalMapByEstimate({ estimateType: 'FULL_REMODELING', estimateId: saved.estimateId });
assert.strictEqual(map.designDirection.style, 'premium minimal', 'Customer-safe design direction is loaded');

const serializedMap = JSON.stringify(map).toLowerCase();
[
  'variance',
  'actualused',
  'purchase',
  'receiving',
  'material_cost',
  'labor_cost',
  'subcontract',
  'margin',
  'pce',
  'vendor',
  'calibration',
  'red_alert'
].forEach((forbidden) => {
  assert.ok(!serializedMap.includes(forbidden), `Customer proposal map excludes internal field: ${forbidden}`);
});

const portal = service.getClientPortalData({ projectId: saved.estimateId });
assert.ok(portal.proposalMap, 'Client Portal can load proposal map data');
assert.strictEqual(portal.proposalMap.customerSafe, true, 'Client Portal proposal map remains customer-safe');

const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  projectName: 'Customer Map Board',
  title: '고객 공간 제안 보드',
  includeCustomerProposalMap: true,
  useApprovedImages: false
});
const customerMapSection = board.layout.sections.find((section) => section.sectionType === 'CUSTOMER_PROPOSAL_MAP');
assert.ok(customerMapSection, 'Board Generation can include CUSTOMER_PROPOSAL_MAP section');
assert.ok(customerMapSection.tableArea.rows.length > 0, 'Board customer map section contains space summary');

const emptyPayload = JSON.parse(JSON.stringify(payload));
emptyPayload.project.spaces = [];
const emptyImport = service.importLightBIMPayload({ payload: emptyPayload, sourceFileName: 'customer-map-empty.json' });
const emptyMap = service.getLightBIMCustomerProposalMapData({ importId: emptyImport.importId });
assert.strictEqual(emptyMap.spaces.length, 0, 'Empty customer map returns no spaces');
assert.strictEqual(emptyMap.statusKo, '표시할 공간 정보가 없습니다.', 'Empty map state renders safely');

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-customer-proposal-map.smoke',
  spaceCount: map.spaces.length,
  boardSectionType: customerMapSection.sectionType
}));
