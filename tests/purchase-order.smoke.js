const assert = require('assert');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => path.join(__dirname, '..', 'storage', 'sqlite', `smoke-purchase-${Date.now()}`)
  }
});

const saved = service.saveBathroomEstimate({
  customerName: 'Purchase Customer',
  siteName: 'Purchase Site',
  bathroomCount: 1,
  bathroomAreaM2: 4.2,
  ceilingHeightMm: 2200,
  demolitionIncluded: true,
  constructionMethod: 'bond',
  waterproofMethod: 'liquid',
  tileWallType: 'ceramic_300x600',
  tileFloorType: 'porcelain_600',
  fixtureGrade: 'basic',
  options: {
    showerBooth: true,
    zenda: true,
    bathtub: false,
    slidingCabinet: true,
    ventilationFanReplace: true,
    lightingReplace: true,
    faucetReplace: true
  },
  customerPriceMultiplier: 1.05
});

const purchaseResult = service.generateBathroomPurchaseOrder({ estimateId: saved.estimateId, requiredDate: '2026-05-12' });
assert.ok(purchaseResult.purchaseOrderId, 'GO estimate creates purchase order');
assert.ok(purchaseResult.purchaseOrder.items.length >= 8, 'purchase order contains material items');
assert.ok(purchaseResult.purchaseOrder.items.some((item) => item.itemName.includes('타일')), 'purchase order contains tile');
assert.ok(purchaseResult.purchaseOrder.items.some((item) => item.itemName.includes('양변기')), 'purchase order contains toilet');
assert.ok(purchaseResult.purchaseOrder.totalAmount > 0, 'purchase order has expected amount');

console.log(JSON.stringify({ ok: true, test: 'purchase-order.smoke', purchaseOrderId: purchaseResult.purchaseOrderId }));
