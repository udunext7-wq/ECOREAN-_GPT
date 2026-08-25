const assert = require('assert');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

(async () => {
  const h = createV061AuthHarness('boc-v061-switch-');
  await h.coordinator.initialize();
  await h.coordinator.signIn({ email: 'user-a@example.invalid', password: 'synthetic-password' });
  const sessionA = h.session.getCurrentSession();
  assert.strictEqual(h.roles.evaluateAuthorization({ permissionKey: 'system.settings.edit' }).decision, 'DENY');
  await h.coordinator.signIn({ email: 'user-b@example.invalid', password: 'synthetic-password' });
  const sessionB = h.session.getCurrentSession();
  assert.strictEqual(sessionB.identityId, 'IDN-AUTH-B');
  assert.notStrictEqual(sessionA.sessionId, sessionB.sessionId);
  assert.strictEqual(h.session.getSession(sessionA.sessionId).status, 'REVOKED');
  assert.strictEqual(h.roles.evaluateAuthorization({ permissionKey: 'system.settings.edit' }).decision, 'ALLOW');
  const safeStatus = JSON.stringify(h.coordinator.getStatus()).toLowerCase();
  assert.ok(!safeStatus.includes('access-secret'));
  assert.ok(!safeStatus.includes('refresh-secret'));
  assert.ok(!safeStatus.includes('customer_'));
  assert.ok(!safeStatus.includes('internal_cost'));
  console.log(JSON.stringify({ ok: true, test: 'v0-6-1-multi-user-switch', previousSessionRevoked: 'PASSED', previousSessionReferenceLeak: 'ABSENT', identityIsolation: 'PASSED', roleReevaluation: 'PASSED', customerInternalCacheLeak: 'ABSENT' }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
