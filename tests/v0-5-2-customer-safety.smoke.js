const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');
const { createRoleChangeApprovalService } = require('../electron/services/roleChangeApprovalService');
const { createPermissionAuditExportService } = require('../electron/services/permissionAuditExportService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v052-customer-safety-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const roles = createRolePermissionService({ databasePath, auditService: audit });
const workflow = createRoleChangeApprovalService({ databasePath, auditService: audit, rolePermissionService: roles });
const exporter = createPermissionAuditExportService({ databasePath, auditService: audit });

const source = {
  project_name: '고객 안전 테스트 프로젝트',
  estimate_total: 12000000,
  customer_phone: '010-1111-2222',
  customer_email: 'customer@example.invalid',
  detailed_address: '테스트 상세주소',
  memo: '고객 메모 원문',
  internal_cost: 8000000,
  margin: 4000000,
  pce: 'GO',
  vendor_price: 3000000,
  approval_queue: [{ id: 'Q-1' }],
  role_change_requests: [{ requestId: 'RCR-1', approverId: 'ADMIN-1' }],
  permission_diff: { addedPermissions: ['estimate.margin.view'] },
  permission_audit_events: [{ raw: true }],
  risk_level: 'HIGH',
  access_token: 'must-not-leak'
};
const safe = roles.sanitizeDataForRole('CLIENT_VIEWER', source);
const serializedSafe = JSON.stringify(safe).toLowerCase();
[
  'customer_phone', 'customer_email', 'detailed_address', 'memo',
  'internal_cost', 'margin', 'pce', 'vendor_price', 'approval_queue',
  'role_change', 'permission_diff', 'permission_audit', 'risk_level',
  'approver', 'access_token'
].forEach((term) => assert.ok(!serializedSafe.includes(term), `customer payload hides ${term}`));
assert.strictEqual(safe.project_name, source.project_name, 'customer-safe project field remains');
assert.strictEqual(safe.estimate_total, source.estimate_total, 'customer-safe estimate total remains');

roles.setActiveRole('CLIENT_VIEWER', { actor: 'TEST_SETUP', reasonKo: 'customer transition fixture' });
const request = workflow.createRoleChangeRequest({
  requesterId: 'CLIENT-REQUESTER',
  requesterRole: 'CLIENT_VIEWER',
  targetUserId: 'USER-LOCAL-RBAC',
  currentRole: 'CLIENT_VIEWER',
  requestedRole: 'MANAGER',
  reasonKo: '내부 업무 역할 전환 요청'
});
assert.deepStrictEqual(workflow.verifyCustomerSafetyTransition(request), { checked: true, passed: true, leaks: [] });
workflow.approveRoleChangeRequest(request.requestId, {
  approverId: 'ADMIN-APPROVER', approverRole: 'ADMIN'
});
const applied = workflow.applyApprovedRoleChange(request.requestId, {
  actorId: 'ADMIN-APPROVER', actorRole: 'ADMIN'
});
assert.strictEqual(applied.status, 'APPLIED', 'safe customer-to-internal transition can apply after approval');

audit.recordEvent({
  actor: 'CLIENT_VIEWER', roleId: 'CLIENT_VIEWER', eventType: 'CUSTOMER_OUTPUT_GENERATED',
  permissionKey: 'customer_output.generate', decision: 'ALLOWED', reasonKo: '고객 출력 안전성 점검', payload: source
});
const exported = exporter.generatePermissionAuditExport({ format: 'JSON', actorId: 'CEO', actorRole: 'CEO' });
const serializedExport = exported.content.toLowerCase();
['010-1111-2222', 'customer@example.invalid', '테스트 상세주소', '고객 메모 원문', 'must-not-leak']
  .forEach((term) => assert.ok(!serializedExport.includes(term.toLowerCase()), `audit export hides ${term}`));

const center = roles.getRolePermissionCenterData();
assert.strictEqual(center.externalAuthentication, 'DISABLED');
assert.strictEqual(center.securityModel, 'LOCAL_INTERNAL_RBAC');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-customer-safety',
  customerPayload: 'PASSED',
  customerToInternalTransition: 'PASSED',
  auditRedaction: 'PASSED',
  externalAuth: 'DISABLED'
}, null, 2));
