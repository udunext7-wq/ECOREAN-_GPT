const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

function input(multiplier) {
  return {
    customerName: 'Contract Customer',
    siteName: 'Contract Site',
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
      slidingCabinet: false,
      ventilationFanReplace: true,
      lightingReplace: true,
      faucetReplace: true
    },
    customerPriceMultiplier: multiplier
  };
}

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-contract-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const goEstimate = service.saveBathroomEstimate(input(1.05));
const contractResult = service.generateBathroomContract({ estimateId: goEstimate.estimateId, startDate: '2026-05-10' });
assert.ok(contractResult.contractId, 'GO estimate creates contract');
assert.ok(contractResult.contract.contractAmount > 0, 'contract amount is generated from estimate');

const pdfResult = service.exportBathroomContractPdf({ contractId: contractResult.contractId });
assert.ok(fs.existsSync(pdfResult.filePath), 'contract PDF exists');
assert.ok(fs.statSync(pdfResult.filePath).size > 200, 'contract PDF is not empty');

const blockEstimate = service.saveBathroomEstimate({ ...input(0.75), adminOverrideReason: 'smoke test blocked estimate save only' });
assert.throws(
  () => service.generateBathroomContract({ estimateId: blockEstimate.estimateId }),
  /BLOCK/,
  'BLOCK estimate is blocked from contract generation'
);

const modifyEstimate = service.saveBathroomEstimate(input(1));
assert.throws(
  () => service.generateBathroomContract({ estimateId: modifyEstimate.estimateId }),
  /수정 필요/,
  'MODIFY estimate requires revision before contract generation'
);

console.log(JSON.stringify({ ok: true, test: 'contract-generation.smoke', contractId: contractResult.contractId }));
