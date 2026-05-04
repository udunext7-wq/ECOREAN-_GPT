const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');

function input() {
  return {
    customerName: 'Export Customer',
    siteName: 'Export Site',
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
    customerPriceMultiplier: 1.05
  };
}

const tempRoot = path.join(__dirname, '..', 'storage', 'sqlite', `smoke-export-${Date.now()}`);
const service = createSqliteService({
  app: {
    isPackaged: true,
    getPath: () => tempRoot
  }
});

const saved = service.saveBathroomEstimate(input());
const estimateId = saved.estimateId;

const customerPdf = service.exportBathroomEstimateDocument({ estimateId, documentType: 'customer', format: 'pdf' });
const internalPdf = service.exportBathroomEstimateDocument({ estimateId, documentType: 'internal', format: 'pdf' });
const customerExcel = service.exportBathroomEstimateDocument({ estimateId, documentType: 'customer', format: 'xlsx' });
const internalExcel = service.exportBathroomEstimateDocument({ estimateId, documentType: 'internal', format: 'xlsx' });

for (const result of [customerPdf, internalPdf, customerExcel, internalExcel]) {
  assert.ok(fs.existsSync(result.filePath), `${result.fileName} should exist`);
  assert.ok(fs.statSync(result.filePath).size > 200, `${result.fileName} should not be empty`);
}

const customerExcelText = fs.readFileSync(customerExcel.filePath).toString('utf8');
const internalExcelText = fs.readFileSync(internalExcel.filePath).toString('utf8');
assert.ok(!customerExcelText.includes('자재비'), 'customer file hides cost');
assert.ok(!customerExcelText.includes('마진'), 'customer file hides margin');
assert.ok(internalExcelText.includes('마진'), 'internal file shows margin');
assert.ok(internalExcelText.includes('PCE'), 'internal file shows PCE result');

const printCss = fs.readFileSync(path.join(__dirname, '..', 'ui', 'src', 'print.css'), 'utf8');
assert.ok(printCss.includes('@page'), 'print layout has A4 page rule');
assert.ok(printCss.includes('table-header-group'), 'print layout repeats table header');

console.log(JSON.stringify({
  ok: true,
  test: 'estimate-export.smoke',
  files: [customerPdf.filePath, internalPdf.filePath, customerExcel.filePath, internalExcel.filePath]
}));
