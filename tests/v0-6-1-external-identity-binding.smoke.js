const assert = require('assert');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

(async () => {
  const h = createV061AuthHarness('boc-v061-binding-');
  const safe = h.bindings.listSafeBindings();
  assert.strictEqual(safe.length, 2);
  assert.ok(!JSON.stringify(safe).includes('SUPA-USER-A'), 'raw provider user id is hidden from list');
  assert.throws(() => h.bindings.createBinding({ providerUserId: 'SUPA-USER-A', identityId: 'IDN-AUTH-B' }), /already has an active binding/);
  const migration = h.bindings.getMigrationStatus();
  assert.strictEqual(migration.applied, true);
  const activeA = safe.find((binding) => binding.identityId === 'IDN-AUTH-A');
  h.bindings.revokeBinding(activeA.bindingId, 'revoked binding test');
  await h.coordinator.initialize();
  const revokedLogin = await h.coordinator.signIn({ email: 'user-a@example.invalid', password: 'synthetic-password' });
  assert.strictEqual(revokedLogin.status.bindingStatus, 'AUTHENTICATED_UNBOUND');
  assert.strictEqual(revokedLogin.status.businessAccess, 'DENIED');
  assert.throws(() => h.bindings.createBinding({ providerUserId: 'SUPA-NEW', identityId: 'IDN-AUTH-A' }), /Active current identity session/);
  console.log(JSON.stringify({ ok: true, test: 'v0-6-1-external-identity-binding', uniqueActiveBinding: 'PASSED', safeList: 'PASSED', adminBootstrap: 'PASSED', revokedBinding: 'DENIED', unboundSelfBinding: 'BLOCKED' }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
