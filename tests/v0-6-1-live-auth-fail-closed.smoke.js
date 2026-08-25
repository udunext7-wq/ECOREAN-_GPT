const assert = require('assert');
const { createV061AuthHarness, createMemoryStorage } = require('./helpers/v061AuthHarness');
const { createSupabaseAuthProvider } = require('../electron/services/supabaseAuthProvider');

const REQUIRED_LIVE_CONFIG = ['ECOREAN_AUTH_MODE', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'];

function liveConfigurationStatus() {
  return REQUIRED_LIVE_CONFIG.every((name) => Boolean(String(process.env[name] || '').trim()))
    ? 'CONFIGURED'
    : 'NOT_CONFIGURED';
}

(async () => {
  const secretMarker = 'SYNTHETIC_RUNTIME_SECRET_MUST_NOT_LEAK';

  const refresh = createV061AuthHarness('boc-v061-refresh-');
  await refresh.coordinator.initialize();
  const refreshSignIn = await refresh.coordinator.signIn({
    email: 'user-a@example.invalid',
    password: 'synthetic-password'
  });
  assert.strictEqual(refreshSignIn.ok, true);
  const sessionBeforeRefresh = refresh.session.getCurrentSession();
  const refreshResult = await refresh.adapter.refreshSession();
  assert.strictEqual(refreshResult.ok, true);
  await new Promise((resolve) => setImmediate(resolve));
  const sessionAfterRefresh = refresh.session.getCurrentSession();
  assert.strictEqual(sessionAfterRefresh.identityId, 'IDN-AUTH-A');
  assert.notStrictEqual(sessionAfterRefresh.sessionId, sessionBeforeRefresh.sessionId);
  assert.ok(new Date(sessionAfterRefresh.expiresAt) > new Date(sessionBeforeRefresh.expiresAt));
  assert.strictEqual(refresh.roles.evaluateAuthorization({ permissionKey: 'project.edit' }).decision, 'ALLOW');
  assert.ok(!JSON.stringify(refreshResult).includes('REFRESH-SECRET'));

  const network = createV061AuthHarness('boc-v061-network-failure-');
  await network.coordinator.initialize();
  network.adapter.authenticate = async () => {
    throw Object.assign(new Error(secretMarker), { code: 'ECONNRESET' });
  };
  const networkResult = await network.coordinator.signIn({
    email: 'synthetic-user@example.invalid',
    password: secretMarker
  });
  assert.strictEqual(networkResult.ok, false);
  assert.strictEqual(networkResult.status.businessAccess, 'DENIED');
  assert.strictEqual(network.session.getCurrentSession(), null);
  assert.ok(!JSON.stringify(networkResult).includes(secretMarker));

  const restore = createV061AuthHarness('boc-v061-restore-exception-');
  await restore.coordinator.initialize();
  restore.adapter.restoreSession = async () => {
    throw Object.assign(new Error(secretMarker), { code: 'PROVIDER_RESTORE_EXCEPTION' });
  };
  const restoreResult = await restore.coordinator.restoreSession();
  assert.strictEqual(restoreResult.ok, false);
  assert.strictEqual(restoreResult.status.businessAccess, 'DENIED');
  assert.ok(!JSON.stringify(restoreResult).includes(secretMarker));

  const initializationProvider = createSupabaseAuthProvider({
    createClient() {
      throw Object.assign(new Error(secretMarker), { code: 'PROVIDER_FACTORY_EXCEPTION' });
    },
    storage: createMemoryStorage(),
    config: {
      url: 'https://synthetic.supabase.co',
      publishableKey: 'sb_publishable_synthetic_test_only'
    }
  });
  const initializationStatus = await initializationProvider.initialize();
  assert.strictEqual(initializationStatus.status, 'ERROR');
  assert.strictEqual(initializationStatus.authenticationStatus, 'SIGNED_OUT');
  assert.ok(!JSON.stringify(initializationStatus).includes(secretMarker));

  const signOut = createV061AuthHarness('boc-v061-signout-exception-');
  await signOut.coordinator.initialize();
  const signedIn = await signOut.coordinator.signIn({
    email: 'user-a@example.invalid',
    password: 'synthetic-password'
  });
  assert.strictEqual(signedIn.ok, true);
  signOut.adapter.signOut = async () => {
    throw Object.assign(new Error(secretMarker), { code: 'PROVIDER_SIGNOUT_EXCEPTION' });
  };
  const signOutResult = await signOut.coordinator.signOut();
  assert.strictEqual(signOutResult.businessAccess, 'DENIED');
  assert.strictEqual(signOut.session.getCurrentSession(), null);
  assert.ok(!JSON.stringify(signOutResult).includes(secretMarker));

  const configured = liveConfigurationStatus();
  console.log(JSON.stringify({
    ok: true,
    test: 'v0-6-1-live-auth-fail-closed',
    qaConfiguration: configured,
    liveSupabaseAuth: configured === 'CONFIGURED' ? 'NOT_RUN_MISSING_SYNTHETIC_USER_INPUTS' : 'NOT_RUN_NOT_CONFIGURED',
    tokenRefreshContextReevaluation: 'PASSED_SYNTHETIC',
    networkFailureFailClosed: 'PASSED_SYNTHETIC',
    providerExceptionFailClosed: 'PASSED_SYNTHETIC',
    sessionRestoreExceptionFailClosed: 'PASSED_SYNTHETIC',
    signOutLocalCleanupOnProviderFailure: 'PASSED_SYNTHETIC',
    secretMarkerLeak: 'ABSENT'
  }, null, 2));
})().catch((error) => {
  console.error(error?.code || error?.name || 'QA_FAILURE');
  process.exit(1);
});
