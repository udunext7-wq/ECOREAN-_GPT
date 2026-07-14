const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');
const { createRoleChangeApprovalService } = require('../electron/services/roleChangeApprovalService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v052-role-request-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const roles = createRolePermissionService({ databasePath, auditService: audit });
const service = createRoleChangeApprovalService({ databasePath, auditService: audit, rolePermissionService: roles });

const draft = service.createRoleChangeRequest({
  requesterId: 'REQUESTER-1',
  requesterRole: 'CEO',
  targetUserId: 'USER-LOCAL-RBAC',
  currentRole: 'CEO',
  requestedRole: 'MANAGER',
  reasonKo: '프로젝트 운영 역할 요청',
  submit: false
});
assert.strictEqual(draft.status, 'DRAFT', 'draft request can be saved');
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'draft does not change role');
assert.deepStrictEqual(draft.permissionDiff.addedPermissions, [], 'CEO to MANAGER adds no permission');
assert.ok(draft.permissionDiff.removedPermissions.includes('system.settings.edit'), 'permission diff records removed setting permission');

const pending = service.submitRoleChangeRequest(draft.requestId, {
  actorId: 'REQUESTER-1', actorRole: 'CEO', noteKo: '승인 요청 제출'
});
assert.strictEqual(pending.status, 'PENDING', 'draft can be submitted');
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'pending request does not change role');

roles.setActiveRole('STAFF', { actor: 'TEST_SETUP', reasonKo: 'high risk fixture' });
const highRisk = service.createRoleChangeRequest({
  requesterId: 'REQUESTER-2',
  requesterRole: 'STAFF',
  targetUserId: 'USER-LOCAL-RBAC',
  currentRole: 'STAFF',
  requestedRole: 'ADMIN',
  reasonKo: '관리자 역할 요청'
});
assert.strictEqual(highRisk.riskLevel, 'HIGH', 'ADMIN request is high risk');
assert.ok(highRisk.permissionDiff.dangerousAddedPermissions.includes('system.settings.edit'), 'dangerous permission is classified');
assert.ok(highRisk.permissionDiff.addedPermissions.includes('estimate.internal_cost.view'), 'permission additions are accurate');

assert.throws(() => service.createRoleChangeRequest({
  requesterId: 'REQUESTER-3', targetUserId: 'USER-LOCAL-RBAC',
  currentRole: 'STAFF', requestedRole: 'UNKNOWN', reasonKo: 'unknown role'
}), /Unknown or missing role/, 'unknown role is denied');
assert.throws(() => service.createRoleChangeRequest({
  requesterId: 'REQUESTER-4', targetUserId: 'USER-LOCAL-RBAC',
  currentRole: 'CEO', requestedRole: 'MANAGER', reasonKo: 'forged current role'
}), /does not match/, 'claimed current role must match active role');

const requestedEvents = audit.listEvents({ eventType: 'ROLE_CHANGE_REQUESTED', limit: 20 });
assert.ok(requestedEvents.length >= 2, 'role change requests create audit events');
assert.ok(service.listRoleChangeRequests({ status: 'PENDING' }).length >= 2, 'approval queue returns pending requests');

const mainSource = fs.readFileSync(path.join(__dirname, '..', 'electron/main.js'), 'utf8');
assert.ok(mainSource.includes('Direct role changes are disabled'), 'renderer direct role change IPC is blocked');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-role-change-request',
  draft: 'PASSED',
  noApprovalNoChange: 'PASSED',
  permissionDiff: 'PASSED',
  riskClassification: 'PASSED',
  defaultDeny: 'PASSED',
  directRoleChange: 'BLOCKED'
}, null, 2));
