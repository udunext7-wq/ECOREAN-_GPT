const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  createCustomerPortalDraftService,
  buildCustomerSafePortalPayload,
  validateCustomerSafePortalPayload
} = require('../electron/services/customerPortalDraftService');

const workspace = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-rc043-stabilization-'));
const dbPath = path.join(tmp, 'project.db');
const reportsDir = path.join(tmp, 'docs');
const service = createCustomerPortalDraftService({
  sqliteService: { dbPaths: { project: dbPath } },
  reportsDir
});

const servicePath = path.join(workspace, 'electron', 'services', 'customerPortalDraftService.js');
const viewPath = path.join(workspace, 'ui', 'app', 'customer-portal', 'CustomerPortalDraftCenterView.tsx');
assert.ok(fs.existsSync(servicePath), '1. customerPortalDraftService exists');
assert.ok(fs.existsSync(viewPath), '2. CustomerPortalDraftCenterView exists');

const hostilePayload = {
  portalTitle: '<script>alert(1)</script>RC-0.4.3 안정화 초안'.repeat(8),
  customerDisplayName: '안정화 고객',
  projectDisplayName: '고객 공개 현장',
  projectType: 'KITCHEN',
  customerSafeAddressSummary: '부산 / 승인된 주소 요약',
  projectStatusDisplayLabel: '내부 검토 중',
  projectStartDate: 'bad-date',
  expectedCompletionDate: '2026-09-30',
  customerVisibleProgressPercentage: 118,
  approvedCustomerEstimateTitle: '승인 고객 견적',
  approvedCustomerTotal: -3000,
  approvedVatDisplay: 'VAT 포함',
  estimateValidityDate: '2026-08-31',
  contractTitle: '승인 고객 계약',
  customerContractTotal: 12000000,
  paymentReceivedStatus: '대기',
  remainingCustomerPaymentAmount: 12000000,
  companyName: 'ECOREAN',
  publicBusinessPhone: '02-0000-0000',
  publicBusinessEmail: 'safe@example.invalid',
  assignedCustomerContactDisplayName: '고객 담당자',
  approvedBusinessHoursInformation: '평일 09:00-18:00',
  milestones: [
    { title: '고객 공개 착공', plannedDate: '2026-09-01', completedDate: '', status: '예정', customer_visible: true, progressNote: '<iframe src=x></iframe>안전 문구' },
    { title: '내부 원가 회의', plannedDate: '2026-09-02', completedDate: '2026-09-02', status: '완료', customer_visible: false, progressNote: '비공개' }
  ],
  documents: [
    { documentType: 'CUSTOMER_ESTIMATE', documentStatus: 'APPROVED', customer_approved: true, title: '고객 견적서', documentId: 'DOC-EST' },
    { documentType: 'CUSTOMER_SCHEDULE', documentStatus: 'FINAL', customer_approved: true, title: '고객 공정표', documentId: 'DOC-SCH' },
    { documentType: 'CUSTOMER_BOARD', documentStatus: 'DRAFT', customer_approved: true, title: '미승인 보드', documentId: 'DOC-DRAFT' },
    { documentType: 'INTERNAL_COST', documentStatus: 'APPROVED', customer_approved: true, title: '내부 원가표', documentId: 'DOC-COST', reference: 'C:\\secret\\cost.xlsx' }
  ],
  paymentSchedule: [
    { title: '계약금', dueDate: '2026-09-01', customerAmount: 1000000, receivedStatus: '대기', customer_visible: true },
    { title: '업체 지급', dueDate: '2026-09-03', customerAmount: 500000, receivedStatus: '내부', customer_visible: false }
  ],
  internal: {
    internalCost: 9000000,
    purchaseCost: 3000000,
    laborCost: 2000000,
    vendorCost: 1500000,
    marginRate: 0.25,
    profit: 3000000,
    pce: 'GO',
    priceQueue: 'QUEUE-SECRET',
    recommendationScoring: { scoreBreakdown: { name: 93 } },
    approvalQueue: 'APPROVAL-SECRET',
    nextAction: '대표 연락',
    overdueRisk: 'HIGH',
    internalNotification: '내부 알림',
    salesProbability: 0.8,
    negotiationStrategy: '비공개',
    customerRiskScore: 77,
    address_detail_internal: '201동 1801호',
    normalized_address_detail_internal: '상세주소',
    canonicalKey: 'CANONICAL',
    fingerprintHash: 'HASH',
    duplicateCandidates: ['DUP'],
    providerPayload: { raw: true },
    providerConfiguration: { key: 'secret' },
    coordinates: [37, 127],
    latitude: 37,
    longitude: 127,
    internalValidationReason: '비공개',
    internalReviewMemo: '비공개',
    vendor: '협력업체',
    subcontractor: '하도급',
    laborAttendance: 3,
    payroll: 100000,
    purchaseOrderInternal: 'PO',
    receivingCost: 1000,
    rootCause: '원인',
    backupId: 'BACKUP',
    dbId: 'DB',
    storagePath: 'C:\\secret\\file',
    systemLog: 'log',
    rawPhone: '010-9999-8888',
    rawEmail: 'raw@example.com',
    accountNumber: '123-456',
    idCard: 'secret',
    previewToken: 'plain-token'
  },
  unexpectedNested: {
    deep: {
      margin: 1,
      token: 'nested-token',
      file: 'file://secret'
    }
  }
};

const draft = service.createPortalDraft({
  sourcePayload: hostilePayload,
  leadId: 'LEAD-RC043-STAB',
  projectId: 'PROJECT-RC043-STAB',
  estimateId: 'EST-RC043-STAB',
  contractId: 'CON-RC043-STAB',
  createdBy: 'CEO'
});
assert.ok(draft.portal_draft_id, '3a. Draft create');
assert.ok(service.listPortalDrafts().length >= 1, '3b. Draft list');
assert.strictEqual(service.getPortalDraftDetail(draft.portal_draft_id).portal_draft_id, draft.portal_draft_id, '3c. Draft detail');
assert.ok(service.updatePortalDraft(draft.portal_draft_id, { sourcePayload: { ...hostilePayload, portalTitle: '안정화 수정 초안' } }).portal_title, '3d. Draft update');

const archived = service.archivePortalDraft(draft.portal_draft_id, { reason: 'archive test' });
assert.strictEqual(archived.portal_status, 'ARCHIVED', '4a. archive');
assert.throws(() => service.updatePortalDraft(draft.portal_draft_id, { sourcePayload: hostilePayload }), /Archived/, '4b. archive 상태 수정 제한');
assert.strictEqual(service.restorePortalDraft(draft.portal_draft_id, { reason: 'restore test' }).portal_status, 'DRAFT', '4c. restore');

assert.strictEqual(service.linkPortalDraftToLead(draft.portal_draft_id, 'LEAD-UPDATED').lead_id, 'LEAD-UPDATED', '5. Lead linkage');
assert.strictEqual(service.linkPortalDraftToProject(draft.portal_draft_id, 'PROJECT-UPDATED').project_id, 'PROJECT-UPDATED', '6. Project linkage');
assert.strictEqual(service.linkPortalDraftToEstimate(draft.portal_draft_id, 'EST-UPDATED').estimate_id, 'EST-UPDATED', '7. Estimate linkage');
assert.strictEqual(service.linkPortalDraftToContract(draft.portal_draft_id, 'CON-UPDATED').contract_id, 'CON-UPDATED', '8. Contract linkage');

const safe = buildCustomerSafePortalPayload(hostilePayload);
assert.strictEqual(safe.safety.generatedBy, 'allowlist', '9. allowlist payload builder');
const serialized = JSON.stringify(safe).toLowerCase();
[
  'unexpectednested', 'internalcost', 'purchasecost', 'laborcost', 'vendorcost', 'margin',
  'profit', 'pce', 'pricequeue', 'recommendationscoring', 'scorebreakdown', 'approvalqueue',
  'nextaction', 'overduerisk', 'internalnotification', 'salesprobability', 'negotiationstrategy',
  'customerriskscore', 'address_detail_internal', 'canonical', 'fingerprint', 'duplicate',
  'providerpayload', 'providerconfiguration', 'coordinates', 'latitude', 'longitude',
  'vendor', 'subcontractor', 'payroll', 'purchaseorderinternal', 'receivingcost',
  'rootcause', 'backup', 'dbid', 'storagepath', 'systemlog', '010-9999-8888',
  'raw@example.com', 'accountnumber', 'idcard', 'plain-token', 'nested-token',
  'javascript:', 'file://', 'c:\\secret'
].forEach((term) => assert.ok(!serialized.includes(term), `10-16. forbidden term excluded: ${term}`));

assert.strictEqual(safe.documents.length, 2, '17. customer-approved documents only');
assert.ok(safe.documents.every((doc) => doc.documentType.startsWith('CUSTOMER_')), '18. internal documents blocked');
assert.strictEqual(safe.schedule.milestones.length, 1, '19. customer-visible milestones only');
assert.strictEqual(safe.project.progressPercentage, 100, '20. progress clamped 0~100');
assert.strictEqual(buildCustomerSafePortalPayload({ ...hostilePayload, customerVisibleProgressPercentage: Number.NaN }).project.progressPercentage, 0, '21a. NaN safe');
assert.strictEqual(buildCustomerSafePortalPayload({ ...hostilePayload, customerVisibleProgressPercentage: Number.POSITIVE_INFINITY }).project.progressPercentage, 0, '21b. Infinity safe');

const snapshot1 = service.createPortalSnapshot(draft.portal_draft_id, { createdBy: 'CEO' });
const snapshot2 = service.createPortalSnapshot(draft.portal_draft_id, { createdBy: 'CEO' });
assert.ok(snapshot1.snapshot_hash, '22. Snapshot created');
assert.ok(service.listPortalSnapshots(draft.portal_draft_id).length >= 2, '23. previous Snapshot preserved');
assert.ok(Number(snapshot2.revision) > Number(snapshot1.revision), '24. Snapshot revision increased');

let detail = service.getPortalDraftDetail(draft.portal_draft_id);
assert.ok(detail.audit_history.length >= 8, '25. audit history created');
assert.strictEqual(service.requestPortalDraftReview(draft.portal_draft_id, { changedBy: 'CEO' }).review_status, 'IN_REVIEW', '26. review request');
const approved = service.approvePortalDraftInternal(draft.portal_draft_id, { approvedBy: 'CEO' });
assert.strictEqual(approved.portal_status, 'INTERNAL_APPROVED', '27. internal approval');
assert.ok(approved.approved_by && approved.approved_at, '27b. approver and approved_at recorded');
assert.strictEqual(service.rejectPortalDraftInternal(draft.portal_draft_id, { rejectedBy: 'CEO', reason: '수정 필요' }).portal_status, 'REJECTED', '28. internal rejection');
assert.strictEqual(service.revokePortalDraftApproval(draft.portal_draft_id, { reason: '재검토' }).review_status, 'REVISION_REQUIRED', '29. approval revocation');
service.requestPortalDraftReview(draft.portal_draft_id, { changedBy: 'CEO' });
service.approvePortalDraftInternal(draft.portal_draft_id, { approvedBy: 'CEO' });
const changedAfterApproval = service.updatePortalDraft(draft.portal_draft_id, {
  sourcePayload: { ...hostilePayload, portalTitle: '승인 후 변경 초안', customerVisibleProgressPercentage: 40 },
  changedBy: 'CEO'
});
assert.strictEqual(changedAfterApproval.review_status, 'REVISION_REQUIRED', '30. changed approved Draft returns to review');

const missingProject = service.createPortalDraft({ sourcePayload: hostilePayload, createdBy: 'CEO' });
assert.strictEqual(missingProject.portal_status, 'PUBLISH_BLOCKED', '31a. missing project publish block');
const missingTitle = service.createPortalDraft({ projectId: 'PROJECT-MISSING-TITLE', sourcePayload: { ...hostilePayload, portalTitle: '', customerDisplayName: '' } });
assert.strictEqual(missingTitle.portal_status, 'PUBLISH_BLOCKED', '31b. missing title/customer publish block');
const unsafeValidation = validateCustomerSafePortalPayload({ portal: { title: '' }, project: { customerDisplayName: '', margin: 1, raw_email: 'x@y.com' } });
assert.strictEqual(unsafeValidation.publishBlocked, true, '31c. publish block rules');

const preview = service.createInternalPreviewSession(draft.portal_draft_id, { createdBy: 'CEO' });
assert.ok(preview.previewSessionId, '32. preview session created');
const db = new DatabaseSync(dbPath);
const sessionRow = db.prepare('SELECT * FROM customer_portal_preview_sessions WHERE preview_session_id = ?').get(preview.previewSessionId);
assert.ok(sessionRow.preview_token_hash, '33. token hash stored');
assert.ok(!('preview_token' in sessionRow), '34. token plaintext not stored');
db.prepare('UPDATE customer_portal_preview_sessions SET expires_at = ? WHERE preview_session_id = ?').run('2000-01-01T00:00:00.000Z', preview.previewSessionId);
db.close();
assert.throws(() => service.getInternalPreviewPayload(preview.previewSessionId), /expired/i, '35. expired preview blocked');
const revokedPreview = service.createInternalPreviewSession(draft.portal_draft_id, { createdBy: 'CEO' });
service.revokeInternalPreviewSession(revokedPreview.previewSessionId);
assert.throws(() => service.getInternalPreviewPayload(revokedPreview.previewSessionId), /not active/i, '36. revoked preview blocked');
assert.strictEqual(preview.externalUrlCreated, false, '37. external public URL absent');
assert.strictEqual(preview.authenticationStatus, 'INTERNAL_PREVIEW_ONLY', '38a. external auth disabled');
assert.strictEqual(service.getPortalDraftSummary().externalPublicDisabled, true, '38b. external API/message disabled');
assert.strictEqual(validateCustomerSafePortalPayload(safe).customerSafety, 'PASSED', '39. Customer safety passed');

const entryFiles = [
  ['First Entry Panel', 'ui/app/estimate/EstimateEntryPanel.tsx'],
  ['CEO Dashboard', 'ui/app/dashboard/CeoControlTowerView.tsx'],
  ['Drawer', 'ui/components/modals/DetailDrawer.tsx'],
  ['CRM Lead detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Project detail', 'ui/app/projects/ProjectDetailView.tsx'],
  ['Contract/estimate link', 'ui/app/contract/ContractDocumentView.tsx']
];
entryFiles.forEach(([name, file]) => {
  assert.ok(fs.readFileSync(path.join(workspace, file), 'utf8').includes('customerPortalDraft'), `40. ${name} internal entry exists`);
});
assert.ok(!fs.readFileSync(path.join(workspace, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8').includes('customerPortalDraft'), '41. customer screen has no internal Draft Center entry');

assert.doesNotThrow(() => buildCustomerSafePortalPayload(null), '42a. null safely handled');
assert.doesNotThrow(() => buildCustomerSafePortalPayload(undefined), '42b. undefined safely handled');
assert.doesNotThrow(() => buildCustomerSafePortalPayload({ documents: 'not-array', milestones: 'not-array', paymentSchedule: 'not-array' }), '42c. wrong shape safely handled');
assert.doesNotThrow(() => service.listPortalDrafts({ portalStatus: 'UNKNOWN' }), '42d. invalid filter safely handled');
assert.throws(() => service.getPortalDraftDetail('NO_SUCH_DRAFT'), /not found/i, '42e. missing Draft safe error');
assert.throws(() => service.getInternalPreviewPayload('NO_SUCH_SESSION'), /not active/i, '42f. missing session safe error');
assert.ok(service.createPortalDraftAuditReport({ finalDecision: 'MERGE_READY' }).ok, '43. MERGE_READY decision possible');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-3-branch-stabilization.smoke',
  draftId: draft.portal_draft_id,
  snapshots: service.listPortalSnapshots(draft.portal_draft_id).length,
  customerSafety: 'PASSED',
  externalDelivery: 'DISABLED',
  authentication: 'INTERNAL_PREVIEW_ONLY',
  publicPortalStatus: 'NOT_AVAILABLE',
  decision: 'MERGE_READY'
}, null, 2));
