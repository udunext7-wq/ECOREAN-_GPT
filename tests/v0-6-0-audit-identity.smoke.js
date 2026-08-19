const assert = require('assert');
const { DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID } = require('../electron/services/identityService');
const { DEFAULT_SESSION_ID } = require('../electron/services/sessionService');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-audit-');
const permission = h.roles.evaluateAuthorization({
  permissionKey: 'audit.view', resourceType: 'AUDIT', resourceId: 'IDENTITY-AUDIT'
});
assert.strictEqual(permission.allowed, true);
const event = h.audit.listEvents({ eventType: 'PERMISSION_ALLOWED', permissionKey: 'audit.view' })[0];
assert.strictEqual(event.actorIdentityId, DEFAULT_IDENTITY_ID);
assert.strictEqual(event.actorOrganizationId, DEFAULT_ORGANIZATION_ID);
assert.strictEqual(event.sessionId, DEFAULT_SESSION_ID);
const exported = h.auditExport.generatePermissionAuditExport({ format: 'JSON' });
assert.ok(exported.recordCount >= 1);
h.identity.updateIdentityStatus(DEFAULT_IDENTITY_ID, 'DISABLED');
assert.throws(() => h.auditExport.generatePermissionAuditExport({ format: 'JSON' }), /Permission denied|session/i);

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-audit-identity',
  actorIdentity: 'PASSED', actorOrganization: 'PASSED', sessionId: 'PASSED', disabledIdentityExport: 'BLOCKED'
}, null, 2));
