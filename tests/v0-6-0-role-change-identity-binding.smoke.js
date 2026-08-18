const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID } = require('../electron/services/identityService');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-role-change-');
const request = h.roleChanges.createRoleChangeRequest({
  requestedRole: 'MANAGER',
  reasonKo: 'Identity 결합 역할 변경 테스트'
});
assert.strictEqual(request.requestedByIdentityId, DEFAULT_IDENTITY_ID);
assert.strictEqual(request.targetIdentityId, DEFAULT_IDENTITY_ID);
assert.throws(() => h.roleChanges.approveRoleChangeRequest(request.requestId, {}), /Self-approval/);

const approver = h.identity.createIdentity({
  identityId: 'IDN-APPROVER-001', identityType: 'EMPLOYEE', displayNameKo: '테스트 승인자'
});
h.identity.createOrganizationMembership({ identityId: approver.identityId, organizationId: DEFAULT_ORGANIZATION_ID, membershipType: 'EMPLOYEE' });
h.assignments.createRoleAssignment({
  assignmentId: 'RASN-APPROVER-001', identityId: approver.identityId, roleId: 'ADMIN',
  scopeType: 'GLOBAL', organizationId: DEFAULT_ORGANIZATION_ID
});
h.session.createSession({ sessionId: 'SES-APPROVER-001', identityId: approver.identityId, organizationId: DEFAULT_ORGANIZATION_ID });
const approved = h.roleChanges.approveRoleChangeRequest(request.requestId, { noteKo: 'Identity 승인 완료' });
assert.strictEqual(approved.approvedByIdentityId, approver.identityId);
assert.strictEqual(approved.status, 'APPROVED');
const staffOperator = h.identity.createIdentity({
  identityId: 'IDN-STAFF-OPERATOR', identityType: 'EMPLOYEE', displayNameKo: '적용 권한 없음 사용자'
});
h.assignments.createRoleAssignment({
  assignmentId: 'RASN-STAFF-OPERATOR', identityId: staffOperator.identityId, roleId: 'STAFF',
  scopeType: 'GLOBAL', organizationId: DEFAULT_ORGANIZATION_ID
});
h.session.createSession({
  sessionId: 'SES-STAFF-OPERATOR', identityId: staffOperator.identityId, organizationId: DEFAULT_ORGANIZATION_ID
});
assert.throws(() => h.roleChanges.applyApprovedRoleChange(request.requestId, {}), /does not have role change apply permission/);
h.session.createSession({
  sessionId: 'SES-APPROVER-APPLY', identityId: approver.identityId, organizationId: DEFAULT_ORGANIZATION_ID
});
const applied = h.roleChanges.applyApprovedRoleChange(request.requestId, {});
assert.strictEqual(applied.appliedByIdentityId, approver.identityId);
assert.strictEqual(applied.status, 'APPLIED');
assert.strictEqual(h.assignments.listRoleAssignments(DEFAULT_IDENTITY_ID)[0].roleId, 'MANAGER');

const target = h.identity.createIdentity({
  identityId: 'IDN-TARGET-001', identityType: 'EMPLOYEE', displayNameKo: '다른 대상 사용자'
});
h.assignments.createRoleAssignment({
  assignmentId: 'RASN-TARGET-001', identityId: target.identityId, roleId: 'STAFF',
  scopeType: 'GLOBAL', organizationId: DEFAULT_ORGANIZATION_ID
});
h.session.createSession({
  sessionId: 'SES-REQUESTER-TARGET', identityId: DEFAULT_IDENTITY_ID, organizationId: DEFAULT_ORGANIZATION_ID
});
const targetRequest = h.roleChanges.createRoleChangeRequest({
  targetIdentityId: target.identityId,
  requestedRole: 'MANAGER',
  reasonKo: '다른 Identity 역할 변경 테스트'
});
h.session.createSession({
  sessionId: 'SES-APPROVER-TARGET', identityId: approver.identityId, organizationId: DEFAULT_ORGANIZATION_ID
});
h.roleChanges.approveRoleChangeRequest(targetRequest.requestId, {});
h.roleChanges.applyApprovedRoleChange(targetRequest.requestId, {});
assert.strictEqual(h.assignments.listRoleAssignments(target.identityId)[0].roleId, 'MANAGER');
assert.strictEqual(h.roles.getCurrentRole().roleId, 'MANAGER', 'other identity change does not alter legacy local role');

const requesterSession = h.session.createSession({
  sessionId: 'SES-REQUESTER-SECOND', identityId: DEFAULT_IDENTITY_ID, organizationId: DEFAULT_ORGANIZATION_ID
});
const second = h.roleChanges.createRoleChangeRequest({ requestedRole: 'STAFF', reasonKo: '비활성 승인자 차단 준비' });
h.identity.updateIdentityStatus(approver.identityId, 'DISABLED');
const database = new DatabaseSync(h.databasePath);
database.prepare(`
  UPDATE identity_runtime_state SET state_value = 'SES-APPROVER-001' WHERE state_key = 'CURRENT_SESSION_ID'
`).run();
database.close();
assert.throws(() => h.roleChanges.approveRoleChangeRequest(second.requestId, {}), /SESSION_REVOKED|IDENTITY_DISABLED/);
assert.strictEqual(h.session.validateSession(requesterSession.sessionId).valid, true);

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-role-change-identity-binding',
  immutableIdentityBinding: 'PASSED', selfApproval: 'BLOCKED', unauthorizedApply: 'BLOCKED',
  otherIdentityIsolation: 'PASSED', disabledApprover: 'BLOCKED', apply: 'PASSED'
}, null, 2));
