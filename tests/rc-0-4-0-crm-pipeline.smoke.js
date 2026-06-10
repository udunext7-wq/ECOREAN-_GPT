'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createCrmPipelineService, CRM_STAGES } = require('../electron/services/crmPipelineService');

const { service, root } = createTestService('boc-rc040-crm-pipeline');
const reportsDir = path.join(root, 'reports');
const crm = createCrmPipelineService({ sqliteService: service, reportsDir });

const servicePath = path.join(__dirname, '..', 'electron', 'services', 'crmPipelineService.js');
const viewPath = path.join(__dirname, '..', 'ui', 'app', 'crm', 'CrmPipelineCenterView.tsx');
assert.ok(fs.existsSync(servicePath), 'crmPipelineService exists');
assert.ok(fs.existsSync(viewPath), 'CrmPipelineCenterView exists');

const rawPhone = '010-1234-5678';
const rawEmail = 'real.person@example.com';
const rawAddress = '서울시 테스트구 테스트로 123 101동 1001호';
const rawMemo = '고객 내부 협상 메모 원문';
const rawPortalToken = 'portal-public-token-must-not-be-stored';

const created = crm.createCrmLead({
  leadId: 'CRM-RC040-SMOKE',
  customerName: 'RC-0.4.0 테스트 고객',
  customerType: 'TEST',
  customerPhone: rawPhone,
  customerEmail: rawEmail,
  addressSummary: '서울 / 테스트 현장',
  addressDetailInternal: rawAddress,
  projectType: 'FULL_REMODELING',
  projectScope: '욕실, 주방, 바닥, 도배',
  expectedBudgetRange: '4,000만~6,000만원',
  preferredSchedule: '2026년 하반기',
  source: 'DIRECT',
  priority: 'HIGH',
  assignedTo: '대표',
  nextAction: '상담 일정 확정',
  memoInternal: rawMemo,
  addressNormalizedStatus: 'READY_TO_CONNECT',
  addressProvider: 'NOT_CONFIGURED',
  customerPortalStatus: 'READY_TO_CONNECT',
  portalInviteStatus: 'NOT_READY',
  portalPublicToken: rawPortalToken,
  scheduleLinkStatus: 'READY_TO_CONNECT',
  calendarProvider: 'NOT_CONFIGURED',
  calendarSyncStatus: 'READY_TO_CONNECT'
});
assert.ok(created.ok && created.leadId, 'CRM lead can be created');
assert.strictEqual(created.lead.stage, 'LEAD', 'new CRM lead starts at LEAD');
assert.strictEqual(created.lead.phone_masked, '010-****-5678', 'phone is stored masked');
assert.strictEqual(created.lead.email_masked, 're***@example.com', 'email is stored masked');
assert.notStrictEqual(created.lead.portal_public_token_hash, rawPortalToken, 'portal token plaintext is not stored');
assert.strictEqual(created.lead.portal_public_token_hash.length, 64, 'portal token is SHA-256 hashed');

const list = crm.listCrmLeads({ priority: 'HIGH' });
assert.ok(list.some((lead) => lead.lead_id === created.leadId), 'CRM lead list returns created lead');

const detail = crm.getCrmLeadDetail(created.leadId);
assert.strictEqual(detail.lead_id, created.leadId, 'CRM lead detail is available');
assert.ok(CRM_STAGES.includes(detail.stage), 'CRM stage is valid');

const moved = crm.moveCrmStage(created.leadId, 'CONSULTING', {
  reason: '초기 연락 완료',
  nextAction: '공사 범위 상담'
});
assert.strictEqual(moved.toStage, 'CONSULTING', 'CRM stage can move');
assert.ok(moved.lead.stageHistory.some((row) => row.to_stage === 'CONSULTING'), 'stage history is recorded');

const consultation = crm.createConsultationLog(created.leadId, {
  contactChannel: 'PHONE',
  consultationType: 'INITIAL',
  summary: '내부 상담 상세: 예산과 공사 범위 확인',
  publicSummary: '공사 범위 상담을 완료했습니다.',
  nextAction: '현장조사 일정 확정',
  nextActionDueAt: '2026-06-20',
  createdBy: '대표'
});
assert.ok(consultation.ok && consultation.logId, 'consultation log can be created');

const survey = crm.createSiteSurveyRequest(created.leadId, {
  requestedDate: '2026-06-25',
  preferredTime: '오후',
  addressSummary: '서울 / 테스트 현장',
  assignedTo: '현장 담당',
  noteInternal: '주차 및 엘리베이터 확인'
});
assert.ok(survey.ok && survey.surveyId, 'site survey request can be created');
assert.strictEqual(survey.detail.stage, 'SITE_SURVEY_SCHEDULED', 'site survey request updates stage');

const estimateLink = crm.linkLeadToEstimate(created.leadId, 'EST-RC040-SMOKE');
assert.strictEqual(estimateLink.lead.linked_estimate_id, 'EST-RC040-SMOKE', 'estimate can link to CRM lead');
assert.strictEqual(estimateLink.lead.stage, 'ESTIMATE_SENT', 'estimate link updates stage');

const projectLink = crm.linkLeadToProject(created.leadId, 'PROJECT-RC040-SMOKE');
assert.strictEqual(projectLink.lead.linked_project_id, 'PROJECT-RC040-SMOKE', 'project can link to CRM lead');

const updated = crm.updateCrmLead(created.leadId, {
  addressNormalizedStatus: 'CONNECTED',
  addressProvider: 'LOCAL_PLACEHOLDER',
  customerPortalStatus: 'READY_TO_CONNECT',
  portalInviteStatus: 'READY_TO_CONNECT',
  scheduleLinkStatus: 'CONNECTED',
  calendarProvider: 'LOCAL_PLACEHOLDER',
  calendarEventRef: 'LOCAL-EVENT-REF',
  calendarSyncStatus: 'CONNECTED'
});
assert.strictEqual(updated.lead.address_normalized_status, 'CONNECTED', 'address connection preparation status is stored');
assert.strictEqual(updated.lead.customer_portal_status, 'READY_TO_CONNECT', 'portal preparation status is stored');
assert.strictEqual(updated.lead.calendar_sync_status, 'CONNECTED', 'calendar preparation status is stored');

const summary = crm.getCrmDashboardSummary();
assert.ok(summary.ok && summary.total === 1, 'CRM dashboard summary can be generated');
assert.strictEqual(summary.counts.ESTIMATE_SENT, 1, 'dashboard summary reflects current stage');

const customerPayload = crm.getCrmCustomerSafePayload(created.leadId);
assert.strictEqual(customerPayload.customer_safe, true, 'customer payload is marked safe');
const serializedCustomerPayload = JSON.stringify(customerPayload).toLowerCase();
[
  rawPhone.toLowerCase(),
  rawEmail.toLowerCase(),
  rawAddress.toLowerCase(),
  rawMemo.toLowerCase(),
  rawPortalToken.toLowerCase(),
  'memo_internal',
  'phone_masked',
  'email_masked',
  'address_detail',
  'internal cost',
  'margin',
  'pce',
  'price queue',
  'recommendation scoring',
  'score breakdown',
  'vendor weight',
  'history weight',
  'approval status',
  'backup id',
  'labor cost',
  'purchase data',
  'receiving data',
  'profit',
  'risk_score'
].forEach((forbidden) => assert.ok(!serializedCustomerPayload.includes(forbidden), `customer payload hides ${forbidden}`));
assert.strictEqual(customerPayload.public_consultation_summaries[0].public_summary, '공사 범위 상담을 완료했습니다.', 'only explicit public consultation summary is exposed');

const report = crm.createCrmPipelineReport({ leadId: created.leadId, finalDecision: 'MERGE_READY' });
assert.ok(report.ok && fs.existsSync(report.reportPath), 'CRM report can be generated');
const reportText = fs.readFileSync(report.reportPath, 'utf8');
[rawPhone, rawEmail, rawAddress, rawMemo, rawPortalToken].forEach((forbidden) => {
  assert.ok(!reportText.includes(forbidden), `CRM report excludes sensitive value: ${forbidden}`);
});

const viewSource = fs.readFileSync(viewPath, 'utf8');
['고객 CRM 파이프라인 센터', '신규 고객 등록', '상담 기록 추가', '현장조사 요청 생성', '견적 요청으로 연결', '기존 프로젝트와 연결'].forEach((label) => {
  assert.ok(viewSource.includes(label), `CRM view includes ${label}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-0-crm-pipeline.smoke',
  leadId: created.leadId,
  stage: estimateLink.lead.stage,
  consultationLog: 'PASSED',
  siteSurvey: 'PASSED',
  estimateLink: 'PASSED',
  projectLink: 'PASSED',
  connectionPreparation: 'PASSED',
  customerSafety: 'PASSED',
  reportPath: report.reportPath
}, null, 2));
