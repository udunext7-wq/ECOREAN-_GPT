const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createTestService, createGoBathroomEstimate, createScheduleAndPurchase } = require('./execution-test-helpers');

const { service } = createTestService('boc-payment-cashflow');
const estimateId = createGoBathroomEstimate(service, 'PAYMENT');
const { contract, purchaseOrder } = createScheduleAndPurchase(service, estimateId);

let paymentCenter = service.getPaymentCenterData();
assert.ok(paymentCenter.customerPayments.some((item) => item.contract_id === contract.contractId), 'contract creates customer payment schedule');
assert.ok(paymentCenter.vendorPayments.some((item) => item.purchase_order_id === purchaseOrder.purchaseOrderId), 'purchase order creates vendor payment schedule');

const deposit = paymentCenter.customerPayments.find((item) => item.payment_type === 'DEPOSIT');
assert.ok(deposit, 'deposit payment exists');
const paidCustomer = service.markCustomerPaymentReceived({ paymentId: deposit.payment_id, amount: deposit.scheduled_amount, actor: 'CEO' });
assert.strictEqual(paidCustomer.status, 'PAID', 'customer payment can be marked paid');

paymentCenter = service.getPaymentCenterData();
const progress = paymentCenter.customerPayments.find((item) => item.payment_type === 'PROGRESS');
assert.ok(progress, 'progress payment exists');
const partialCustomer = service.markCustomerPaymentReceived({ paymentId: progress.payment_id, amount: Math.round(progress.scheduled_amount / 2), actor: 'CEO' });
assert.strictEqual(partialCustomer.status, 'PARTIAL_PAID', 'partial payment updates balance');

paymentCenter = service.getPaymentCenterData();
const vendorPayment = paymentCenter.vendorPayments.find((item) => item.purchase_order_id === purchaseOrder.purchaseOrderId);
assert.ok(vendorPayment, 'vendor payment exists');
assert.ok(paymentCenter.summary.payableAmount >= 0, 'cashflow has payable amount');

const approval = service.requestVendorPaymentApproval({ paymentId: vendorPayment.payment_id, actor: 'CEO' });
assert.ok(approval.approvalRequestId, 'vendor payment over threshold creates approval request');
service.decideCeoApprovalRequest({ requestId: approval.approvalRequestId, decision: 'APPROVED', actor: 'CEO', reasonKo: 'payment smoke approval' });
const paidVendor = service.markVendorPaymentPaid({ paymentId: vendorPayment.payment_id, amount: vendorPayment.scheduled_amount, actor: 'CEO' });
assert.strictEqual(paidVendor.status, 'PAID', 'vendor payment can be marked paid');

const projectDb = new DatabaseSync(service.dbPaths.project);
const now = new Date().toISOString();
const pastDue = '2026-01-01';
projectDb.prepare(`
  INSERT INTO customer_payments (
    payment_id, contract_id, estimate_id, project_id, customer_name, site_name,
    payment_type, due_date, scheduled_amount, actual_received_date,
    actual_received_amount, payment_status, notes_ko, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('CPAY-SMOKE-OVERDUE', contract.contractId, estimateId, estimateId, '연체 고객', '연체 현장', 'BALANCE', pastDue, 2000000, null, 0, 'SCHEDULED', '잔금', now, now);
projectDb.prepare(`
  INSERT INTO receivables (
    receivable_id, project_id, amount, due_date, actual_received_date,
    receivable_status, notes_ko, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('REC-CPAY-SMOKE-OVERDUE', estimateId, 2000000, pastDue, null, 'EXPECTED', '잔금', now, now);
projectDb.close();

paymentCenter = service.getPaymentCenterData();
assert.ok(paymentCenter.alerts.some((alert) => alert.payment_id === 'CPAY-SMOKE-OVERDUE'), 'overdue customer payment creates alert');
assert.ok(paymentCenter.communicationData.messages.some((message) => message.related_entity_id === 'REC-CPAY-SMOKE-OVERDUE'), 'overdue customer payment creates communication draft');
assert.ok(Number(paymentCenter.summary.sevenDayExpectedInflow || 0) >= 0, 'cashflow snapshot calculates seven-day forecast');

const tower = service.getCeoControlTowerData();
assert.ok(tower.cashflow, 'CEO Control Tower receives cashflow data');
assert.ok(tower.redAlerts.some((alert) => alert.sourceModule === 'Payment'), 'CEO Control Tower receives overdue RED ALERT');

console.log('payment-cashflow smoke passed');
