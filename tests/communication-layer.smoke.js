const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-communication-layer');
const estimateId = createGoBathroomEstimate(service, 'COMM');
const { contract, schedule, purchaseOrder } = createScheduleAndPurchase(service, estimateId);

const contractMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_CONTRACT_NOTICE',
  relatedEntityType: 'Contract',
  relatedEntityId: contract.contractId,
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(contractMessage.message.body.includes('계약서'), 'contract notice message generated');

const scheduleMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_SCHEDULE_NOTICE',
  relatedEntityType: 'Schedule',
  relatedEntityId: schedule.scheduleId,
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(scheduleMessage.message.body.includes('공사 기간'), 'schedule notice message generated');

const poMessage = service.generateCommunicationMessage({
  messageType: 'VENDOR_PURCHASE_ORDER',
  relatedEntityType: 'PurchaseOrder',
  relatedEntityId: purchaseOrder.purchaseOrderId,
  targetType: 'VENDOR',
  status: 'DRAFT',
  force: true
});
assert.ok(poMessage.message.body.includes('발주번호'), 'purchase order vendor message generated');

const changeOrder = service.createExecutionChangeOrder({
  projectId: estimateId,
  titleKo: '고객 요청 선반 추가',
  changeContentKo: '욕실 코너 선반 추가',
  changeReasonKo: '고객 요청',
  additionalAmount: 400000,
  additionalCost: 200000,
  actor: 'CEO'
});
const changeOrderMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_CHANGE_ORDER_APPROVAL',
  relatedEntityType: 'ChangeOrder',
  relatedEntityId: changeOrder.changeOrderId,
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(changeOrderMessage.message.body.includes('추가공사'), 'change order approval message generated');

const checklist = service.createInspectionChecklistFromSchedule({
  projectId: estimateId,
  scheduleId: schedule.scheduleId,
  processNameKo: '욕실 검수',
  actor: 'CEO'
});
const inspection = service.saveInspectionChecklistResults({
  projectId: estimateId,
  checklistId: checklist.checklistId,
  results: checklist.checklist.items.map((item) => ({ itemId: item.itemId, resultStatus: 'PASS' })),
  actor: 'CEO'
});
const inspectionMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_INSPECTION_RESULT',
  relatedEntityType: 'Inspection',
  relatedEntityId: inspection.inspectionResultId,
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(inspectionMessage.message.body.includes('검수 결과'), 'inspection result message generated');

const defect = service.createDefectReport({
  projectId: estimateId,
  siteNameKo: '커뮤니케이션 테스트 현장',
  defectLocationKo: '샤워부스 하부',
  defectTypeKo: '실리콘 보완',
  severity: 'MEDIUM',
  rootCauseKo: '접합부 보완 필요',
  estimatedCost: 50000,
  actor: 'CEO'
});
const defectMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_DEFECT_RECEIVED',
  relatedEntityType: 'Defect',
  relatedEntityId: defect.defectId,
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(defectMessage.message.body.includes('하자 접수'), 'defect received message generated');

const projectDb = new DatabaseSync(service.dbPaths.project);
const now = new Date().toISOString();
projectDb.prepare(`
  INSERT INTO receivables (
    receivable_id, project_id, amount, due_date, actual_received_date,
    receivable_status, notes_ko, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('REC-COMM-001', estimateId, 1500000, '2026-05-10', null, 'DUE', '중도금 요청', now, now);
projectDb.close();
const paymentMessage = service.generateCommunicationMessage({
  messageType: 'CLIENT_PAYMENT_REQUEST',
  relatedEntityType: 'Receivable',
  relatedEntityId: 'REC-COMM-001',
  targetType: 'CLIENT',
  status: 'DRAFT',
  force: true
});
assert.ok(paymentMessage.message.body.includes('요청 금액'), 'payment request message generated');
assert.strictEqual(paymentMessage.message.status, 'DRAFT', 'message saved as DRAFT');

const sent = service.markCommunicationMessageSent({
  messageId: paymentMessage.messageId,
  channel: 'COPY_MANUAL',
  actor: 'CEO'
});
assert.strictEqual(sent.status, 'SENT', 'message can be marked SENT');

const center = service.getCommunicationCenterData();
assert.ok(center.messages.length >= 7, 'Communication Center returns messages');
assert.ok(center.sendLogs.length >= 1, 'Communication Center returns logs');

console.log('communication-layer smoke passed');
