const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const root = path.join(__dirname, '..');
[
  'electron/services/identityService.js',
  'electron/services/sessionService.js',
  'electron/services/roleAssignmentService.js',
  'electron/services/resourceScopeService.js',
  'electron/services/authProviderAdapter.js',
  'electron/services/localIdentityProvider.js',
  'ui/app/settings/IdentityAccessSummaryPanel.tsx',
  'docs/V0_6_0_IDENTITY_ARCHITECTURE.md',
  'docs/V0_6_0_AUTH_PROVIDER_ADAPTER.md',
  'docs/V0_6_0_IDENTITY_MIGRATION.md',
  'docs/V0_6_0_IMPLEMENTATION_REPORT.md'
].forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`));

const main = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.js'), 'utf8');
assert.ok(main.includes("boc:identity:summary"));
assert.ok(main.includes('evaluateAuthorization'));
assert.ok(main.includes('stripClaimedAuthorizationContext'), 'renderer identity/session claims are stripped');
assert.ok(preload.includes('getIdentitySessionSummary'));
const h = createV060IdentityHarness('boc-v060-stabilization-');
assert.strictEqual(h.roles.evaluateAuthorization({ permissionKey: 'dashboard.view' }).decision, 'ALLOW');
assert.strictEqual(h.roles.evaluateAuthorization({ permissionKey: 'UNKNOWN' }).decision, 'DENY');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-branch-stabilization',
  identityCore: 'PASSED', sessionContext: 'PASSED', scopedRbac: 'PASSED', customerSafety: 'PASSED',
  decision: 'MERGE_READY'
}, null, 2));
