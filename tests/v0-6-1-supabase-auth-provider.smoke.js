const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSecureSessionStore } = require('../electron/services/secureSessionStore');
const { createSupabaseAuthProvider } = require('../electron/services/supabaseAuthProvider');
const { createFakeSupabaseClientFactory } = require('./helpers/v061AuthHarness');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v061-secure-'));
  const storagePath = path.join(tmp, 'session.secure.json');
  const safeStorage = {
    isEncryptionAvailable: () => true,
    encryptString: (value) => Buffer.from(String(value).split('').reverse().join('')),
    decryptString: (value) => value.toString().split('').reverse().join('')
  };
  const storage = createSecureSessionStore({ safeStorage, storagePath });
  const fake = createFakeSupabaseClientFactory();
  const provider = createSupabaseAuthProvider({
    createClient: fake.factory,
    storage,
    config: { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_synthetic_test_only' }
  });
  assert.strictEqual(provider.validateConfiguration().valid, true);
  const result = await provider.authenticate({ email: 'user-a@example.invalid', password: 'synthetic-password' });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.principal.providerUserId, 'SUPA-USER-A');
  const persisted = fs.readFileSync(storagePath, 'utf8');
  assert.ok(!persisted.includes('ACCESS-SECRET'), 'access token is not stored in plaintext');
  assert.ok(!persisted.includes('REFRESH-SECRET'), 'refresh token is not stored in plaintext');
  assert.ok(!JSON.stringify(provider.getProviderStatus()).includes('user-a@example.invalid'));
  assert.strictEqual(provider.getProviderStatus().storage.persistence, 'OS_ENCRYPTED');
  const memoryPath = path.join(tmp, 'memory-only.json');
  const memoryOnly = createSecureSessionStore({ safeStorage: { isEncryptionAvailable: () => false }, storagePath: memoryPath });
  await memoryOnly.setItem('session', 'SYNTHETIC-MEMORY-TOKEN');
  assert.strictEqual(await memoryOnly.getItem('session'), 'SYNTHETIC-MEMORY-TOKEN');
  assert.strictEqual(memoryOnly.getStatus().persistence, 'MEMORY_ONLY');
  assert.strictEqual(fs.existsSync(memoryPath), false, 'memory fallback never writes plaintext');
  const forbidden = createSupabaseAuthProvider({
    createClient: fake.factory, storage,
    config: { url: 'https://synthetic.supabase.co', publishableKey: 'sb_secret_forbidden', forbiddenSecretsConfigured: true }
  });
  assert.strictEqual(forbidden.validateConfiguration().reasonCode, 'FORBIDDEN_SECRET_CONFIGURATION');
  const expired = createSupabaseAuthProvider({
    createClient: fake.factory, storage: createSecureSessionStore({ safeStorage, storagePath: path.join(tmp, 'expired.secure.json') }),
    config: { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_synthetic_test_only' },
    clock: () => new Date('2040-01-01T00:00:00.000Z')
  });
  const expiredResult = await expired.authenticate({ email: 'user-b@example.invalid', password: 'synthetic-password' });
  assert.strictEqual(expiredResult.ok, false);
  assert.strictEqual(expiredResult.error.code, 'PROVIDER_SESSION_EXPIRED');
  await provider.signOut();
  assert.strictEqual(await storage.getItem('sb-test-auth-token'), null);
  console.log(JSON.stringify({ ok: true, test: 'v0-6-1-supabase-auth-provider', passwordSignIn: 'PASSED', securePersistence: 'PASSED', expiredSession: 'DENIED', forbiddenSecrets: 'BLOCKED', signOut: 'PASSED' }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
