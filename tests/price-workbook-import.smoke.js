'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const {
  createPriceWorkbookImportService,
  inferColumnMapping,
  parseCSV
} = require('../electron/services/priceWorkbookImportService');

const { service, root } = createTestService('boc-price-workbook-import');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
initialMasterDataService.runInitialMasterDataSetup();

const importService = createPriceWorkbookImportService({
  sqliteService: service,
  reportsDir: path.join(root, 'docs')
});

const templateDir = path.join(__dirname, '..', 'templates', 'price-import');
const materialTemplate = path.join(templateDir, 'material_price_template.csv');
const vendorTemplate = path.join(templateDir, 'vendor_quote_template.csv');
const laborTemplate = path.join(templateDir, 'labor_rate_template.csv');

assert.ok(fs.existsSync(materialTemplate), 'material price template exists');
assert.ok(fs.existsSync(vendorTemplate), 'vendor quote template exists');
assert.ok(fs.existsSync(laborTemplate), 'labor rate template exists');

const materialCsv = parseCSV(materialTemplate);
assert.ok(materialCsv.rows.length >= 3, 'CSV material price template parses');

const vendorPreview = importService.previewPriceImport(vendorTemplate, 'VENDOR_QUOTE');
assert.ok(vendorPreview.rows.length >= 3, 'CSV vendor quote template parses');

const laborPreview = importService.previewPriceImport(laborTemplate, 'LABOR_RATE');
assert.ok(laborPreview.rows.length >= 3, 'labor rate template parses');
assert.ok(laborPreview.rows.some((row) => row.match_status === 'MATCHED'), 'labor rows match master data');

const mapping = inferColumnMapping(materialCsv.headers, 'MATERIAL_PRICE_LIST');
assert.strictEqual(mapping.mapping.item_name, '자재명', 'column mapping inference works for item name');
assert.strictEqual(mapping.mapping.price, '단가', 'column mapping inference works for price');
assert.strictEqual(mapping.mapping.unit, '단위', 'column mapping inference works for unit');

const invalidCsvPath = path.join(root, 'invalid-price-template.csv');
fs.writeFileSync(invalidCsvPath, '항목명,단위,단가\n,㎡,1000\n기본 벽타일,㎡,0\n', 'utf8');
const invalidPreview = importService.previewPriceImport(invalidCsvPath, 'MATERIAL_PRICE_LIST');
assert.ok(invalidPreview.rows.some((row) => row.validation_status === 'INVALID'), 'invalid row is detected');

const materialPreview = importService.previewPriceImport(materialTemplate, 'MATERIAL_PRICE_LIST');
assert.ok(materialPreview.rows.some((row) => row.match_status === 'MATCHED'), 'rows match master data');
assert.ok(materialPreview.rows.some((row) => row.match_status === 'UNMATCHED'), 'unmatched row is marked UNMATCHED');

const matchedMaterial = materialPreview.rows.find((row) => row.match_status === 'MATCHED');
assert.ok(Number.isFinite(Number(matchedMaterial.variance_amount)), 'variance analysis works');

const beforeDb = new DatabaseSync(service.dbPaths.master);
const beforeMaterial = beforeDb.prepare("SELECT latest_unit_price FROM material_master WHERE material_name = '기본 벽타일'").get();
beforeDb.close();

const queueResult = importService.createPriceUpdateQueueFromImport({
  importId: materialPreview.importId,
  selectedRowIndexes: [matchedMaterial.row_index]
});
assert.strictEqual(queueResult.createdCount, 1, 'queue items are created as PENDING_REVIEW');
assert.strictEqual(queueResult.queueItems[0].status, 'PENDING_REVIEW', 'queue item status is PENDING_REVIEW');

const afterDb = new DatabaseSync(service.dbPaths.master);
const queueRow = afterDb.prepare('SELECT * FROM real_price_update_queue WHERE id = ?').get(queueResult.queueItems[0].queueId);
const afterMaterial = afterDb.prepare("SELECT latest_unit_price FROM material_master WHERE material_name = '기본 벽타일'").get();
afterDb.close();
assert.strictEqual(queueRow.status, 'PENDING_REVIEW', 'queue row is pending review');
assert.strictEqual(Number(afterMaterial.latest_unit_price), Number(beforeMaterial.latest_unit_price), 'queue creation does not apply master data');

const history = importService.getPriceImportHistory();
assert.ok(history.length >= 4, 'import history is saved');

const detail = importService.getPriceImportDetail(materialPreview.importId);
assert.strictEqual(detail.import.import_id, materialPreview.importId, 'import detail loads');

const report = importService.createImportReport(materialPreview.importId);
assert.ok(fs.existsSync(report.reportPath), 'import report is generated');

const clientPortalSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
assert.ok(!clientPortalSource.includes('priceWorkbookImport') && !clientPortalSource.includes('단가표 일괄 가져오기'), 'customer payload does not expose workbook import/internal price data');

console.log(JSON.stringify({
  ok: true,
  test: 'price-workbook-import.smoke',
  materialImportId: materialPreview.importId,
  matchedCount: materialPreview.summary.matchedCount,
  unmatchedCount: materialPreview.summary.unmatchedCount,
  queueCreatedCount: queueResult.createdCount,
  reportPath: report.reportPath
}, null, 2));
