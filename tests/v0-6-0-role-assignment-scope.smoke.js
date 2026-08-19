const assert = require('assert');
const { DEFAULT_ORGANIZATION_ID } = require('../electron/services/identityService');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-scope-');
const identity = h.identity.createIdentity({
  identityId: 'IDN-PROJECT-STAFF', identityType: 'EMPLOYEE', displayNameKo: '프로젝트 담당자'
});
h.identity.createOrganizationMembership({ identityId: identity.identityId, organizationId: DEFAULT_ORGANIZATION_ID, membershipType: 'EMPLOYEE' });
const assignment = h.assignments.createRoleAssignment({
  assignmentId: 'RASN-PROJECT-001', identityId: identity.identityId, roleId: 'STAFF',
  scopeType: 'PROJECT', organizationId: DEFAULT_ORGANIZATION_ID, projectId: 'PROJECT_001'
});
const session = h.session.createSession({
  sessionId: 'SES-PROJECT-STAFF', identityId: identity.identityId, organizationId: DEFAULT_ORGANIZATION_ID
});

const allowed = h.roles.evaluateAuthorization({
  identityId: identity.identityId, sessionId: session.sessionId,
  organizationId: DEFAULT_ORGANIZATION_ID, projectId: 'PROJECT_001',
  permissionKey: 'project.edit', resourceType: 'PROJECT', resourceId: 'PROJECT_001'
});
assert.strictEqual(allowed.decision, 'ALLOW');
const otherProject = h.roles.evaluateAuthorization({
  identityId: identity.identityId, sessionId: session.sessionId,
  organizationId: DEFAULT_ORGANIZATION_ID, projectId: 'PROJECT_002',
  permissionKey: 'project.edit', resourceType: 'PROJECT', resourceId: 'PROJECT_002'
});
assert.strictEqual(otherProject.decision, 'DENY');
assert.strictEqual(otherProject.reasonCode, 'PROJECT_SCOPE_MISMATCH');
const otherOrg = h.roles.evaluateAuthorization({
  identityId: identity.identityId, sessionId: session.sessionId,
  organizationId: 'ORG-OTHER', projectId: 'PROJECT_001', permissionKey: 'project.edit'
});
assert.strictEqual(otherOrg.decision, 'DENY');
h.assignments.updateAssignmentStatus(assignment.assignmentId, 'REVOKED');
const revoked = h.roles.evaluateAuthorization({
  identityId: identity.identityId, sessionId: session.sessionId,
  organizationId: DEFAULT_ORGANIZATION_ID, projectId: 'PROJECT_001', permissionKey: 'project.edit'
});
assert.strictEqual(revoked.decision, 'DENY');
assert.strictEqual(revoked.reasonCode, 'ASSIGNMENT_REVOKED');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-role-assignment-scope',
  project001: 'ALLOW', project002: 'DENY', organizationMismatch: 'DENY', revokedAssignment: 'DENY'
}, null, 2));
