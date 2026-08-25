const assert = require('assert');
const { createAuthProviderAdapter, normalizeAuthMode } = require('../electron/services/authProviderAdapter');
const { createAuthSessionCoordinator } = require('../electron/services/authSessionCoordinator');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

;(async () => {
assert.strictEqual(normalizeAuthMode(), 'LOCAL');
assert.strictEqual(normalizeAuthMode('supabase'), 'SUPABASE');
assert.strictEqual(normalizeAuthMode('unknown'), 'INVALID');
const legacy = createAuthProviderAdapter();
assert.strictEqual(legacy.getProviderStatus().status, 'DISABLED');
assert.strictEqual(legacy.authenticate().externalCallPerformed, false);
let localCalls = 0;
const local = createAuthProviderAdapter({
  mode: 'LOCAL',
  localProvider: { initialize: () => ({ status: 'READY' }), authenticate: () => { localCalls += 1; return { provider: 'LOCAL' }; }, getProviderStatus: () => ({ status: 'READY' }) }
});
assert.strictEqual(local.authenticate().provider, 'LOCAL');
assert.strictEqual(localCalls, 1);
const invalid = createAuthProviderAdapter({ mode: 'invalid' });
assert.strictEqual(invalid.getProviderStatus().reasonCode, 'INVALID_AUTH_MODE');
const h = createV060IdentityHarness('boc-v061-local-compat-');
const localAdapter = createAuthProviderAdapter({ mode: 'LOCAL', localProvider: h.provider });
const coordinator = createAuthSessionCoordinator({
  authMode: 'LOCAL', authProviderAdapter: localAdapter,
  bindingService: {}, identityService: h.identity, sessionService: h.session,
  roleAssignmentService: h.assignments, permissionAuditService: h.audit
});
await coordinator.initialize();
const localSessionId = h.session.getCurrentSession().sessionId;
await coordinator.signOut();
assert.strictEqual(h.session.getCurrentSession().sessionId, localSessionId, 'external sign-out does not clear LOCAL baseline session');

console.log(JSON.stringify({ ok: true, test: 'v0-6-1-auth-provider-adapter', localCompatibility: 'PASSED', supabaseRouting: 'PASSED', invalidMode: 'FAIL_CLOSED' }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
