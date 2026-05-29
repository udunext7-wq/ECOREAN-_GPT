'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceWorkbookImportService } = require('../electron/services/priceWorkbookImportService');

const { service, root } = createTestService('boc-price-import-manual-match');
const app = { isPackaged: true, getPath: () => root };
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const importService = createPriceWorkbookImportService({ sqliteService: service, reportsDir: path.join(root, 'docs') });

const materialCsvPath = path.join(root, 'manual-match-material.csv');
fs.writeFileSync(materialCsvPath, [
  '자재명,자재분류,규격,브랜드,단위,단가,업체명,적용공정,비고',
  '기본 벽타일,타일,300x600,테스트,㎡,35000,테스트 업체,욕실 벽타일,자동 매칭 행',
  'RC031 미매칭 타일 A,타일,300x600,테스트,㎡,36000,테스트 업체,욕실 벽타일,수동 매칭 대상',
  'RC031 제외 자재,기타,확인 필요,테스트,개,12000,테스트 업체,확인 필요,제외 대상'
].join('\n'), 'utf8');

const materialPreview = importService.previewPriceImport(materialCsvPath, 'MATERIAL_PRICE_LIST');
assert.ok(materialPreview.rows.some((row) => row.match_status === 'UNMATCHED'), 'unmatched import row is returned');

const unmatchedRows = importService.getUnmatchedImportRows(materialPreview.importId);
assert.strictEqual(unmatchedRows.length, 2, 'unmatched row list returns unmatched rows');
const manualRow = unmatchedRows.find((row) => row.normalized.item_name === 'RC031 미매칭 타일 A');
const excludeRow = unmatchedRows.find((row) => row.normalized.item_name === 'RC031 제외 자재');
assert.ok(manualRow && excludeRow, 'manual and exclude rows are available');

const candidates = importService.searchPriceImportMatchCandidates('MATERIAL_PRICE_LIST', '기본 벽타일', { targetType: 'MATERIAL', unit: '㎡' });
assert.ok(candidates.candidates.length > 0, 'master data search returns candidates');
const target = candidates.candidates.find((candidate) => candidate.target_name === '기본 벽타일');
assert.ok(target, 'expected material candidate is found');

const manualMatch = importService.manuallyMatchImportRow(manualRow.id, target.target_type, target.target_id, 'RC-0.3.1 수동 매칭 테스트');
assert.strictEqual(manualMatch.row.match_status, 'MATCHED_MANUAL', 'manual match updates row to MATCHED_MANUAL');
assert.strictEqual(manualMatch.row.matched_target_name, '기본 벽타일', 'manual match stores selected target');
assert.ok(Number.isFinite(Number(manualMatch.row.variance_amount)), 'variance recalculates after manual match');

const excluded = importService.excludeImportRow(excludeRow.id, '이번 가져오기에서 제외');
assert.strictEqual(excluded.row.match_status, 'EXCLUDED', 'excluded row is marked EXCLUDED');

let readiness = importService.getImportQueueReadiness(materialPreview.importId);
assert.strictEqual(readiness.manuallyMatchedRows, 1, 'queue readiness counts manually matched rows');
assert.strictEqual(readiness.excludedRows, 1, 'queue readiness counts excluded rows');
assert.strictEqual(readiness.unmatchedRows, 0, 'queue readiness counts unmatched rows after resolution');
assert.strictEqual(readiness.queueEligibleRows, 2, 'queue readiness counts queue eligible rows');

const queueResult = importService.createPriceUpdateQueueFromImport({ importId: materialPreview.importId });
assert.strictEqual(queueResult.createdCount, 2, 'queue creation excludes unmatched/excluded rows and creates eligible rows only');
assert.ok(!queueResult.detail.rows.find((row) => row.id === excludeRow.id).queue_id, 'excluded row is not queued');

const db = new DatabaseSync(service.dbPaths.master);
const manualLog = db.prepare("SELECT * FROM price_workbook_import_match_logs WHERE row_id = ? AND action = 'MANUAL_MATCH'").get(manualRow.id);
assert.ok(manualLog, 'match log records manual match');
db.close();

const clearCsvPath = path.join(root, 'manual-match-clear.csv');
fs.writeFileSync(clearCsvPath, [
  '자재명,자재분류,규격,브랜드,단위,단가,업체명,적용공정,비고',
  'RC031 해제 테스트 타일,타일,300x600,테스트,㎡,36500,테스트 업체,욕실 벽타일,매칭 해제 대상'
].join('\n'), 'utf8');
const clearPreview = importService.previewPriceImport(clearCsvPath, 'MATERIAL_PRICE_LIST');
const clearRow = importService.getUnmatchedImportRows(clearPreview.importId)[0];
importService.manuallyMatchImportRow(clearRow.id, target.target_type, target.target_id, '매칭 후 해제 테스트');
const cleared = importService.clearImportRowMatch(clearRow.id);
assert.strictEqual(cleared.row.match_status, 'UNMATCHED', 'clear match returns row to UNMATCHED');

service.createMasterDataItem({
  type: 'standardItem',
  payload: {
    id: 'STD-RC031-MULTI-A',
    itemName: 'RC031 중복 표준 품목',
    process: '타일',
    defaultUnit: '㎡',
    defaultCustomerUnitPrice: 110000,
    defaultMaterialCost: 50000,
    defaultLaborCost: 30000,
    defaultSubcontractCost: 0,
    defaultMarginRate: 0.3,
    estimateType: 'bathroom_remodel',
    isMandatory: true
  }
});
service.createMasterDataItem({
  type: 'standardItem',
  payload: {
    id: 'STD-RC031-MULTI-B',
    itemName: 'RC031 중복 표준 품목',
    process: '타일',
    defaultUnit: '㎡',
    defaultCustomerUnitPrice: 115000,
    defaultMaterialCost: 52000,
    defaultLaborCost: 31000,
    defaultSubcontractCost: 0,
    defaultMarginRate: 0.3,
    estimateType: 'full_remodel',
    isMandatory: true
  }
});
const multipleCsvPath = path.join(root, 'manual-match-multiple.csv');
fs.writeFileSync(multipleCsvPath, [
  '항목명,견적유형,공정명,단위,고객단가,자재비,노무비,외주비,마진율,비고',
  'RC031 중복 표준 품목,bathroom_remodel,타일,㎡,130000,60000,35000,0,0.3,다중 매칭 해소 대상'
].join('\n'), 'utf8');
const multiplePreview = importService.previewPriceImport(multipleCsvPath, 'STANDARD_ITEM_PRICE');
assert.ok(multiplePreview.rows.some((row) => row.match_status === 'MULTIPLE_MATCHES'), 'multiple match row is returned');
const multipleRows = importService.getMultipleMatchImportRows(multiplePreview.importId);
assert.strictEqual(multipleRows.length, 1, 'multiple match row list returns row');
const multipleCandidates = importService.searchPriceImportMatchCandidates('STANDARD_ITEM_PRICE', 'RC031 중복 표준 품목', { targetType: 'STANDARD_ITEM', unit: '㎡' });
assert.ok(multipleCandidates.candidates.length >= 2, 'multiple match candidate list is available');
const resolved = importService.manuallyMatchImportRow(multipleRows[0].id, 'STANDARD_ITEM', multipleCandidates.candidates[0].target_id, '다중 매칭 수동 해소');
assert.strictEqual(resolved.row.match_status, 'MATCHED_MANUAL', 'multiple match row can be resolved manually');
const dbAfter = new DatabaseSync(service.dbPaths.master);
const multipleLog = dbAfter.prepare("SELECT * FROM price_workbook_import_match_logs WHERE row_id = ? AND action = 'MULTIPLE_MATCH_RESOLVED'").get(multipleRows[0].id);
dbAfter.close();
assert.ok(multipleLog, 'match log records multiple match resolution');

const clientPortalSource = fs.readFileSync(path.join(__dirname, '..', 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
['manual matching', 'price_workbook_import_match_logs', 'manual_match_note', '단가표 일괄 가져오기'].forEach((term) => {
  assert.ok(!clientPortalSource.includes(term), `customer payload does not expose manual matching data: ${term}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'price-import-manual-matching.smoke',
  importId: materialPreview.importId,
  manualRowId: manualRow.id,
  queueCreatedCount: queueResult.createdCount,
  readiness,
  multipleImportId: multiplePreview.importId
}, null, 2));
