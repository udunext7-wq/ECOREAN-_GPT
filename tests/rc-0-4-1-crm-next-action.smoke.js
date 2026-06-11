'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTestService } = require('./execution-test-helpers');
const { createCrmPipelineService } = require('../electron/services/crmPipelineService');
const { createCrmNextActionService, STAGE_RULES } = require('../electron/services/crmNextActionService');

const workspace = path.join(__dirname, '..');
const servicePath = path.join(workspace, 'electron', 'services', 'crmNextActionService.js');
const viewPath = path.join(workspace, 'ui', 'app', 'crm', 'CrmNextActionCenterView.tsx');
assert.ok(fs.existsSync(servicePath), 'crm next action service exists');
assert.ok(fs.existsSync(viewPath), 'crm next action center exists');

const { service, root } = createTestService('boc-rc041-crm-next-action');
const reportsDir = path.join(root, 'reports');
const crm = createCrmPipelineService({ sqliteService: service });
const nextAction = createCrmNextActionService({ sqliteService: service, crmPipelineService: crm, reportsDir });
crm.setNextActionService(nextAction);

const created = crm.createCrmLead({
  leadId: 'CRM-RC041-SMOKE',
  customerName: 'RC-0.4.1 테스트 고객',
  customerType: 'TEST',
  customerPhone: '010-1111-2222',
  customerEmail: 'rc041@example.invalid',
  addressSummary: '서울 / 테스트 현장',
  addressDetailInternal: '상세주소 원문 비노출',
  projectType: 'FULL_REMODELING',
  projectScope: '전체 리모델링',
  priority: 'HIGH',
  assignedTo: '대표',
  memoInternal: '내부 CRM 메모 비노출'
});
assert.ok(created.ok, 'CRM lead can be created');

let actions = nextAction.listCrmNextActions({ leadId: created.leadId });
assert.strictEqual(actions.filter((row) => row.action_type === 'FIRST_CONTACT').length, 1, 'LEAD creates first contact action');
const duplicate = nextAction.generateNextActionsForLead(created.leadId);
assert.strictEqual(duplicate.duplicate, true, 'automatic generation does not duplicate an active rule action');

const first = actions.find((row) => row.action_type === 'FIRST_CONTACT');
const detail = nextAction.getCrmNextActionDetail(first.action_id);
assert.strictEqual(detail.action_id, first.action_id, 'action detail can be read');
assert.strictEqual(detail.customerSafePreview.customer_safe, true, 'detail exposes only an allowlisted customer preview');

const manualComplete = nextAction.createCrmNextAction({
  leadId: created.leadId, actionType: 'MANUAL', title: '완료 테스트',
  dueAt: '2099-01-01T00:00:00.000Z', preventDuplicate: false
});
assert.strictEqual(nextAction.completeCrmNextAction(manualComplete.actionId, { completionNote: '완료' }).action.status, 'COMPLETED', 'action can be completed');

const manualSnooze = nextAction.createCrmNextAction({
  leadId: created.leadId, actionType: 'CUSTOMER_CHECK', title: '보류 테스트',
  dueAt: '2099-01-01T00:00:00.000Z', preventDuplicate: false
});
assert.strictEqual(nextAction.snoozeCrmNextAction(manualSnooze.actionId, {}).action.status, 'SNOOZED', 'action can be snoozed');

const manualCancel = nextAction.createCrmNextAction({
  leadId: created.leadId, actionType: 'MANUAL', title: '취소 테스트',
  dueAt: '2099-01-01T00:00:00.000Z', preventDuplicate: false
});
assert.strictEqual(nextAction.cancelCrmNextAction(manualCancel.actionId, { reason: '취소' }).action.status, 'CANCELLED', 'action can be cancelled');

const overdue = nextAction.createCrmNextAction({
  leadId: created.leadId, actionType: 'MANUAL', title: '기한 초과 테스트',
  dueAt: '2020-01-01T00:00:00.000Z', priority: 'URGENT', preventDuplicate: false
});
assert.strictEqual(nextAction.getCrmNextActionDetail(overdue.actionId).status, 'OVERDUE', 'past due action becomes overdue');

[
  ['CONTACTED', 'CONSULTATION_REVIEW'],
  ['SITE_SURVEY_DONE', 'ESTIMATE_PREPARE'],
  ['ESTIMATE_REQUESTED', 'ESTIMATE_SEND'],
  ['CONTRACT_PENDING', 'CONTRACT_FOLLOW_UP'],
  ['CONTRACTED', 'PROJECT_HANDOFF']
].forEach(([stage, actionType]) => {
  const current = crm.getCrmLeadDetail(created.leadId).stage;
  crm.moveCrmStage(created.leadId, stage, { reason: 'RC-0.4.1 자동화 검증' });
  actions = nextAction.listCrmNextActions({ leadId: created.leadId });
  assert.ok(actions.some((row) => row.action_type === actionType), `${stage} creates ${actionType}`);
  assert.ok(STAGE_RULES[stage], `${stage} has an enabled rule`);
  assert.notStrictEqual(current, stage, `${stage} stage transition is applied`);
});

const notification = nextAction.createInternalCrmNotification({
  leadId: created.leadId, targetType: 'LEAD', targetId: created.leadId,
  severity: 'CRITICAL', category: 'STAGE_DELAY', title: '내부 지연 알림',
  messageInternal: '고객 화면에 노출하면 안 되는 내부 알림'
});
assert.strictEqual(notification.notification.external_delivery_status, 'DISABLED', 'external notification delivery is disabled');
const piiNotification = nextAction.createInternalCrmNotification({
  leadId: created.leadId, title: '010-9999-8888 연락',
  messageInternal: 'private.person@example.invalid 로 연락', category: 'DATA_QUALITY'
});
assert.ok(!JSON.stringify(piiNotification).includes('010-9999-8888'), 'notification masks raw phone');
assert.ok(!JSON.stringify(piiNotification).includes('private.person@example.invalid'), 'notification masks raw email');
assert.strictEqual(nextAction.markCrmNotificationRead(notification.notificationId).notification.status, 'READ', 'notification can be marked read');
assert.strictEqual(nextAction.dismissCrmNotification(notification.notificationId).notification.status, 'DISMISSED', 'notification can be dismissed');

crm.moveCrmStage(created.leadId, 'ON_HOLD', { reason: '보류 검증' });
assert.ok(nextAction.listCrmNextActions({ leadId: created.leadId }).filter((row) => !['COMPLETED', 'CANCELLED'].includes(row.status)).every((row) => row.status === 'SNOOZED'), 'ON_HOLD snoozes active actions');
crm.moveCrmStage(created.leadId, 'LOST', { reason: '종료 검증' });
assert.ok(nextAction.listCrmNextActions({ leadId: created.leadId }).filter((row) => row.status !== 'COMPLETED').every((row) => row.status === 'CANCELLED'), 'LOST cancels active actions');

const summary = nextAction.getCrmNextActionDashboardSummary();
assert.ok(summary.ok && summary.kpis.overdue >= 0, 'dashboard summary is generated');
assert.strictEqual(summary.externalDeliveryStatus, 'DISABLED', 'dashboard confirms internal-only notifications');

const customerPayload = crm.getCrmCustomerSafePayload(created.leadId);
const customerText = JSON.stringify(customerPayload).toLowerCase();
[
  'crm_next_actions', 'crm_internal_notifications', 'message_internal', 'description_internal',
  'completion_note', 'delay risk', 'priority', 'queue', 'internal cost', 'margin', 'pce',
  'vendor data', 'labor cost', 'profit', 'risk_score', '상세주소 원문 비노출',
  '내부 crm 메모 비노출', '고객 화면에 노출하면 안 되는 내부 알림'
].forEach((forbidden) => assert.ok(!customerText.includes(forbidden.toLowerCase()), `customer payload hides ${forbidden}`));

const serviceSource = fs.readFileSync(servicePath, 'utf8');
[
  /\bfetch\s*\(/i, /\baxios\b/i, /\bhttps?\.request\s*\(/i,
  /\bhttps?:\/\/[^\s'"]+/i, /\bapi[_-]?key\b/i, /\bAuthorization\s*:/i
].forEach((pattern) => assert.ok(!pattern.test(serviceSource), `service has no external API pattern: ${pattern}`));

const report = nextAction.createCrmNextActionReport({ finalDecision: 'MERGE_READY' });
assert.ok(report.ok && fs.existsSync(report.reportPath), 'next action report can be generated');
const reportText = fs.readFileSync(report.reportPath, 'utf8').toLowerCase();
['010-1111-2222', 'rc041@example.invalid', '상세주소 원문 비노출', '내부 crm 메모 비노출'].forEach((forbidden) => {
  assert.ok(!reportText.includes(forbidden.toLowerCase()), `report excludes ${forbidden}`);
});

const viewSource = fs.readFileSync(viewPath, 'utf8');
['CRM 다음 액션 / 내부 알림', '다음 액션 목록', '수동 다음 액션 생성', '내부 알림', '24시간 보류'].forEach((label) => {
  assert.ok(viewSource.includes(label), `view includes ${label}`);
});
[
  'ui/app/estimate/EstimateEntryPanel.tsx',
  'ui/app/dashboard/CeoDashboard.tsx',
  'ui/components/modals/DetailDrawer.tsx',
  'ui/app/crm/CrmPipelineCenterView.tsx',
  'ui/app/intake/RealProjectIntakeCenterView.tsx'
].forEach((relativePath) => {
  assert.ok(fs.readFileSync(path.join(workspace, relativePath), 'utf8').includes('crmNextActions'), `${relativePath} links next action center`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-1-crm-next-action.smoke',
  leadId: created.leadId,
  ruleCount: Object.keys(STAGE_RULES).length,
  complete: 'PASSED',
  snooze: 'PASSED',
  cancel: 'PASSED',
  overdue: 'PASSED',
  notifications: 'INTERNAL_ONLY',
  customerSafety: 'PASSED',
  externalApi: 'DISABLED',
  decision: 'MERGE_READY'
}, null, 2));
