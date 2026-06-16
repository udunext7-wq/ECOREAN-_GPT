'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createCrmPipelineService, CRM_STAGES } = require('../electron/services/crmPipelineService');

const workspace = path.join(__dirname, '..');
const servicePath = path.join(workspace, 'electron', 'services', 'crmPipelineService.js');
const viewPath = path.join(workspace, 'ui', 'app', 'crm', 'CrmPipelineCenterView.tsx');
const entryPointFiles = {
  firstEntry: path.join(workspace, 'ui', 'app', 'estimate', 'EstimateEntryPanel.tsx'),
  ceoDashboard: path.join(workspace, 'ui', 'app', 'dashboard', 'CeoDashboard.tsx'),
  drawer: path.join(workspace, 'ui', 'components', 'modals', 'DetailDrawer.tsx'),
  intake: path.join(workspace, 'ui', 'app', 'intake', 'RealProjectIntakeCenterView.tsx')
};

assert.ok(fs.existsSync(servicePath), 'crmPipelineService exists');
assert.ok(fs.existsSync(viewPath), 'CrmPipelineCenterView exists');

const serviceSource = fs.readFileSync(servicePath, 'utf8');
const viewSource = fs.readFileSync(viewPath, 'utf8');
assert.strictEqual(CRM_STAGES.length, 12, 'CRM defines exactly 12 stages');
CRM_STAGES.forEach((stage) => assert.ok(serviceSource.includes(`'${stage}'`), `CRM service includes ${stage}`));

const externalCallPatterns = [
  /\bfetch\s*\(/i,
  /\baxios\b/i,
  /\bhttps?\.request\s*\(/i,
  /\bhttps?:\/\/[^\s'"]+/i,
  /\bapi[_-]?key\b/i,
  /\bAuthorization\s*:/i
];
externalCallPatterns.forEach((pattern) => {
  assert.ok(!pattern.test(serviceSource), `CRM service has no external call or credential pattern: ${pattern}`);
});
assert.ok(serviceSource.includes('address_provider_payload_ref'), 'address provider uses reference preparation field');
assert.ok(serviceSource.includes('calendar_event_ref'), 'calendar uses event reference preparation field');
assert.ok(serviceSource.includes('portal_public_token_hash'), 'portal uses token hash field');

const { service, root } = createTestService('boc-rc040-branch-stabilization');
const reportsDir = path.join(root, 'reports');
const crm = createCrmPipelineService({ sqliteService: service, reportsDir });

const rawPhone = '010-9876-5432';
const rawEmail = 'stabilization.person@example.invalid';
const rawAddress = '테스트시 안정구 안전로 404 4층';
const rawMemo = 'RC-0.4.0 안정화 내부 메모 원문';
const rawPortalToken = 'rc040-public-token-plaintext-forbidden';

const created = crm.createCrmLead({
  leadId: 'CRM-RC040-STABILIZATION',
  customerName: 'RC-0.4.0 안정화 테스트 고객',
  customerType: 'TEST',
  customerPhone: rawPhone,
  customerEmail: rawEmail,
  addressSummary: '테스트시 / 안정화 현장',
  addressDetailInternal: rawAddress,
  addressNormalizedStatus: 'READY_TO_CONNECT',
  addressProvider: 'LOCAL_PLACEHOLDER',
  addressProviderPayloadRef: 'ADDRESS-REF-ONLY',
  projectType: 'FULL_REMODELING',
  projectScope: '전체 리모델링',
  expectedBudgetRange: '테스트 예산 범위',
  preferredSchedule: '협의',
  source: 'TEST',
  priority: 'HIGH',
  assignedTo: '테스트 담당',
  nextAction: '초기 상담',
  memoInternal: rawMemo,
  customerPortalStatus: 'READY_TO_CONNECT',
  portalInviteStatus: 'NOT_READY',
  portalPublicToken: rawPortalToken,
  scheduleLinkStatus: 'READY_TO_CONNECT',
  calendarProvider: 'LOCAL_PLACEHOLDER',
  calendarEventRef: 'CALENDAR-REF-ONLY',
  calendarSyncStatus: 'READY_TO_CONNECT'
});
assert.ok(created.ok && created.leadId, 'CRM lead can be created');
assert.strictEqual(created.lead.phone_masked, '010-****-5432', 'raw phone is masked at rest');
assert.strictEqual(created.lead.email_masked, 'st***@example.invalid', 'raw email is masked at rest');
assert.notStrictEqual(created.lead.portal_public_token_hash, rawPortalToken, 'portal public token plaintext is not stored');
assert.match(created.lead.portal_public_token_hash, /^[a-f0-9]{64}$/, 'portal public token is stored as SHA-256 hash');

const listed = crm.listCrmLeads({ keyword: '안정화' });
assert.ok(listed.some((lead) => lead.lead_id === created.leadId), 'CRM lead list returns created lead');
assert.strictEqual(crm.getCrmLeadDetail(created.leadId).lead_id, created.leadId, 'CRM lead detail returns created lead');

const visitedStages = ['LEAD'];
CRM_STAGES.filter((stage) => stage !== 'LEAD').forEach((stage) => {
  const moved = crm.moveCrmStage(created.leadId, stage, {
    reason: `${stage} 안정화 검증`,
    changedBy: 'TEST'
  });
  assert.strictEqual(moved.toStage, stage, `CRM can move to ${stage}`);
  visitedStages.push(moved.toStage);
});
assert.deepStrictEqual(visitedStages, CRM_STAGES, 'all 12 CRM stages are traversable in defined order');
const stageDetail = crm.getCrmLeadDetail(created.leadId);
assert.strictEqual(stageDetail.stageHistory.length, CRM_STAGES.length, 'initial stage and all moves are recorded');

const consultation = crm.createConsultationLog(created.leadId, {
  contactChannel: 'PHONE',
  consultationType: 'STABILIZATION',
  summary: '내부 범위와 일정 검토',
  publicSummary: '상담 완료 후 현장조사 일정을 준비하고 있습니다.',
  nextAction: '현장조사',
  nextActionDueAt: '2026-06-30',
  createdBy: 'TEST'
});
assert.ok(consultation.ok && consultation.logId, 'consultation log can be created');

const survey = crm.createSiteSurveyRequest(created.leadId, {
  requestedDate: '2026-07-01',
  preferredTime: '오전',
  addressSummary: '테스트시 / 안정화 현장',
  surveyStatus: 'REQUESTED',
  assignedTo: 'TEST',
  noteInternal: '내부 접근 조건 확인'
});
assert.ok(survey.ok && survey.surveyId, 'site survey request can be created');

const estimate = crm.linkLeadToEstimate(created.leadId, 'EST-RC040-STABILIZATION');
assert.strictEqual(estimate.lead.linked_estimate_id, 'EST-RC040-STABILIZATION', 'estimate can link to lead');
const project = crm.linkLeadToProject(created.leadId, 'PROJECT-RC040-STABILIZATION');
assert.strictEqual(project.lead.linked_project_id, 'PROJECT-RC040-STABILIZATION', 'project can link to lead');

const prepared = crm.updateCrmLead(created.leadId, {
  addressNormalizedStatus: 'CONNECTED',
  customerPortalStatus: 'READY_TO_CONNECT',
  portalInviteStatus: 'READY_TO_CONNECT',
  scheduleLinkStatus: 'CONNECTED',
  calendarSyncStatus: 'CONNECTED'
});
['address_normalized_status', 'customer_portal_status', 'portal_invite_status', 'schedule_link_status', 'calendar_sync_status'].forEach((field) => {
  assert.ok(['NOT_READY', 'READY_TO_CONNECT', 'CONNECTED', 'FAILED', 'DISABLED'].includes(prepared.lead[field]), `${field} stores allowed preparation status`);
});

const summary = crm.getCrmDashboardSummary();
assert.ok(summary.ok && summary.total === 1, 'CRM dashboard summary is generated');

const customerPayload = crm.getCrmCustomerSafePayload(created.leadId);
assert.strictEqual(customerPayload.customer_safe, true, 'customer payload is explicitly safe');
const customerPayloadText = JSON.stringify(customerPayload).toLowerCase();
const forbiddenValues = [rawPhone, rawEmail, rawAddress, rawMemo, rawPortalToken];
const forbiddenKeys = [
  'internal memo',
  'internal risk',
  'internal priority score',
  'detailed_address',
  'address_detail_internal',
  'customer_phone',
  'customer_email',
  'phone_masked',
  'email_masked',
  'internal estimate cost',
  'margin',
  'pce',
  'price queue',
  'recommendation scoring',
  'score breakdown',
  'vendor weight',
  'history weight',
  'approval status',
  'backup id',
  'internal cost',
  'vendor data',
  'labor cost',
  'purchase data',
  'receiving data',
  'profit',
  'risk_score',
  'memo_internal',
  'portal_public_token'
];
[...forbiddenValues, ...forbiddenKeys].forEach((forbidden) => {
  assert.ok(!customerPayloadText.includes(forbidden.toLowerCase()), `customer payload hides ${forbidden}`);
});

const report = crm.createCrmPipelineReport({
  leadId: created.leadId,
  finalDecision: 'MERGE_READY'
});
assert.ok(report.ok && fs.existsSync(report.reportPath), 'anonymized CRM report can be generated');
const reportText = fs.readFileSync(report.reportPath, 'utf8');
forbiddenValues.forEach((forbidden) => assert.ok(!reportText.includes(forbidden), `CRM report excludes ${forbidden}`));
assert.ok(reportText.includes('MERGE_READY'), 'CRM report records stabilization decision');

const entryPointExpectations = {
  firstEntry: ["view: 'crmPipeline'", '고객 CRM 파이프라인'],
  ceoDashboard: ["openView('crmPipeline'", '고객 CRM 파이프라인'],
  drawer: ["view === 'crmPipeline'", '<CrmPipelineCenterView'],
  intake: ["navigate('crmPipeline')", '고객 CRM 파이프라인']
};
Object.entries(entryPointFiles).forEach(([key, filePath]) => {
  const source = fs.readFileSync(filePath, 'utf8');
  entryPointExpectations[key].forEach((fragment) => assert.ok(source.includes(fragment), `${key} entry point includes ${fragment}`));
});
assert.ok(viewSource.includes('고객용 출력 가능 정보 미리보기'), 'CRM view includes customer-safe preview');
assert.ok(viewSource.includes('외부 API 호출과 API key 저장은 비활성 상태입니다.'), 'CRM view states external integration is disabled');

const stabilizationDecision = (
  created.ok &&
  visitedStages.length === 12 &&
  consultation.ok &&
  survey.ok &&
  estimate.ok &&
  project.ok &&
  customerPayload.customer_safe &&
  report.ok
) ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(stabilizationDecision, 'MERGE_READY', 'stabilization decision is MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-0-branch-stabilization.smoke',
  leadId: created.leadId,
  stageCount: visitedStages.length,
  consultation: 'PASSED',
  siteSurvey: 'PASSED',
  estimateLink: 'PASSED',
  projectLink: 'PASSED',
  connectionPreparation: 'PASSED',
  masking: 'PASSED',
  portalTokenHash: 'PASSED',
  externalApiCalls: 'DISABLED',
  customerSafety: 'PASSED',
  entryPoints: Object.keys(entryPointFiles),
  decision: stabilizationDecision,
  reportPath: report.reportPath
}, null, 2));
