'use strict';

const assert = require('assert');
const path = require('path');
const { createEstimateDraftFromLightBIM } = require('../electron/services/lightBimImportService');
const { createTestService } = require('./execution-test-helpers');

const FORBIDDEN = [
  'cost',
  'margin',
  'pce',
  'vendor',
  'labor',
  'purchase',
  'receiving',
  'actual_used',
  'variance',
  'calibration',
  'red_alert',
  'internal',
  'profit',
  'risk_score'
];

function assertCustomerSafe(label, payload) {
  const serialized = JSON.stringify(payload).toLowerCase();
  FORBIDDEN.forEach((forbidden) => {
    assert.ok(!serialized.includes(forbidden), `${label} must not expose ${forbidden}`);
  });
}

const fixture = require(path.join(__dirname, 'fixtures', 'lightbim', 'real-minicad-export.lightbim.json'));
const { service } = createTestService('boc-lightbim-customer-safety');
const imported = service.importLightBIMPayload({ payload: fixture, sourceFileName: 'customer-safety-lightbim.json' });
assert.ok(imported.ok, 'LightBIM fixture imports for customer safety test');

const draft = createEstimateDraftFromLightBIM(fixture);
const saved = service.saveFullRemodelingEstimate({
  ...draft.input,
  estimateId: 'FULL-LBIM-CUSTOMER-SAFETY',
  customerName: '고객 안전 검증',
  siteName: '고객 안전 현장',
  lightBimImportId: imported.importId,
  customerPriceMultiplier: 1.22
});
const contract = service.generateFullRemodelingContract({ estimateId: saved.estimateId, startDate: '2026-06-01' });
service.generateFullRemodelingSchedule({ estimateId: saved.estimateId, contractId: contract.contractId, startDate: '2026-06-01' });

const portal = service.getClientPortalData({ projectId: saved.estimateId });
assert.strictEqual(portal.customerSafe, true, 'Customer Portal payload is marked safe');
assertCustomerSafe('Customer Portal', portal);
assertCustomerSafe('Customer Estimate', portal.estimateView);
assertCustomerSafe('Customer Contract Section', portal.contractView);

const map = service.getLightBIMCustomerProposalMapByEstimate({
  estimateType: 'FULL_REMODELING',
  estimateId: saved.estimateId
});
assert.strictEqual(map.customerSafe, true, 'Customer proposal map payload is marked safe');
assertCustomerSafe('Customer Proposal Map', map);

const board = service.createDesignBoard({
  boardType: 'CLIENT_PROPOSAL',
  estimateId: saved.estimateId,
  projectId: saved.estimateId,
  title: '고객 안전 제안 보드',
  projectName: '고객 안전 현장',
  estimateSummary: {
    totalAmount: 42000000,
    totalCost: 30000000,
    margin: 12000000,
    pceDecision: 'SCALE',
    processGroups: [{
      processKo: '전체 리모델링',
      amount: 42000000,
      internalCost: 30000000,
      margin: 12000000,
      pceDecision: 'SCALE'
    }]
  }
});
assert.ok(board.layout.customerPdfPayload, 'Customer proposal board creates customer PDF payload');
assertCustomerSafe('Proposal Board Customer Payload', board.layout.customerPdfPayload);

console.log(JSON.stringify({
  ok: true,
  test: 'lightbim-customer-safety-regression.smoke',
  checkedPayloads: ['portal', 'estimate', 'contract', 'customerMap', 'proposalBoard'],
  forbiddenKeyCount: FORBIDDEN.length
}));
