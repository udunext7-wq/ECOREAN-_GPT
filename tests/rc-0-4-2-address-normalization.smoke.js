'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const {
  normalizeAddressText,
  detectAddressType,
  parseAddressComponents,
  buildCanonicalAddress,
  buildAddressFingerprint,
  calculateAddressConfidence,
  validateAddressStructure,
  createAddressNormalizationService
} = require('../electron/services/addressNormalizationService');
const { createAddressProviderAdapter } = require('../electron/services/addressProviderAdapter');

const workspace = path.join(__dirname, '..');
const servicePath = path.join(workspace, 'electron', 'services', 'addressNormalizationService.js');
const adapterPath = path.join(workspace, 'electron', 'services', 'addressProviderAdapter.js');
const viewPath = path.join(workspace, 'ui', 'app', 'crm', 'AddressNormalizationCenterView.tsx');

assert.ok(fs.existsSync(servicePath), '1. addressNormalizationService exists');
assert.ok(fs.existsSync(viewPath), '2. AddressNormalizationCenterView exists');
assert.ok(fs.existsSync(adapterPath), '3. addressProviderAdapter exists');

assert.strictEqual(
  normalizeAddressText('  서울특별시   강남구, 테헤란로  123  '),
  '서울특별시 강남구 테헤란로 123',
  '4. address whitespace and punctuation normalize safely'
);
assert.strictEqual(detectAddressType('서울특별시 강남구 테헤란로 123'), 'ROAD', '5a. ROAD type is detected');
assert.strictEqual(detectAddressType('서울특별시 강남구 역삼동 123-4'), 'JIBUN', '5b. JIBUN type is detected');
assert.strictEqual(detectAddressType('서울특별시 강남구 테헤란로 123 역삼동 123-4'), 'MIXED', '5c. MIXED type is detected');
assert.strictEqual(detectAddressType('서울 테스트 위치'), 'UNKNOWN', '5d. UNKNOWN type is detected');

const roadParts = parseAddressComponents('서울특별시 강남구 테헤란로 123 테스트타워');
assert.strictEqual(roadParts.province, '서울특별시', '6a. province parses');
assert.strictEqual(roadParts.district, '강남구', '6b. district parses');
assert.strictEqual(roadParts.road_name, '테헤란로', '6c. road name parses');
assert.strictEqual(roadParts.building_main_no, '123', '6d. building number parses');

const canonical = buildCanonicalAddress({ addressSummary: '서울특별시 강남구 테헤란로 123' });
assert.ok(canonical.includes('테헤란로 123'), '7. canonical address is generated');
const fingerprint = buildAddressFingerprint({
  addressSummary: '서울특별시 강남구 테헤란로 123',
  addressDetailInternal: '테스트 상세 위치'
});
assert.match(fingerprint, /^[a-f0-9]{64}$/, '8. SHA-256 fingerprint is generated');

assert.strictEqual(calculateAddressConfidence({ addressSummary: '서울특별시 강남구 테헤란로 123' }).level, 'HIGH', '9a. HIGH confidence works');
assert.strictEqual(calculateAddressConfidence({ addressSummary: '서울특별시 강남구 역삼동' }).level, 'MEDIUM', '9b. MEDIUM confidence works');
assert.strictEqual(calculateAddressConfidence({ addressSummary: '서울특별시 테스트 위치' }).level, 'LOW', '9c. LOW confidence works');
assert.strictEqual(calculateAddressConfidence({ addressSummary: '서' }).level, 'INVALID', '9d. INVALID confidence works');
assert.strictEqual(validateAddressStructure({ addressSummary: '서울특별시 강남구 테헤란로 123' }).valid, true, '10a. valid structure passes');
assert.strictEqual(validateAddressStructure({ addressSummary: '서' }).validation_status, 'INVALID', '10b. invalid structure is marked');

const { service: sqliteService, root } = createTestService('boc-rc042-address-normalization');
const reportsDir = path.join(root, 'reports');
const providerAdapter = createAddressProviderAdapter();
const addressService = createAddressNormalizationService({ sqliteService, reportsDir, providerAdapter });

const created = addressService.createAddressRecord({
  sourceType: 'CRM_LEAD',
  sourceId: 'CRM-RC042-TEST',
  leadId: 'CRM-RC042-TEST',
  addressSummary: '서울특별시 강남구 테헤란로 123',
  addressDetailInternal: 'RC-0.4.2 테스트 전용 상세 위치'
});
assert.ok(created.ok && created.addressId, '11a. address record can be created');
let detail = addressService.getAddressRecordDetail(created.addressId);
assert.strictEqual(detail.address_id, created.addressId, '11b. address record can be read');
const originalSummary = detail.address_summary;
const originalDetail = detail.address_detail_internal;

const requested = addressService.requestAddressNormalization(created.addressId, { changedBy: 'RC042_TEST' });
assert.strictEqual(requested.record.normalization_status, 'NORMALIZED', '12a. normalization request produces normalized result');
const approved = addressService.approveNormalizedAddress(created.addressId, { approvedBy: 'RC042_TEST', reason: '구조 확인 완료' });
assert.strictEqual(approved.record.normalization_status, 'NORMALIZED', '12b. normalized address can be approved');
assert.strictEqual(approved.source_updated, false, '12c. approval does not update source automatically');

const rejectedRecord = addressService.createAddressRecord({
  sourceType: 'SITE_SURVEY',
  sourceId: 'SURVEY-RC042-REJECT',
  addressSummary: '서울특별시 강남구 역삼동 123-4'
});
assert.strictEqual(
  addressService.rejectNormalizedAddress(rejectedRecord.addressId, { reason: '현장 확인 필요' }).record.normalization_status,
  'REJECTED',
  '13. normalized address can be rejected'
);

const deferredRecord = addressService.createAddressRecord({
  sourceType: 'PROJECT',
  sourceId: 'PROJECT-RC042-DEFER',
  addressSummary: '서울특별시 강남구 테헤란로 456'
});
assert.strictEqual(
  addressService.deferAddressNormalization(deferredRecord.addressId, { reason: '추가 자료 대기' }).record.normalization_status,
  'DEFERRED',
  '14. address normalization can be deferred'
);

detail = addressService.getAddressRecordDetail(created.addressId);
assert.strictEqual(detail.address_summary, originalSummary, '15a. original summary is not overwritten');
assert.strictEqual(detail.address_detail_internal, originalDetail, '15b. original internal detail is not overwritten');
assert.ok(detail.history.some((row) => row.action === 'NORMALIZED'), '16a. normalization history is created');
assert.ok(detail.history.some((row) => row.action === 'APPROVED'), '16b. approval history is created');

const duplicate = addressService.createAddressRecord({
  sourceType: 'MANUAL',
  addressSummary: '서울특별시 강남구 테헤란로 123',
  addressDetailInternal: '다른 테스트 상세 위치'
});
assert.strictEqual(duplicate.record.duplicate_suspected, 1, '17a. duplicate record is warned');
assert.ok(addressService.findPotentialDuplicateAddresses({
  addressSummary: '서울특별시 강남구 테헤란로 123'
}).length >= 2, '17b. duplicate candidates can be found');

const serviceSource = fs.readFileSync(servicePath, 'utf8');
assert.ok(!/DELETE\s+FROM\s+crm_address_records/i.test(serviceSource), '18a. no automatic address deletion exists');
assert.ok(!/\bMERGE\s+INTO\s+crm_address_records/i.test(serviceSource), '18b. no automatic address merge exists');

assert.strictEqual(addressService.linkAddressToLead(created.addressId, 'CRM-RC042-LINK').record.linked_lead_id, 'CRM-RC042-LINK', '19. Lead can be linked');
assert.strictEqual(addressService.linkAddressToSurvey(created.addressId, 'SURVEY-RC042-LINK').record.linked_survey_id, 'SURVEY-RC042-LINK', '20. site survey can be linked');
assert.strictEqual(addressService.linkAddressToProject(created.addressId, 'PROJECT-RC042-LINK').record.linked_project_id, 'PROJECT-RC042-LINK', '21. project can be linked');

[
  providerAdapter.getProviderStatus(),
  providerAdapter.validateConfiguration(),
  providerAdapter.normalizeAddress({}),
  providerAdapter.searchAddress({}),
  providerAdapter.lookupPostalCode({}),
  providerAdapter.lookupCoordinates({})
].forEach((result) => {
  assert.ok(['DISABLED', 'NOT_READY'].includes(result.status), '22a. provider remains disabled/not ready');
  assert.strictEqual(result.external_call_performed, false, '22b. provider performs no external call');
});

const adapterSource = fs.readFileSync(adapterPath, 'utf8');
[serviceSource, adapterSource].forEach((source) => {
  [/\bfetch\s*\(/i, /\baxios\b/i, /\bhttps?\.request\s*\(/i, /\bhttps?:\/\/[^\s'"]+/i]
    .forEach((pattern) => assert.ok(!pattern.test(source), `23. no external network pattern: ${pattern}`));
  [/\bapi[_-]?key\b/i, /\bAuthorization\s*:/i]
    .forEach((pattern) => assert.ok(!pattern.test(source), `24. no API credential pattern: ${pattern}`));
});

const customerPayload = addressService.getCustomerSafeAddressPayload(created.addressId);
const customerText = JSON.stringify(customerPayload).toLowerCase();
[
  'address_detail_internal', 'normalized_address_detail_internal', '테스트 전용 상세 위치',
  'fingerprint', 'canonical_key_hash', 'duplicate_candidates', 'provider', 'coordinates',
  'latitude', 'longitude', 'validation_result', 'review', 'phone', 'email', 'margin',
  'pce', 'price queue', 'scoring', 'internal cost', 'risk_score'
].forEach((forbidden) => assert.ok(!customerText.includes(forbidden), `25. customer payload hides ${forbidden}`));
assert.strictEqual(customerPayload.customer_safe, true, '25b. customer payload is allowlisted');

const report = addressService.createAddressNormalizationReport({ finalDecision: 'MERGE_READY' });
assert.ok(report.ok && fs.existsSync(report.reportPath), '26a. address normalization report is generated');
const reportText = fs.readFileSync(report.reportPath, 'utf8').toLowerCase();
assert.ok(!reportText.includes(originalDetail.toLowerCase()), '26b. report excludes raw detail');

const entryFiles = {
  firstEntry: 'ui/app/estimate/EstimateEntryPanel.tsx',
  ceoDashboard: 'ui/app/dashboard/CeoDashboard.tsx',
  drawer: 'ui/components/modals/DetailDrawer.tsx',
  crmPipeline: 'ui/app/crm/CrmPipelineCenterView.tsx',
  intake: 'ui/app/intake/RealProjectIntakeCenterView.tsx'
};
Object.entries(entryFiles).forEach(([name, relative]) => {
  const source = fs.readFileSync(path.join(workspace, relative), 'utf8');
  assert.ok(source.includes('addressNormalization'), `27. ${name} has an internal address normalization entry`);
});
const crmSource = fs.readFileSync(path.join(workspace, entryFiles.crmPipeline), 'utf8');
assert.ok((crmSource.match(/addressNormalization/g) || []).length >= 2, '27b. CRM pipeline and site survey detail both link the center');

const viewSource = fs.readFileSync(viewPath, 'utf8');
[
  '주소 정규화 센터', '전체 주소', '정규화 완료', '검토 필요', '저신뢰',
  '잘못된 주소', '중복 의심', 'API 연결 준비', '외부 연결 비활성',
  '승인', '반려', '보류', '재정규화', '변경 이력'
].forEach((label) => assert.ok(viewSource.includes(label), `view includes ${label}`));

console.log('RC-0.4.2 address normalization smoke tests passed');
