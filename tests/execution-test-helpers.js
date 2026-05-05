const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

function createTestService(prefix) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  const app = {
    isPackaged: true,
    getPath: () => root
  };
  return { service: createSqliteService({ app }), root };
}

function createGoBathroomEstimate(service, suffix = Date.now()) {
  const estimateId = `BATH-EXEC-${suffix}`;
  service.saveBathroomEstimate({
    estimateId,
    customerName: '실행 테스트 고객',
    siteName: '욕실 실행 테스트 현장',
    bathroomAreaM2: 5,
    customerPriceMultiplier: 1.05,
    options: {
      showerBooth: true,
      jendai: true,
      ventilationFan: true,
      lighting: true
    },
    actor: 'CEO'
  });
  return estimateId;
}

function createScheduleAndPurchase(service, estimateId) {
  const contract = service.generateBathroomContract({
    estimateId,
    startDate: '2026-05-10',
    endDate: '2026-05-17',
    actor: 'CEO'
  });
  const schedule = service.generateBathroomSchedule({
    estimateId,
    contractId: contract.contractId,
    startDate: '2026-05-10',
    actor: 'CEO'
  });
  const purchaseOrder = service.generateBathroomPurchaseOrder({
    estimateId,
    contractId: contract.contractId,
    requiredDate: '2026-05-09',
    actor: 'CEO'
  });
  return { contract, schedule, purchaseOrder };
}

module.exports = {
  createTestService,
  createGoBathroomEstimate,
  createScheduleAndPurchase
};
