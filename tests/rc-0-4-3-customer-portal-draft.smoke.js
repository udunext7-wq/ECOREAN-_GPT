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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-rc043-customer-portal-'));
const dbPath = path.join(tmp, 'project.db');
const reportsDir = path.join(tmp, 'docs');
const sqliteService = { dbPaths: { project: dbPath } };
const service = createCustomerPortalDraftService({ sqliteService, reportsDir });

const servicePath = path.join(workspace, 'electron', 'services', 'customerPortalDraftService.js');
const viewPath = path.join(workspace, 'ui', 'app', 'customer-portal', 'CustomerPortalDraftCenterView.tsx');
assert.ok(fs.existsSync(servicePath), '1. customerPortalDraftService exists');
assert.ok(fs.existsSync(viewPath), '2. CustomerPortalDraftCenterView exists');

const sourcePayload = {
  portalTitle: 'RC-0.4.3 고객 포털 초안',
  customerDisplayName: '테스트 고객',
  projectDisplayName: '테스트 현장 공개명',
  projectType: 'FULL_REMODELING',
  customerSafeAddressSummary: '서울 / 승인된 주소 요약',
  projectStatusDisplayLabel: '견적 검토 중',
  projectStartDate: '2026-07-01',
  expectedCompletionDate: '2026-08-15',
  customerVisibleProgressPercentage: 118,
  approvedCustomerEstimateTitle: '고객용 견적',
  approvedCustomerTotal: 55000000,
  approvedVatDisplay: 'VAT 포함',
  estimateValidityDate: '2026-07-15',
  contractTitle: '고객 계약',
  contractDate: '2026-07-01',
  customerContractTotal: 55000000,
  paymentReceivedStatus: '대기',
  remainingCustomerPaymentAmount: 45000000,
  companyName: 'ECOREAN',
  publicBusinessPhone: '02-0000-0000',
  publicBusinessEmail: 'hello@example.invalid',
  assignedCustomerContactDisplayName: '고객 담당자',
  approvedBusinessHoursInformation: '평일 09:00-18:00',
  milestones: [
    { title: '현장 실측', plannedDate: '2026-07-02', status: '예정', customer_visible: true, progressNote: '방문 일정을 조율 중입니다.' },
    { title: '내부 발주 검토', plannedDate: '2026-07-03', status: '내부', customer_visible: false, progressNote: '고객 비공개' }
  ],
  documents: [
    { documentType: 'CUSTOMER_ESTIMATE', documentStatus: 'APPROVED', customer_approved: true, title: '고객용 견적서', documentId: 'DOC-CUSTOMER-ESTIMATE' },
    { documentType: 'CUSTOMER_CONTRACT', documentStatus: 'FINAL', customer_approved: true, title: '고객용 계약서', documentId: 'DOC-CUSTOMER-CONTRACT' },
    { documentType: 'INTERNAL_COST', documentStatus: 'APPROVED', customer_approved: true, title: '내부 원가표', documentId: 'DOC-INTERNAL-COST', path: 'C:\\secret\\internal.xlsx' },
    { documentType: 'CUSTOMER_BOARD', documentStatus: 'DRAFT', customer_approved: true, title: '미승인 보드', documentId: 'DOC-DRAFT' }
  ],
  paymentSchedule: [
    { title: '계약금', dueDate: '2026-07-01', customerAmount: 10000000, receivedStatus: '대기', customer_visible: true },
    { title: '업체 선급', dueDate: '2026-07-03', customerAmount: 3000000, receivedStatus: '내부', customer_visible: false }
  ],
  internalCost: 39000000,
  laborCost: 8000000,
  margin: 0.29,
  pce: 'GO',
  price_queue: 'RPUQ-SECRET',
  recommendation_scoring: { score: 93 },
  address_detail_internal: '101동 1203호',
  canonical_key_hash: 'SECRET_HASH',
  provider_payload: { raw: true },
  latitude: 37.5,
  longitude: 127.1,
  raw_phone: '010-1234-5678',
  raw_email: 'customer@example.com',
  internal_action: '대표 후속 연락',
  internal_notification: '내부 알림',
  token: 'plain-token-should-not-leak'
};

const draft = service.createPortalDraft({
  sourcePayload,
  leadId: 'LEAD-RC043',
  projectId: 'PROJECT-RC043',
  estimateId: 'EST-RC043',
  contractId: 'CON-RC043',
  createdBy: 'CEO'
});
assert.ok(draft.portal_draft_id, '3. Draft 생성 가능');

const list = service.listPortalDrafts();
assert.ok(list.some((row) => row.portal_draft_id === draft.portal_draft_id), '4. Draft 목록 조회 가능');

const detail = service.getPortalDraftDetail(draft.portal_draft_id);
assert.strictEqual(detail.portal_draft_id, draft.portal_draft_id, '5. Draft 상세 조회 가능');

const updated = service.updatePortalDraft(draft.portal_draft_id, {
  sourcePayload: { ...sourcePayload, portalTitle: 'RC-0.4.3 고객 포털 수정 초안' },
  changedBy: 'CEO'
});
assert.strictEqual(updated.portal_title, 'RC-0.4.3 고객 포털 수정 초안', '6. Draft 수정 가능');

const archived = service.archivePortalDraft(draft.portal_draft_id, { reason: 'smoke archive' });
assert.strictEqual(archived.portal_status, 'ARCHIVED', '7a. Draft archive 가능');
const restored = service.restorePortalDraft(draft.portal_draft_id, { reason: 'smoke restore' });
assert.strictEqual(restored.portal_status, 'DRAFT', '7b. Draft restore 가능');

assert.strictEqual(service.linkPortalDraftToLead(draft.portal_draft_id, 'LEAD-LINKED').lead_id, 'LEAD-LINKED', '8. Lead 연결 가능');
assert.strictEqual(service.linkPortalDraftToProject(draft.portal_draft_id, 'PROJECT-LINKED').project_id, 'PROJECT-LINKED', '9. 프로젝트 연결 가능');
assert.strictEqual(service.linkPortalDraftToEstimate(draft.portal_draft_id, 'EST-LINKED').estimate_id, 'EST-LINKED', '10. 견적 연결 가능');
assert.strictEqual(service.linkPortalDraftToContract(draft.portal_draft_id, 'CON-LINKED').contract_id, 'CON-LINKED', '11. 계약 연결 가능');

const safe = buildCustomerSafePortalPayload(sourcePayload);
assert.strictEqual(safe.safety.generatedBy, 'allowlist', '12. customer-safe payload 생성 가능');
assert.ok(!Object.prototype.hasOwnProperty.call(safe, 'internalCost'), '13. allowlist 방식 확인');

const serialized = JSON.stringify(safe).toLowerCase();
[
  'internalcost', 'internal_cost', 'laborcost', 'labor_cost', 'margin', 'pce',
  'price_queue', 'recommendation_scoring', 'score_breakdown', 'address_detail_internal',
  'canonical_key_hash', 'fingerprint', 'provider_payload', 'latitude', 'longitude',
  'internal_action', 'internal_notification', '010-1234-5678', 'customer@example.com',
  'plain-token-should-not-leak', 'c:\\secret'
].forEach((forbidden) => {
  assert.ok(!serialized.includes(forbidden), `14-19. forbidden customer payload value hidden: ${forbidden}`);
});

assert.strictEqual(safe.documents.length, 2, '20. customer-approved final/approved 문서만 포함');
assert.ok(safe.documents.every((doc) => doc.documentType.startsWith('CUSTOMER_')), '21. internal 문서 차단');
assert.strictEqual(safe.schedule.milestones.length, 1, '22. customer-visible milestone만 포함');
assert.strictEqual(safe.project.progressPercentage, 100, '23. 진행률 0~100 제한');

const snapshot1 = service.createPortalSnapshot(draft.portal_draft_id, { createdBy: 'CEO' });
const snapshot2 = service.createPortalSnapshot(draft.portal_draft_id, { createdBy: 'CEO' });
assert.ok(snapshot1.snapshot_id, '24. snapshot 생성 가능');
assert.ok(service.listPortalSnapshots(draft.portal_draft_id).length >= 2, '25. 이전 snapshot 보존');

assert.strictEqual(service.requestPortalDraftReview(draft.portal_draft_id, { changedBy: 'CEO' }).review_status, 'IN_REVIEW', '26. 내부 review 요청 가능');
assert.strictEqual(service.approvePortalDraftInternal(draft.portal_draft_id, { approvedBy: 'CEO' }).portal_status, 'INTERNAL_APPROVED', '27. 내부 승인 가능');
assert.strictEqual(service.rejectPortalDraftInternal(draft.portal_draft_id, { reason: '문구 수정' }).portal_status, 'REJECTED', '28. 내부 반려 가능');
assert.strictEqual(service.revokePortalDraftApproval(draft.portal_draft_id, { reason: '재검토' }).review_status, 'REVISION_REQUIRED', '29. 승인 취소 가능');

const leakValidation = validateCustomerSafePortalPayload({
  portal: { title: '누출 테스트' },
  project: { customerDisplayName: '고객', detailed_address: '101동 1203호', margin: 0.3 },
  raw_email: 'leak@example.com'
});
assert.strictEqual(leakValidation.publishBlocked, true, '30. publish block 규칙 동작');

const preview = service.createInternalPreviewSession(draft.portal_draft_id, { createdBy: 'CEO' });
assert.ok(preview.previewSessionId, '31. internal preview session 생성 가능');
assert.ok(preview.previewTokenHash && !preview.previewTokenHash.includes(preview.previewSessionId), '32a. preview token hash 저장');
assert.ok(!Object.prototype.hasOwnProperty.call(preview, 'previewToken'), '32b. preview token 원문 반환 없음');

const db = new DatabaseSync(dbPath);
const previewRow = db.prepare('SELECT * FROM customer_portal_preview_sessions WHERE preview_session_id = ?').get(preview.previewSessionId);
db.close();
assert.ok(previewRow.preview_token_hash, '32c. preview token hash DB 저장');
assert.ok(!('preview_token' in previewRow), '32d. preview token 원문 DB 저장 없음');

assert.strictEqual(service.revokeInternalPreviewSession(preview.previewSessionId).status, 'REVOKED', '33. preview revoke 가능');
assert.strictEqual(preview.externalUrlCreated, false, '34. 외부 공개 URL 생성 없음');
assert.strictEqual(preview.authenticationStatus, 'INTERNAL_PREVIEW_ONLY', '35. 외부 인증 호출 없음');
assert.strictEqual(service.getPortalDraftSummary().externalPublicDisabled, true, '36. 외부 메시지/공개 발송 없음');
assert.strictEqual(validateCustomerSafePortalPayload(safe).customerSafety, 'PASSED', '37. Customer safety PASSED');

const entryFiles = [
  ['First Entry Panel', 'ui/app/estimate/EstimateEntryPanel.tsx'],
  ['CEO Dashboard', 'ui/app/dashboard/CeoControlTowerView.tsx'],
  ['Drawer', 'ui/components/modals/DetailDrawer.tsx'],
  ['CRM Lead detail', 'ui/app/crm/CrmPipelineCenterView.tsx'],
  ['Project detail', 'ui/app/projects/ProjectDetailView.tsx'],
  ['Contract/estimate link', 'ui/app/contract/ContractDocumentView.tsx']
];
entryFiles.forEach(([name, file]) => {
  assert.ok(fs.readFileSync(path.join(workspace, file), 'utf8').includes('customerPortalDraft'), `38. ${name} internal entry exists`);
});

const customerScreen = fs.readFileSync(path.join(workspace, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
assert.ok(!customerScreen.includes('customerPortalDraft'), '39. 고객 화면에 내부 Draft Center 진입점 없음');

const finalDetail = service.getPortalDraftDetail(draft.portal_draft_id);
assert.ok(finalDetail.audit_history.length >= 10, '40. audit history 생성 가능');

const report = service.createPortalDraftAuditReport({ finalDecision: 'MERGE_READY' });
assert.ok(fs.existsSync(report.reportPath), 'audit report generated');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-3-customer-portal-draft.smoke',
  draftId: draft.portal_draft_id,
  snapshots: service.listPortalSnapshots(draft.portal_draft_id).length,
  previewStatus: 'REVOKED',
  customerSafety: 'PASSED',
  externalDelivery: 'DISABLED',
  authentication: 'INTERNAL_PREVIEW_ONLY',
  decision: 'MERGE_READY'
}, null, 2));
