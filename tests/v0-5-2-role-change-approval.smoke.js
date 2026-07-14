const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');
const { createRoleChangeApprovalService } = require('../electron/services/roleChangeApprovalService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v052-role-approval-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const roles = createRolePermissionService({ databasePath, auditService: audit });
const service = createRoleChangeApprovalService({ databasePath, auditService: audit, rolePermissionService: roles });

function createPending(requestId, requestedRole, requesterId = 'REQUESTER-1', expiresAt) {
  return service.createRoleChangeRequest({
    requestId,
    requesterId,
    requesterRole: roles.getCurrentRole().roleId,
    targetUserId: 'USER-LOCAL-RBAC',
    currentRole: roles.getCurrentRole().roleId,
    requestedRole,
    reasonKo: `${requestedRole} 역할 요청`,
    expiresAt
  });
}

const request = createPending('RCR-APPROVE', 'MANAGER');
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'request does not apply role');
assert.throws(() => service.approveRoleChangeRequest(request.requestId, {
  approverId: 'REQUESTER-1', approverRole: 'CEO'
}), /Self-approval/, 'self approval is blocked');
assert.throws(() => service.approveRoleChangeRequest(request.requestId, {
  approverId: 'STAFF-APPROVER', approverRole: 'STAFF'
}), /does not have/, 'approver without settings permission is blocked');

const approved = service.approveRoleChangeRequest(request.requestId, {
  approverId: 'ADMIN-APPROVER', approverRole: 'ADMIN', noteKo: '권한 검토 완료'
});
assert.strictEqual(approved.status, 'APPROVED', 'authorized approver can approve');
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'approval alone does not apply role');
const applied = service.applyApprovedRoleChange(request.requestId, {
  actorId: 'ADMIN-APPROVER', actorRole: 'ADMIN'
});
assert.strictEqual(applied.status, 'APPLIED', 'approved request can apply');
assert.strictEqual(roles.getCurrentRole().roleId, 'MANAGER', 'role changes only after apply');
assert.throws(() => service.approveRoleChangeRequest(request.requestId, {
  approverId: 'SECOND-APPROVER', approverRole: 'CEO'
}), /Only PENDING/, 'completed request cannot be approved again');

roles.setActiveRole('CEO', { actor: 'TEST_SETUP', reasonKo: 'rejection fixture reset' });
const rejectedRequest = createPending('RCR-REJECT', 'STAFF', 'REQUESTER-2');
const rejected = service.rejectRoleChangeRequest(rejectedRequest.requestId, {
  approverId: 'ADMIN-APPROVER', approverRole: 'ADMIN', reasonKo: '업무 범위 불일치'
});
assert.strictEqual(rejected.status, 'REJECTED');
assert.throws(() => service.applyApprovedRoleChange(rejected.requestId, {
  actorId: 'ADMIN-APPROVER', actorRole: 'ADMIN'
}), /Only APPROVED/, 'rejected request cannot apply');

const cancelledRequest = createPending('RCR-CANCEL', 'STAFF', 'REQUESTER-3');
const cancelled = service.cancelRoleChangeRequest(cancelledRequest.requestId, {
  actorId: 'REQUESTER-3', actorRole: 'CEO', reasonKo: '요청 철회'
});
assert.strictEqual(cancelled.status, 'CANCELLED');
assert.throws(() => service.applyApprovedRoleChange(cancelled.requestId, {
  actorId: 'ADMIN-APPROVER', actorRole: 'ADMIN'
}), /Only APPROVED/, 'cancelled request cannot apply');

const expiredRequest = createPending('RCR-EXPIRED', 'STAFF', 'REQUESTER-4', '2000-01-01T00:00:00.000Z');
assert.throws(() => service.approveRoleChangeRequest(expiredRequest.requestId, {
  approverId: 'ADMIN-APPROVER', approverRole: 'ADMIN'
}), /Expired/, 'expired request cannot approve');
assert.strictEqual(service.getRoleChangeRequest(expiredRequest.requestId).status, 'EXPIRED');

const failedRequest = createPending('RCR-FAILED', 'MANAGER', 'REQUESTER-5');
service.approveRoleChangeRequest(failedRequest.requestId, {
  approverId: 'ADMIN-APPROVER', approverRole: 'ADMIN'
});
const failed = service.applyApprovedRoleChange(failedRequest.requestId, {
  actorId: 'ADMIN-APPROVER', actorRole: 'ADMIN', simulateFailure: true
});
assert.strictEqual(failed.status, 'FAILED', 'apply failure is recorded');
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'apply failure preserves existing role');

['ROLE_CHANGE_APPROVED', 'ROLE_CHANGE_REJECTED', 'ROLE_CHANGE_CANCELLED', 'ROLE_CHANGE_EXPIRED', 'ROLE_CHANGE_APPLIED', 'ROLE_CHANGE_FAILED']
  .forEach((eventType) => assert.ok(audit.listEvents({ eventType }).length >= 1, `${eventType} audit exists`));

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-role-change-approval',
  approvalPolicy: 'PASSED',
  selfApproval: 'BLOCKED',
  approveRejectCancelExpire: 'PASSED',
  applyAfterApproval: 'PASSED',
  failureRollback: 'PASSED',
  duplicateProcessing: 'BLOCKED'
}, null, 2));
