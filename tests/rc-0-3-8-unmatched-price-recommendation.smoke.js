'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { createTestService } = require('./execution-test-helpers');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');
const { createInitialMasterDataService } = require('../electron/services/initialMasterDataService');
const { createPriceWorkbookImportService } = require('../electron/services/priceWorkbookImportService');
const { createUnmatchedPriceRecommendationService } = require('../electron/services/unmatchedPriceRecommendationService');

const { service, root } = createTestService('boc-rc038-unmatched-price-recommendation');
const app = { isPackaged: true, getPath: () => root };
const reportsDir = path.join(root, 'docs');
const backupRestoreService = createBackupRestoreService({ app, sqliteService: service });
const initialMasterDataService = createInitialMasterDataService({ sqliteService: service, backupRestoreService });
initialMasterDataService.runInitialMasterDataSetup({ createBackup: false });

const importService = createPriceWorkbookImportService({ sqliteService: service, reportsDir });
const recommendationService = createUnmatchedPriceRecommendationService({
  sqliteService: service,
  priceWorkbookImportService: importService,
  reportsDir
});

const csvPath = path.join(root, 'rc038-unmatched-price.csv');
fs.writeFileSync(csvPath, [
  '자재명,자재분류,규격,브랜드,단위,단가,업체명,적용공정,비고',
  'RC038 욕실 벽 세라믹 프리미엄 타일,타일,300x600,테스트브랜드,㎡,30000,RC038 공급처,욕실 벽타일,HIGH 후보',
  'RC038 주방 카운터 스톤 마감,상판,20mm,테스트브랜드,m,210000,RC038 공급처,주방 가구,MEDIUM 후보',
  'RC038 욕실 마감 보조재,기타,표준,테스트브랜드,EA,11000,다른 공급처,마감,LOW 후보',
  '은하 항법 모듈 ZX9,우주,ZX9,무관,BOX,1,미확인,우주,NO_MATCH 후보'
].join('\n'), 'utf8');

const preview = importService.previewPriceImport(csvPath, 'MATERIAL_PRICE_LIST');
assert.strictEqual(preview.rows.filter((row) => row.match_status === 'UNMATCHED').length, 4, 'four unmatched import rows are created');

function withDb(callback) {
  const database = new DatabaseSync(service.dbPaths.master);
  try {
    return callback(database);
  } finally {
    database.close();
  }
}

function addMaterial(id, category, name, spec, brand, unit, price, vendor, process) {
  withDb((database) => database.prepare(`
    INSERT INTO material_master (
      id, material_category, material_name, specification, brand, unit,
      default_unit_price, latest_unit_price, recommended_vendor, applied_process,
      is_active, created_at, updated_at, price_status, source_marker
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'CONFIRMED', 'RC_0_3_8_TEST')
  `).run(id, category, name, spec, brand, unit, price, price, vendor, process, new Date().toISOString(), new Date().toISOString()));
}

addMaterial('RC038-MAT-HIGH', '타일', 'RC038 욕실 벽 세라믹 타일', '300x600', '테스트브랜드', '㎡', 29000, 'RC038 공급처', '욕실 벽타일');
addMaterial('RC038-MAT-MEDIUM', '상판', 'RC038 엔지니어드 인조대리석', '20mm', '테스트브랜드', 'm', 200000, 'RC038 공급처', '주방 가구');
addMaterial('RC038-MAT-LOW', '부자재', 'RC038 실리콘 코킹', '표준', '테스트브랜드', 'EA', 10000, 'RC038 공급처', '실리콘');

const unmatchedRows = recommendationService.listUnmatchedImportRows();
assert.strictEqual(unmatchedRows.length, 4, 'unmatched import row list can be read');

function findRow(name) {
  return unmatchedRows.find((row) => row.normalized.item_name === name);
}

const highRow = findRow('RC038 욕실 벽 세라믹 프리미엄 타일');
const mediumRow = findRow('RC038 주방 카운터 스톤 마감');
const lowRow = findRow('RC038 욕실 마감 보조재');
const noMatchRow = findRow('은하 항법 모듈 ZX9');
assert.ok(highRow && mediumRow && lowRow && noMatchRow, 'all recommendation fixture rows are available');

const highCandidates = recommendationService.getRecommendationCandidates(highRow.id);
const mediumCandidates = recommendationService.getRecommendationCandidates(mediumRow.id);
const lowCandidates = recommendationService.getRecommendationCandidates(lowRow.id);
const noMatchCandidates = recommendationService.getRecommendationCandidates(noMatchRow.id);

assert.strictEqual(highCandidates.topCandidate.confidence_level, 'HIGH', 'HIGH confidence recommendation is generated');
assert.strictEqual(mediumCandidates.topCandidate.confidence_level, 'MEDIUM', 'MEDIUM confidence recommendation is generated');
assert.strictEqual(lowCandidates.topCandidate.confidence_level, 'LOW', 'LOW confidence recommendation is generated');
assert.strictEqual(noMatchCandidates.topCandidate.confidence_level, 'NO_MATCH', 'NO_MATCH recommendation is generated');
assert.ok(highCandidates.candidates.length <= 3, 'recommendation candidates return top three');

const highRecommendation = recommendationService.createRecommendationForRow(highRow.id, {
  candidateMasterItemId: highCandidates.topCandidate.target_id,
  targetType: highCandidates.topCandidate.target_type,
  note: 'HIGH 추천 생성'
});
const mediumRecommendation = recommendationService.createRecommendationForRow(mediumRow.id, {
  candidateMasterItemId: mediumCandidates.topCandidate.target_id,
  targetType: mediumCandidates.topCandidate.target_type,
  note: 'MEDIUM 추천 생성'
});
const lowRecommendation = recommendationService.createRecommendationForRow(lowRow.id, {
  candidateMasterItemId: lowCandidates.topCandidate.target_id,
  targetType: lowCandidates.topCandidate.target_type,
  note: 'LOW 추천 생성'
});
const noMatchRecommendation = recommendationService.createRecommendationForRow(noMatchRow.id, {
  forceNoMatch: true,
  note: '신규 Master Data 검토'
});

assert.strictEqual(highRecommendation.status, 'PENDING_REVIEW', 'recommendation starts pending review');
assert.strictEqual(noMatchRecommendation.status, 'NO_MATCH', 'NO_MATCH is stored for new master review');

function readMasterPrice(itemId) {
  return withDb((database) => Number(database.prepare('SELECT latest_unit_price FROM material_master WHERE id = ?').get(itemId).latest_unit_price));
}

const masterPriceBefore = readMasterPrice(highRecommendation.candidate_master_item_id);
const approved = recommendationService.approveRecommendation(highRecommendation.recommendation_id, {
  reviewedBy: 'CEO',
  note: '대표 승인'
});
const rejected = recommendationService.rejectRecommendation(mediumRecommendation.recommendation_id, {
  reviewedBy: 'CEO',
  reason: '후보 부적합'
});
const deferred = recommendationService.deferRecommendation(lowRecommendation.recommendation_id, {
  reviewedBy: 'CEO',
  reason: '규격 재확인'
});

assert.strictEqual(approved.status, 'APPROVED', 'recommendation can be approved');
assert.strictEqual(rejected.status, 'REJECTED', 'recommendation can be rejected');
assert.strictEqual(deferred.status, 'DEFERRED', 'recommendation can be deferred');
assert.strictEqual(readMasterPrice(highRecommendation.candidate_master_item_id), masterPriceBefore, 'recommendation approval does not change master data');

const linked = recommendationService.linkRecommendationToPriceQueue(highRecommendation.recommendation_id);
assert.ok(linked.ok, 'approved recommendation can link to price queue');
assert.strictEqual(linked.recommendation.status, 'LINKED_TO_QUEUE', 'recommendation status becomes linked');
assert.strictEqual(linked.queue.status, 'PENDING_REVIEW', 'linked price queue stays pending review');
assert.strictEqual(linked.masterDataChanged, false, 'queue link reports no master data change');
assert.strictEqual(readMasterPrice(highRecommendation.candidate_master_item_id), masterPriceBefore, 'queue link does not change master data');

const summary = recommendationService.getUnmatchedPriceRecommendationSummary();
assert.ok(summary.highRecommendationCount >= 1, 'summary counts HIGH recommendation');
assert.ok(summary.mediumRecommendationCount >= 1, 'summary counts MEDIUM recommendation');
assert.ok(summary.lowRecommendationCount >= 1, 'summary counts LOW recommendation');
assert.ok(summary.noMatchCount >= 1, 'summary counts NO_MATCH recommendation');

const customerPayload = recommendationService.buildCustomerSafeRecommendationPayload();
assert.deepStrictEqual(recommendationService.inspectForbiddenCustomerPayload(customerPayload), [], 'customer payload hides recommendation and internal data');

const report = recommendationService.createUnmatchedPriceRecommendationReport();
assert.ok(report.ok && fs.existsSync(report.reportPath), 'recommendation report can be generated');

const uiSources = [
  'ui/app/pricing/PriceWorkbookImportCenterView.tsx',
  'ui/app/pricing/RealPriceCalibrationWorkbenchView.tsx',
  'ui/app/pricing/PriceCalibrationPriorityCenterView.tsx',
  'ui/app/master/MasterDataCenterView.tsx',
  'ui/app/dashboard/CeoDashboard.tsx',
  'ui/components/modals/DetailDrawer.tsx'
].map((file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8'));
uiSources.forEach((source, index) => {
  assert.ok(source.includes('unmatchedPriceRecommendation') || source.includes('UnmatchedPriceRecommendationCenterView'), `entry point ${index + 1} is connected`);
});

const customerViewSources = [
  'ui/app/client/ClientPortalCenterView.tsx',
  'ui/app/lightbim/LightBIMCustomerProposalMapView.tsx',
  'ui/app/board/BoardGenerationCenterView.tsx'
].map((file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8').toLowerCase());
customerViewSources.forEach((source) => {
  ['unmatched_price_recommendations', 'recommendation_score', 'confidence_level', 'candidate_master_item'].forEach((term) => {
    assert.ok(!source.includes(term), `customer screen does not expose recommendation data: ${term}`);
  });
});

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-8-unmatched-price-recommendation.smoke',
  importId: preview.importId,
  confidence: {
    high: highCandidates.topCandidate.similarity_score,
    medium: mediumCandidates.topCandidate.similarity_score,
    low: lowCandidates.topCandidate.similarity_score,
    noMatch: noMatchCandidates.topCandidate.similarity_score
  },
  decisions: {
    approved: approved.status,
    rejected: rejected.status,
    deferred: deferred.status
  },
  queueId: linked.queue.id,
  queueStatus: linked.queue.status,
  masterPriceUnchanged: readMasterPrice(highRecommendation.candidate_master_item_id) === masterPriceBefore,
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
