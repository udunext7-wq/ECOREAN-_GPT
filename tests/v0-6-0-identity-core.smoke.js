const assert = require('assert');
const { DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID } = require('../electron/services/identityService');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-identity-');
const local = h.identity.getIdentity(DEFAULT_IDENTITY_ID);
assert.ok(local, 'deterministic local identity exists');
assert.strictEqual(local.identityType, 'EMPLOYEE');
assert.strictEqual(local.status, 'ACTIVE');
assert.strictEqual(h.identity.getIdentitySummary().memberships[0].organizationId, DEFAULT_ORGANIZATION_ID);

const partner = h.identity.createIdentity({
  identityId: 'IDN-PARTNER-001', identityType: 'PARTNER', displayNameKo: '테스트 파트너'
});
assert.strictEqual(partner.providerKey, 'LOCAL');
h.identity.createOrganizationMembership({
  identityId: partner.identityId,
  organizationId: DEFAULT_ORGANIZATION_ID,
  membershipType: 'PARTNER'
});
const partnerSession = h.session.createSession({ identityId: partner.identityId, sessionId: 'SES-PARTNER-001' });
assert.strictEqual(h.session.validateSession(partnerSession.sessionId).valid, true);
h.identity.updateIdentityStatus(partner.identityId, 'DISABLED');
assert.strictEqual(h.session.getSession(partnerSession.sessionId).status, 'REVOKED', 'disabled identity revokes active sessions');
assert.throws(() => h.identity.createIdentity({ identityType: 'UNKNOWN', displayNameKo: 'invalid' }), /Unknown identity type/);

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-identity-core',
  identityTypes: 'PASSED',
  organizationMembership: 'PASSED',
  disabledIdentitySessionRevocation: 'PASSED'
}, null, 2));
