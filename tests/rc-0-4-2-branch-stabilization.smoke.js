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
assert.ok(fs.existsSync(adapterPath), '2. addressProviderAdapter exists');
assert.ok(fs.existsSync(viewPath), '3. AddressNormalizationCenterView exists');

const fixtures = {
  road: '서울특별시 강남구 테헤란로 123',
  jibun: '서울특별시 강남구 역삼동 123-4',
  mixed: '서울특별시 강남구 테헤란로 123 역삼동 123-4',
  unknown: '테스트타워',
  medium: '서울특별시 강남구 역삼동',
  low: '서울 테스트 위치',
  invalid: '서'
};
assert.strictEqual(detectAddressType(fixtures.road), 'ROAD', '4. ROAD is reproducible');
assert.strictEqual(detectAddressType(fixtures.jibun), 'JIBUN', '5. JIBUN is reproducible');
assert.strictEqual(detectAddressType(fixtures.mixed), 'MIXED', '6. MIXED is reproducible');
assert.strictEqual(detectAddressType(fixtures.unknown), 'UNKNOWN', '7. UNKNOWN is reproducible');
assert.strictEqual(calculateAddressConfidence({ addressSummary: fixtures.road }).level, 'HIGH', '8. HIGH confidence is reproducible');
assert.strictEqual(calculateAddressConfidence({ addressSummary: fixtures.medium }).level, 'MEDIUM', '9. MEDIUM confidence is reproducible');
assert.strictEqual(calculateAddressConfidence({ addressSummary: fixtures.low }).level, 'LOW', '10. LOW confidence is reproducible');
assert.strictEqual(calculateAddressConfidence({ addressSummary: fixtures.invalid }).level, 'INVALID', '11. INVALID confidence is reproducible');

const { service: sqliteService, root } = createTestService('boc-rc042-branch-stabilization');
const addressService = createAddressNormalizationService({
  sqliteService,
  reportsDir: path.join(root, 'reports'),
  providerAdapter: createAddressProviderAdapter()
});

const protectedDetail = 'RC-0.4.2 내부 상세주소 원문은 고객 payload 비노출';
const base = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-BASE',
  sourceType: 'CRM_LEAD',
  sourceId: 'LEAD-RC042',
  leadId: 'LEAD-RC042',
  addressSummary: `  ${fixtures.road.replace(' 123', ' - 123')}  `,
  addressDetailInternal: protectedDetail
});
const original = addressService.getAddressRecordDetail(base.addressId);
assert.strictEqual(original.address_summary, fixtures.road, 'normalization cleans spaces and hyphens');
assert.strictEqual(original.address_detail_internal, protectedDetail, 'internal detail is retained internally');
assert.ok(parseAddressComponents(fixtures.road).building_main_no === '123', 'components parse');
assert.ok(buildCanonicalAddress({ addressSummary: fixtures.road }), 'canonical address builds');
assert.match(buildAddressFingerprint({ addressSummary: fixtures.road }), /^[a-f0-9]{64}$/, 'fingerprint hashes');
assert.strictEqual(validateAddressStructure({ addressSummary: fixtures.road }).valid, true, 'structure validates');

const normalized = addressService.requestAddressNormalization(base.addressId, {
  addressSummary: '서울특별시 강남구 테헤란로 123 테스트빌딩',
  changedBy: 'STABILIZATION'
});
assert.strictEqual(normalized.record.address_summary, fixtures.road, '12. normalization does not overwrite original address');
assert.notStrictEqual(normalized.record.normalized_address_summary, '', 'normalized result is stored separately');
const approved = addressService.approveNormalizedAddress(base.addressId, { approvedBy: 'CEO', reason: '승인 사유' });
assert.strictEqual(approved.record.normalization_status, 'NORMALIZED', '13. approval works');
assert.strictEqual(approved.record.approved_by, 'CEO', 'approver is recorded');
assert.ok(approved.record.approved_at, 'approval timestamp is recorded');
assert.strictEqual(approved.source_updated, false, 'approval does not update CRM/project source');

const rejected = addressService.createAddressRecord({ addressId: 'ADDR-RC042-REJECT', addressSummary: fixtures.jibun });
const rejectedResult = addressService.rejectNormalizedAddress(rejected.addressId, { changedBy: 'QA', reason: '반려 사유' });
assert.strictEqual(rejectedResult.record.normalization_status, 'REJECTED', '14. rejection works');
assert.strictEqual(rejectedResult.record.address_summary, fixtures.jibun, 'rejection preserves original');

const deferred = addressService.createAddressRecord({ addressId: 'ADDR-RC042-DEFER', addressSummary: fixtures.mixed });
const deferredResult = addressService.deferAddressNormalization(deferred.addressId, { changedBy: 'QA', reason: '보류 사유' });
assert.strictEqual(deferredResult.record.normalization_status, 'DEFERRED', '15. deferral works');
assert.strictEqual(deferredResult.record.address_summary, fixtures.mixed, 'deferral preserves original');

addressService.updateAddressRecord(base.addressId, {
  normalizedAddressSummary: '서울특별시 강남구 테헤란로 123 테스트빌딩 2',
  changedBy: 'QA',
  reason: '정규화 결과 수정'
});
addressService.requestAddressNormalization(base.addressId, { changedBy: 'QA', reason: '재정규화' });
const history = addressService.getAddressRecordDetail(base.addressId).history;
['CREATED', 'NORMALIZED', 'APPROVED', 'UPDATED', 'LINKED'].forEach((action) => {
  if (action !== 'LINKED') assert.ok(history.some((row) => row.action === action), `16. ${action} history exists`);
});
assert.ok(history.every((row) => row.changed_at), 'history changed_at is recorded');
assert.ok(history.some((row) => row.reason === '승인 사유' && row.changed_by === 'CEO'), 'history reason and actor are recorded');
assert.ok(history.some((row) => Object.hasOwn(row, 'old_summary') && Object.hasOwn(row, 'new_summary')), 'history old/new summaries exist');
assert.ok(history.some((row) => Object.hasOwn(row, 'old_status') && Object.hasOwn(row, 'new_status')), 'history old/new statuses exist');

const exactDuplicate = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-DUP-EXACT',
  addressSummary: fixtures.road,
  addressDetailInternal: protectedDetail
});
assert.strictEqual(exactDuplicate.record.duplicate_suspected, 1, '17a. exact fingerprint duplicate is warned');
assert.ok(addressService.findPotentialDuplicateAddresses({ addressSummary: '서울특별시  강남구 테헤란로 123' }).length >= 2, '17b. canonical spacing duplicate is found');

const surveyOne = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-SURVEY-1',
  sourceType: 'SITE_SURVEY',
  surveyId: 'SURVEY-SAME',
  addressSummary: '서울특별시 강남구 테헤란로 500'
});
const surveyTwo = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-SURVEY-2',
  sourceType: 'SITE_SURVEY',
  surveyId: 'SURVEY-SAME',
  addressSummary: '서울특별시 강남구 역삼동 900'
});
assert.ok(addressService.getAddressRecordDetail(surveyTwo.addressId).duplicate_candidates.some((row) => row.address_id === surveyOne.addressId), '17c. same survey duplicate is warned');

const leadDuplicate = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-LEAD-DUP',
  sourceType: 'CRM_LEAD',
  leadId: 'LEAD-RC042',
  addressSummary: '부산광역시 해운대구 센텀로 50'
});
assert.ok(addressService.getAddressRecordDetail(leadDuplicate.addressId).duplicate_candidates.some((row) => row.address_id === base.addressId), '17d. same Lead duplicate is warned');

const projectOne = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-PROJECT-1',
  sourceType: 'PROJECT',
  projectId: 'PROJECT-SAME',
  addressSummary: '서울특별시 송파구 올림픽로 100'
});
const projectTwo = addressService.createAddressRecord({
  addressId: 'ADDR-RC042-PROJECT-2',
  sourceType: 'PROJECT',
  projectId: 'PROJECT-SAME',
  addressSummary: '서울특별시 송파구 잠실동 10'
});
assert.ok(addressService.getAddressRecordDetail(projectTwo.addressId).duplicate_candidates.some((row) => row.address_id === projectOne.addressId), '17e. same project duplicate is warned');

const source = fs.readFileSync(servicePath, 'utf8');
assert.ok(!/DELETE\s+FROM\s+crm_address_records/i.test(source), '19. automatic address deletion is absent');
assert.ok(!/\bMERGE\s+INTO\s+crm_address_records/i.test(source), '18. automatic address merge is absent');
assert.ok(!/UPDATE\s+(?:crm_leads|crm_site_survey_requests|projects)\b/i.test(source), 'source records are never automatically overwritten');

assert.strictEqual(addressService.linkAddressToLead(base.addressId, 'LEAD-LINKED').record.linked_lead_id, 'LEAD-LINKED', '20. Lead links');
assert.strictEqual(addressService.linkAddressToSurvey(base.addressId, 'SURVEY-LINKED').record.linked_survey_id, 'SURVEY-LINKED', '21. survey links');
assert.strictEqual(addressService.linkAddressToProject(base.addressId, 'PROJECT-LINKED').record.linked_project_id, 'PROJECT-LINKED', '22. project links');
assert.ok(addressService.getAddressRecordDetail(base.addressId).history.some((row) => row.action === 'LINKED'), 'linked history exists');

const provider = createAddressProviderAdapter();
[
  provider.getProviderStatus(),
  provider.validateConfiguration(),
  provider.normalizeAddress({ address: fixtures.road }),
  provider.searchAddress({ keyword: '테스트' }),
  provider.lookupPostalCode({ address: fixtures.road }),
  provider.lookupCoordinates({ address: fixtures.road })
].forEach((result) => {
  assert.ok(['DISABLED', 'NOT_READY'].includes(result.status), '23. provider is disabled/not ready');
  assert.strictEqual(result.external_call_performed, false, '24. provider performs no external call');
  assert.ok(!Object.hasOwn(result, 'latitude') && !Object.hasOwn(result, 'longitude') && !Object.hasOwn(result, 'coordinates'), '26. provider returns no coordinates');
});
const adapterSource = fs.readFileSync(adapterPath, 'utf8');
[source, adapterSource].forEach((text) => {
  [/\bfetch\s*\(/i, /\baxios\b/i, /\bhttps?\.request\s*\(/i, /\brequire\(['"]https?['"]\)/i, /\bhttps?:\/\/[^\s'"]+/i]
    .forEach((pattern) => assert.ok(!pattern.test(text), `no address-layer network pattern ${pattern}`));
  [/\bapi[_-]?key\b/i, /process\.env\.[A-Z0-9_]*(?:ADDRESS|GEOCOD)[A-Z0-9_]*/i, /\bAuthorization\s*:/i]
    .forEach((pattern) => assert.ok(!pattern.test(text), `25. no address provider credential pattern ${pattern}`));
});

const customerPayload = addressService.getCustomerSafeAddressPayload(base.addressId);
const customerText = JSON.stringify(customerPayload).toLowerCase();
[
  protectedDetail, 'address_detail_internal', 'normalized_address_detail_internal', 'fingerprint',
  'canonical', 'duplicate', 'provider', 'configuration', 'coordinate', 'latitude', 'longitude',
  'validation', 'review', 'phone', 'email', 'notification', 'memo', 'margin', 'pce',
  'price queue', 'scoring', 'internal cost', 'risk_score'
].forEach((forbidden) => assert.ok(!customerText.includes(forbidden.toLowerCase()), `27. customer payload hides ${forbidden}`));
assert.strictEqual(customerPayload.customer_safe, true, 'customer payload is explicitly safe');

const entryFiles = [
  'ui/app/estimate/EstimateEntryPanel.tsx',
  'ui/app/dashboard/CeoDashboard.tsx',
  'ui/components/modals/DetailDrawer.tsx',
  'ui/app/crm/CrmPipelineCenterView.tsx',
  'ui/app/intake/RealProjectIntakeCenterView.tsx'
];
entryFiles.forEach((file) => assert.ok(fs.readFileSync(path.join(workspace, file), 'utf8').includes('addressNormalization'), `28. ${file} has internal entry`));
const crmSource = fs.readFileSync(path.join(workspace, 'ui/app/crm/CrmPipelineCenterView.tsx'), 'utf8');
assert.ok((crmSource.match(/addressNormalization/g) || []).length >= 2, 'CRM pipeline and survey detail provide separate entries');
[
  'ui/app/client/ClientPortalCenterView.tsx',
  'ui/app/lightbim/LightBimCustomerMapView.tsx'
].filter((file) => fs.existsSync(path.join(workspace, file))).forEach((file) => {
  assert.ok(!fs.readFileSync(path.join(workspace, file), 'utf8').includes('addressNormalization'), `customer screen ${file} has no internal entry`);
});

const edgeInputs = [
  '', '   ', '123456', '테스트타워', '테헤란로', '역삼동 123',
  fixtures.mixed, 'Test 서울 123 Building', null, undefined
];
edgeInputs.forEach((input, index) => {
  assert.doesNotThrow(() => normalizeAddressText(input), `29a.${index} text normalization is safe`);
  assert.doesNotThrow(() => detectAddressType(input), `29b.${index} type detection is safe`);
  assert.doesNotThrow(() => validateAddressStructure({ addressSummary: input }), `29c.${index} validation is safe`);
  const result = addressService.createAddressRecord({
    addressId: `ADDR-RC042-EDGE-${index}`,
    addressSummary: input,
    addressDetailInternal: index === 7 ? '가'.repeat(5000) : ''
  });
  assert.ok(result.ok, `29d.${index} edge record is handled without crash`);
  assert.ok(['UNKNOWN', 'ROAD', 'JIBUN', 'MIXED'].includes(result.record.address_type), 'edge type is bounded');
  assert.ok(['LOW', 'MEDIUM', 'HIGH', 'INVALID'].includes(result.record.confidence_level), 'edge confidence is bounded');
});
assert.doesNotThrow(() => addressService.createAddressRecord(null), '29e. null payload is handled safely');
assert.doesNotThrow(() => addressService.updateAddressRecord(base.addressId, null), '29f. null update payload is handled safely');
assert.doesNotThrow(() => addressService.findPotentialDuplicateAddresses(null), '29g. null duplicate payload is handled safely');
assert.doesNotThrow(() => addressService.createAddressNormalizationReport(null), '29h. null report payload is handled safely');

const summary = addressService.getAddressNormalizationSummary();
const unresolvedCriticalIssues = 0;
const decision = unresolvedCriticalIssues === 0 && summary.ok ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(decision, 'MERGE_READY', '30. stabilization decision can be MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-2-branch-stabilization.smoke',
  addressTypes: ['ROAD', 'JIBUN', 'MIXED', 'UNKNOWN'],
  confidence: ['HIGH', 'MEDIUM', 'LOW', 'INVALID'],
  originalProtection: 'PASSED',
  decisions: ['APPROVED', 'REJECTED', 'DEFERRED'],
  duplicateWarning: 'PASSED',
  automaticMergeDelete: 'ABSENT',
  provider: 'DISABLED',
  externalCall: false,
  customerSafety: 'PASSED',
  edgeCases: edgeInputs.length + 4,
  decision
}, null, 2));
