const assert = require('assert');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const now = new Date('2026-08-18T00:00:00.000Z');
const h = createV060IdentityHarness('boc-v060-session-', { clock: () => now });
const identity = h.identity.createIdentity({
  identityId: 'IDN-SESSION-001', identityType: 'EMPLOYEE', displayNameKo: '세션 테스트 사용자'
});
const active = h.session.createSession({
  identityId: identity.identityId,
  sessionId: 'SES-ACTIVE-001',
  expiresAt: '2026-08-19T00:00:00.000Z'
});
assert.strictEqual(h.session.validateSession(active.sessionId).valid, true);
assert.strictEqual(h.session.validateSession('SES-UNKNOWN').reasonCode, 'UNKNOWN_SESSION');

const expired = h.session.createSession({
  identityId: identity.identityId,
  sessionId: 'SES-EXPIRED-001',
  expiresAt: '2026-08-17T00:00:00.000Z'
});
assert.strictEqual(h.session.validateSession(expired.sessionId).reasonCode, 'SESSION_EXPIRED');
h.session.revokeSession(active.sessionId, 'TEST_REVOKE');
assert.strictEqual(h.session.validateSession(active.sessionId).reasonCode, 'SESSION_REVOKED');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-session-context',
  active: 'PASSED', expired: 'DENIED', revoked: 'DENIED', unknown: 'DENIED'
}, null, 2));
