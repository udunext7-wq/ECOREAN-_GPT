const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v051-audit-viewer-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createRolePermissionService({ databasePath, auditService: audit });

service.evaluatePermission({
  roleId: 'STAFF',
  permissionKey: 'estimate.margin.view',
  actor: 'LOCAL_TEST',
  resourceType: 'ESTIMATE',
  resourceId: 'EST-1',
  payload: {
    customer_phone: '010-1111-2222',
    customer_email: 'private@example.invalid',
    detailed_address: '서울시 테스트구 상세주소',
    access_token: 'secret-token',
    provider_payload: { raw_phone: '010-3333-4444' }
  }
});
audit.recordEvent({
  actor: 'CEO',
  roleId: 'CEO',
  eventType: 'INTERNAL_COST_ACCESSED',
  permissionKey: 'estimate.internal_cost.view',
  resourceType: 'ESTIMATE',
  resourceId: 'EST-1',
  decision: 'ALLOWED',
  reasonKo: '내부 원가 조회 권한 확인',
  payload: { raw_email: 'raw@example.invalid', full_address: '원문 상세주소', safe_id: 'EST-1' }
});
audit.recordEvent({
  actor: 'CEO',
  roleId: 'CEO',
  eventType: 'CUSTOMER_OUTPUT_GENERATED',
  permissionKey: 'customer_output.generate',
  resourceType: 'OUTPUT',
  resourceId: 'OUT-1',
  decision: 'ALLOWED',
  reasonKo: '고객용 출력 생성',
  payload: { customer_name: '테스트 고객', token: 'must-redact' }
});

const denied = service.listAuditEvents({ eventType: 'PERMISSION_DENIED', roleId: 'STAFF', limit: 10 });
assert.ok(denied.length >= 1, 'permission_denied can be queried');
const internalCost = service.listAuditEvents({ eventType: 'INTERNAL_COST_ACCESSED', limit: 10 });
assert.ok(internalCost.length === 1, 'internal_cost_accessed can be queried');
const customerOutput = service.listAuditEvents({ eventType: 'CUSTOMER_OUTPUT_GENERATED', limit: 10 });
assert.ok(customerOutput.length === 1, 'customer_output_generated can be queried');

const serialized = JSON.stringify([...denied, ...internalCost, ...customerOutput]);
[
  '010-1111-2222',
  'private@example.invalid',
  '서울시 테스트구 상세주소',
  'secret-token',
  '010-3333-4444',
  'raw@example.invalid',
  '원문 상세주소',
  'must-redact'
].forEach((term) => assert.ok(!serialized.includes(term), `audit viewer redacts ${term}`));
assert.ok(serialized.includes('[REDACTED]'), 'redacted marker is present');

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui/app/settings/PermissionAuditViewer.tsx'), 'utf8');
assert.ok(ui.includes('PERMISSION AUDIT VIEWER'), 'audit viewer component exists');
assert.ok(ui.includes('PERMISSION_DENIED'), 'permission denied filter exists');
assert.ok(ui.includes('ACTIVE_ROLE_CHANGED'), 'role changed filter exists');
assert.ok(ui.includes('INTERNAL_COST_ACCESSED'), 'internal cost access filter exists');
assert.ok(ui.includes('CUSTOMER_OUTPUT_GENERATED'), 'customer output filter exists');
assert.ok(ui.includes('원문 전화번호'), 'audit redaction notice exists');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-1-permission-audit-viewer',
  auditViewer: 'PASSED',
  auditRedaction: 'PASSED'
}, null, 2));
