const assert = require('assert');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-material-receiving');
const estimateId = createGoBathroomEstimate(service, 'MATERIAL');
const { purchaseOrder } = createScheduleAndPurchase(service, estimateId);

const result = service.createMaterialReceivingLog({
  projectId: estimateId,
  purchaseOrderId: purchaseOrder.purchaseOrderId,
  receivedItems: [
    { itemNameKo: '600각 폴리싱 타일', orderedQuantity: 10, receivedQuantity: 8, unit: 'BOX' }
  ],
  actor: 'CEO'
});

assert.strictEqual(result.shortageCount, 1);
assert.strictEqual(service.getDbStats().materialReceivingLogCount, 1);
console.log('material-receiving smoke passed');
