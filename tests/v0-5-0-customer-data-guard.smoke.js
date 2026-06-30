const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v050-customer-guard-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createRolePermissionService({ databasePath, auditService: audit });

const source = {
  project_name: '테스트 프로젝트',
  customer_name: '테스트 고객',
  customer_phone: '010-0000-0000',
  customer_email: 'test@example.invalid',
  detailed_address: '테스트 상세주소',
  memo: '고객 메모 원문',
  estimate_total: 12000000,
  internal_cost: 8000000,
  labor_cost: 2500000,
  margin: 4000000,
  profit_rate: 33,
  pce: 'GO',
  vendor_price: 3000000,
  approval_queue: [{ id: 'Q-1' }],
  access_token: 'must-not-leak',
  nested: { risk_score: 77, public_summary: '고객 승인 요약' }
};

const client = service.sanitizeDataForRole('CLIENT_VIEWER', source);
const serializedClient = JSON.stringify(client).toLowerCase();
[
  'customer_phone', 'customer_email', 'detailed_address', 'memo',
  'internal_cost', 'labor_cost', 'margin', 'profit_rate', 'pce',
  'vendor_price', 'approval_queue', 'access_token', 'risk_score'
].forEach((term) => assert.ok(!serializedClient.includes(term), `client payload hides ${term}`));
assert.strictEqual(client.project_name, source.project_name, 'approved project field remains');
assert.strictEqual(client.estimate_total, source.estimate_total, 'customer estimate total remains');
assert.strictEqual(client.nested.public_summary, source.nested.public_summary, 'customer-safe summary remains');

const auditPayload = audit.recordEvent({
  roleId: 'CLIENT_VIEWER',
  eventType: 'TEST_REDACTION',
  decision: 'DENIED',
  payload: source
}).payload;
const serializedAudit = JSON.stringify(auditPayload);
assert.ok(!serializedAudit.includes('010-0000-0000'), 'audit does not store raw phone');
assert.ok(!serializedAudit.includes('test@example.invalid'), 'audit does not store raw email');
assert.ok(!serializedAudit.includes('테스트 상세주소'), 'audit does not store detailed address');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-customer-data-guard',
  customerDataGuard: 'PASSED',
  auditRedaction: 'PASSED'
}, null, 2));
