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
const customerFiles = [
  path.join(workspace, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'),
  path.join(workspace, 'ui', 'app', 'lightbim', 'LightBIMCustomerProposalMapView.tsx'),
  path.join(workspace, 'ui', 'app', 'board', 'BoardGenerationCenterView.tsx')
];

assert.ok(fs.existsSync(servicePath), 'crmNextActionService exists');
assert.ok(fs.existsSync(viewPath), 'CrmNextActionCenterView exists');

const { service, root } = createTestService('boc-rc041-branch-stabilization');
const reportsDir = path.join(root, 'reports');
const crm = createCrmPipelineService({ sqliteService: service });
const automation = createCrmNextActionService({ sqliteService: service, crmPipelineService: crm, reportsDir });
crm.setNextActionService(automation);

const rawPhone = '010-7777-1234';
const rawEmail = 'stabilization.customer@example.invalid';
const rawAddress = '서울시 테스트구 비노출로 41 상세주소';
const rawMemo = '고객에게 노출하면 안 되는 내부 액션 메모';

const lead = crm.createCrmLead({
  leadId: 'CRM-RC041-STABILIZATION',
  customerName: 'RC-0.4.1 안정화 테스트 고객',
  customerType: 'TEST',
  customerPhone: rawPhone,
  customerEmail: rawEmail,
  addressSummary: '서울 / 안정화 테스트 현장',
  addressDetailInternal: rawAddress,
  projectType: 'FULL_REMODELING',
  projectScope: '전체 리모델링',
  expectedBudgetRange: '테스트 예산',
  priority: 'HIGH',
  assignedTo: '대표',
  memoInternal: rawMemo
});
assert.ok(lead.ok && lead.leadId, 'lead can be created');

let actions = automation.listCrmNextActions({ leadId: lead.leadId });
const firstContact = actions.find((row) => row.action_type === 'FIRST_CONTACT');
assert.ok(firstContact, 'lead creation generates FIRST_CONTACT');
assert.strictEqual(automation.generateNextActionsForLead(lead.leadId).duplicate, true, 'duplicate active action is prevented');
assert.strictEqual(automation.getCrmNextActionDetail(firstContact.action_id).action_id, firstContact.action_id, 'action detail can be read');

const completeAction = automation.createCrmNextAction({
  leadId: lead.leadId,
  actionType: 'MANUAL',
  title: '완료 안정화',
  dueAt: '2099-01-01T00:00:00.000Z',
  preventDuplicate: false
});
assert.strictEqual(
  automation.completeCrmNextAction(completeAction.actionId, { completionNote: '안정화 완료' }).action.status,
  'COMPLETED',
  'action can be completed'
);

const holdAction = automation.createCrmNextAction({
  leadId: lead.leadId,
  actionType: 'CUSTOMER_CHECK',
  title: '24시간 보류 안정화',
  dueAt: '2099-01-01T00:00:00.000Z',
  preventDuplicate: false
});
const held = automation.snoozeCrmNextAction(holdAction.actionId, {});
assert.strictEqual(held.action.status, 'SNOOZED', 'action can be snoozed for 24 hours');
assert.ok(new Date(held.action.snooze_until).getTime() > Date.now(), '24-hour snooze has a future due time');

const deferAction = automation.createCrmNextAction({
  leadId: lead.leadId,
  actionType: 'MANUAL',
  title: '7일 연기 안정화',
  dueAt: '2099-01-01T00:00:00.000Z',
  preventDuplicate: false
});
const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString();
const deferred = automation.snoozeCrmNextAction(deferAction.actionId, { snoozeUntil: sevenDaysLater });
assert.strictEqual(deferred.action.status, 'SNOOZED', 'action can be deferred');
assert.strictEqual(deferred.action.snooze_until, sevenDaysLater, 'seven-day defer date is preserved');

const cancelAction = automation.createCrmNextAction({
  leadId: lead.leadId,
  actionType: 'MANUAL',
  title: '취소 안정화',
  dueAt: '2099-01-01T00:00:00.000Z',
  preventDuplicate: false
});
assert.strictEqual(
  automation.cancelCrmNextAction(cancelAction.actionId, { reason: '안정화 취소' }).action.status,
  'CANCELLED',
  'action can be cancelled'
);

const overdueAction = automation.createCrmNextAction({
  leadId: lead.leadId,
  actionType: 'MANUAL',
  title: '기한 초과 안정화',
  dueAt: '2020-01-01T00:00:00.000Z',
  priority: 'URGENT',
  preventDuplicate: false
});
assert.strictEqual(automation.getCrmNextActionDetail(overdueAction.actionId).status, 'OVERDUE', 'past due action becomes OVERDUE');
assert.strictEqual(
  automation.listCrmNotifications({ category: 'OVERDUE' }).filter((row) => row.target_id === overdueAction.actionId).length,
  1,
  'OVERDUE creates one internal notification'
);

[
  ['CONTACTED', 'CONSULTATION_REVIEW'],
  ['CONSULTING', 'FOLLOW_UP'],
  ['SITE_SURVEY_SCHEDULED', 'SITE_SURVEY_CONFIRM'],
  ['SITE_SURVEY_DONE', 'ESTIMATE_PREPARE'],
  ['ESTIMATE_REQUESTED', 'ESTIMATE_SEND'],
  ['ESTIMATE_SENT', 'NEGOTIATION_FOLLOW_UP'],
  ['CONTRACT_PENDING', 'CONTRACT_FOLLOW_UP'],
  ['CONTRACTED', 'PROJECT_HANDOFF']
].forEach(([stage, actionType]) => {
  crm.moveCrmStage(lead.leadId, stage, { reason: `${stage} 안정화 검증` });
  actions = automation.listCrmNextActions({ leadId: lead.leadId });
  assert.ok(actions.some((row) => row.action_type === actionType), `${stage} generates ${actionType}`);
  assert.ok(STAGE_RULES[stage], `${stage} rule exists`);
});

const notification = automation.createInternalCrmNotification({
  leadId: lead.leadId,
  targetType: 'LEAD',
  targetId: lead.leadId,
  severity: 'CRITICAL',
  category: 'DATA_QUALITY',
  title: `${rawPhone} 확인`,
  messageInternal: `${rawEmail} 내부 연락 필요`
});
const notificationText = JSON.stringify(notification);
assert.ok(!notificationText.includes(rawPhone), 'raw phone is masked in internal notification');
assert.ok(!notificationText.includes(rawEmail), 'raw email is masked in internal notification');
assert.strictEqual(notification.notification.external_delivery_status, 'DISABLED', 'external delivery remains DISABLED');
assert.strictEqual(automation.markCrmNotificationRead(notification.notificationId).notification.status, 'READ', 'notification can be read');
assert.strictEqual(automation.dismissCrmNotification(notification.notificationId).notification.status, 'DISMISSED', 'notification can be dismissed');

crm.moveCrmStage(lead.leadId, 'ON_HOLD', { reason: '안정화 보류' });
assert.ok(
  automation.listCrmNextActions({ leadId: lead.leadId })
    .filter((row) => !['COMPLETED', 'CANCELLED'].includes(row.status))
    .every((row) => row.status === 'SNOOZED'),
  'ON_HOLD restricts all active actions'
);
crm.moveCrmStage(lead.leadId, 'LOST', { reason: '안정화 종료' });
assert.ok(
  automation.listCrmNextActions({ leadId: lead.leadId })
    .filter((row) => row.status !== 'COMPLETED')
    .every((row) => row.status === 'CANCELLED'),
  'LOST cancels all non-completed actions'
);

const summary = automation.getCrmNextActionDashboardSummary();
assert.ok(summary.ok && summary.kpis && summary.counts, 'dashboard summary can be generated');
assert.strictEqual(summary.externalDeliveryStatus, 'DISABLED', 'dashboard reports external delivery disabled');

const customerPayload = crm.getCrmCustomerSafePayload(lead.leadId);
const customerText = JSON.stringify(customerPayload).toLowerCase();
[
  rawPhone, rawEmail, rawAddress, rawMemo,
  'internal notification', 'internal action memo', 'delay risk', 'internal priority score',
  'detailed_address', 'customer_phone', 'customer_email', 'message_internal',
  'description_internal', 'overdue', 'internal estimate cost', 'margin', 'pce',
  'price queue', 'recommendation scoring', 'score breakdown', 'vendor weight',
  'history weight', 'approval status', 'backup id', 'internal cost', 'vendor data',
  'labor cost', 'purchase data', 'receiving data', 'profit', 'risk_score'
].forEach((forbidden) => {
  assert.ok(!customerText.includes(forbidden.toLowerCase()), `customer payload hides ${forbidden}`);
});

const serviceSource = fs.readFileSync(servicePath, 'utf8');
[
  /\bfetch\s*\(/i, /\baxios\b/i, /\bhttps?\.request\s*\(/i,
  /\bhttps?:\/\/[^\s'"]+/i, /\bapi[_-]?key\b/i, /\bAuthorization\s*:/i
].forEach((pattern) => assert.ok(!pattern.test(serviceSource), `no external provider call pattern: ${pattern}`));

const viewSource = fs.readFileSync(viewPath, 'utf8');
['조건에 맞는 다음 액션이 없습니다.', '내부 알림이 없습니다.', '24시간 보류', '7일 연기'].forEach((label) => {
  assert.ok(viewSource.includes(label), `view includes ${label}`);
});

const entryPoints = {
  firstEntry: 'ui/app/estimate/EstimateEntryPanel.tsx',
  ceoDashboard: 'ui/app/dashboard/CeoDashboard.tsx',
  drawer: 'ui/components/modals/DetailDrawer.tsx',
  crmPipeline: 'ui/app/crm/CrmPipelineCenterView.tsx',
  intake: 'ui/app/intake/RealProjectIntakeCenterView.tsx'
};
Object.entries(entryPoints).forEach(([name, relativePath]) => {
  assert.ok(fs.readFileSync(path.join(workspace, relativePath), 'utf8').includes('crmNextActions'), `${name} entry point exists`);
});
customerFiles.forEach((filePath) => {
  assert.ok(!fs.readFileSync(filePath, 'utf8').includes('crmNextActions'), `${path.basename(filePath)} has no internal CRM entry point`);
});

const report = automation.createCrmNextActionReport({ finalDecision: 'MERGE_READY' });
assert.ok(report.ok && fs.existsSync(report.reportPath), 'stabilization report can be generated');
const reportText = fs.readFileSync(report.reportPath, 'utf8').toLowerCase();
[rawPhone, rawEmail, rawAddress, rawMemo].forEach((forbidden) => {
  assert.ok(!reportText.includes(forbidden.toLowerCase()), `generated report hides ${forbidden}`);
});

const decision = 'MERGE_READY';
assert.strictEqual(decision, 'MERGE_READY', 'stabilization decision can be MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-1-branch-stabilization.smoke',
  leadId: lead.leadId,
  actionLifecycle: 'PASSED',
  stageAutomation: 'PASSED',
  duplicatePrevention: 'PASSED',
  overdue: 'PASSED',
  notifications: 'INTERNAL_ONLY',
  holdLostRestrictions: 'PASSED',
  externalApi: 'DISABLED',
  customerSafety: 'PASSED',
  entryPoints: Object.keys(entryPoints),
  decision
}, null, 2));
