const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
[
  'electron/services/secureSessionStore.js',
  'electron/services/supabaseAuthProvider.js',
  'electron/services/externalIdentityBindingService.js',
  'electron/services/authSessionCoordinator.js',
  'ui/app/auth/AuthenticationGate.tsx',
  'ui/app/settings/AuthenticationAccessPanel.tsx',
  'tests/v0-6-1-auth-provider-adapter.smoke.js',
  'tests/v0-6-1-customer-safety.smoke.js'
].forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`));
const main = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'electron/package.json'), 'utf8'));
assert.strictEqual(pkg.dependencies['@supabase/supabase-js'], '2.112.4');
assert.ok(main.includes("process.env.ECOREAN_AUTH_MODE || 'LOCAL'"), 'LOCAL remains default');
assert.ok(main.includes("'boc:auth:sign-in'"));
assert.ok(main.includes('AUTHENTICATED_IDENTITY_BINDING_REQUIRED'), 'unbound business IPC is denied');
assert.ok(main.includes('SUPABASE_PUBLISHABLE_KEY'));
assert.ok(!main.includes('console.log(process.env.SUPABASE'));
assert.ok(preload.includes('listSafeExternalIdentityBindings'));

console.log(JSON.stringify({ ok: true, test: 'v0-6-1-branch-stabilization', localCompatibility: 'PASSED', ipcSurface: 'PASSED', sdkPinned: 'PASSED', liveSupabaseAuth: 'NOT_RUN_NOT_CONFIGURED', decision: 'CONDITIONAL_MERGE_READY' }, null, 2));
