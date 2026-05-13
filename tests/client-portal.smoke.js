const assert = require('assert');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-client-portal');
const estimateId = createGoBathroomEstimate(service, 'CLIENT-PORTAL');
const { contract, schedule } = createScheduleAndPurchase(service, estimateId);

service.createDailySiteReportFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  reportDate: '2026-05-10',
  actor: 'CEO'
});

const checklist = service.createInspectionChecklistFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  processNameKo: '욕실 검수',
  actor: 'CEO'
});
service.saveInspectionChecklistResults({
  projectId: estimateId,
  checklistId: checklist.checklistId,
  results: [],
  actor: 'CEO'
});

const changeOrder = service.createExecutionChangeOrder({
  projectId: estimateId,
  siteNameKo: '고객 포털 테스트 현장',
  titleKo: '고객 승인 추가공사',
  changeContentKo: '수납장 추가 설치',
  changeReasonKo: '고객 요청',
  additionalAmount: 500000,
  additionalCost: 260000,
  scheduleImpactDays: 1,
  actor: 'CEO'
});

let portal = service.getClientPortalData({ projectId: estimateId });
assert.ok(portal.projectSummary, 'Client portal loads');
assert.strictEqual(portal.customerSafe, true, 'Client portal is customer-safe');
assert.ok(portal.estimateView.totalCustomerAmount > 0, 'Client estimate view loads');
assert.ok(portal.contractView.contractNumber, 'Client contract view loads');
assert.ok(portal.scheduleView.scheduleName, 'Client schedule view loads');
assert.ok(Array.isArray(portal.paymentView.payments), 'Client payment schedule loads');

const serialized = JSON.stringify(portal).toLowerCase();
[
  'pce',
  'margin',
  'internal_total',
  'material_cost',
  'labor_cost',
  'subcontract_cost',
  'additional_cost',
  'additional_margin',
  'vendor'
].forEach((forbidden) => {
  assert.ok(!serialized.includes(forbidden), `Client portal must hide ${forbidden}`);
});

const response = service.respondClientChangeOrder({
  projectId: estimateId,
  changeOrderId: changeOrder.changeOrderId,
  clientName: '고객 포털 고객',
  responseStatus: 'APPROVED'
});
assert.ok(response.responseId, 'Change order approval updates status');
portal = service.getClientPortalData({ projectId: estimateId });
assert.ok(portal.changeOrderView.changeOrders.some((item) => item.approvalStatus === 'APPROVED'), 'Approved change order is visible safely');
assert.ok(portal.paymentView.payments.some((payment) => payment.paymentType === '추가공사'), 'Approved change order updates payment schedule');

const defect = service.createClientDefectRequest({
  projectId: estimateId,
  clientName: '고객 포털 고객',
  defectLocationKo: '욕실 세면대 하부',
  defectContentKo: '물방울이 보입니다.',
  urgent: true,
  contactTimeKo: '오후 3시 이후'
});
assert.ok(defect.requestId, 'Defect request creates client request');
assert.ok(defect.defectId, 'Defect request creates defect record');

const completion = service.saveClientCompletionConfirmation({
  projectId: estimateId,
  clientName: '고객 포털 고객',
  status: 'CONFIRMED',
  note: '완료 확인'
});
assert.ok(completion.confirmationId, 'Completion confirmation is saved');

const token = service.generateClientPortalToken({
  projectId: estimateId,
  clientName: '고객 포털 고객',
  daysValid: 7
});
assert.ok(token.token, 'Token placeholder can be generated');
assert.strictEqual(token.shareStatusKo, '고객 공유 링크 준비 중');

const stats = service.getDbStats();
assert.ok(stats.clientPortalTokenCount >= 1, 'client_portal_tokens has rows');
assert.ok(stats.clientConfirmationCount >= 1, 'client_confirmations has rows');
assert.ok(stats.clientChangeOrderResponseCount >= 1, 'client_change_order_responses has rows');
assert.ok(stats.clientDefectRequestCount >= 1, 'client_defect_requests has rows');

console.log('client-portal smoke passed');
