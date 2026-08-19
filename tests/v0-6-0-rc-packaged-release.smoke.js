const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: false });
  assert.strictEqual(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

const manifest = readJson('release/V0.6.0-RC/RELEASE_MANIFEST.json');
const rcTarget = git(['rev-list', '-n', '1', 'v0.6.0-rc']);
const officialBaseTarget = git(['rev-list', '-n', '1', 'v0.5.2']);
const officialV060Local = git(['tag', '--list', 'v0.6.0']);
const officialV060Remote = git(['ls-remote', '--tags', 'origin', 'refs/tags/v0.6.0']);

assert.strictEqual(rcTarget, '0d25a066e027d2b0ec7fdb58a200a02212e4066d');
assert.strictEqual(manifest.rc_tag_target, rcTarget);
assert.strictEqual(officialBaseTarget, 'd301f0b87e1ad2122d2bb7fa56cfbaa324af58bb');
assert.strictEqual(officialV060Local, '');
assert.strictEqual(officialV060Remote, '');

[
  'release/V0.6.0-RC/RELEASE_MANIFEST.json',
  'release/V0.6.0-RC/README_RUN_V0_6_0_RC.md',
  'release/V0.6.0-RC/RC_PACKAGE_TEST_REPORT.md'
].forEach((relativePath) => assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `${relativePath} missing`));

assert.strictEqual(manifest.version, 'v0.6.0-rc');
assert.strictEqual(manifest.branch, 'main');
assert.strictEqual(manifest.official_base, 'v0.5.2');
assert.strictEqual(manifest.official_v0_5_2_target, officialBaseTarget);
assert.ok(fs.existsSync(manifest.executable_path));
assert.ok(fs.existsSync(manifest.asar_path));
assert.strictEqual(fs.statSync(manifest.executable_path).size, manifest.executable_size_bytes);
assert.strictEqual(fs.statSync(manifest.asar_path).size, manifest.asar_size_bytes);
assert.strictEqual(sha256(manifest.executable_path), manifest.executable_sha256);
assert.strictEqual(sha256(manifest.asar_path), manifest.asar_sha256);

assert.strictEqual(manifest.actual_launch.status, 'PASSED');
assert.strictEqual(manifest.actual_launch.runs, 2);
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard');
assert.strictEqual(manifest.actual_launch.dev_server_required, false);
assert.strictEqual(manifest.actual_launch.remaining_processes, 0);
assert.strictEqual(manifest.user_data.preservation, 'PASSED');
assert.deepStrictEqual(manifest.user_data.missing_pre_existing_files, []);

assert.strictEqual(manifest.migration.result, 'PASSED');
assert.strictEqual(manifest.migration.idempotency, 'PASSED');
assert.strictEqual(manifest.migration.default_identity_count, 1);
assert.strictEqual(manifest.migration.role_assignment_count, 1);
assert.strictEqual(manifest.migration.duplicate_identity, false);
assert.strictEqual(manifest.migration.duplicate_role_assignment, false);

const identity = manifest.identity_authentication;
['suspended_identity', 'disabled_identity', 'archived_identity', 'unknown_identity', 'missing_identity'].forEach((key) => assert.strictEqual(identity[key], 'DENY'));
['expired_session', 'revoked_session', 'invalid_session'].forEach((key) => assert.strictEqual(identity[key], 'DENY'));
['missing_role_assignment', 'revoked_role_assignment', 'expired_role_assignment'].forEach((key) => assert.strictEqual(identity[key], 'DENY'));
['organization_mismatch', 'project_mismatch', 'site_mismatch', 'missing_scope'].forEach((key) => assert.strictEqual(identity[key], 'DENY'));
assert.strictEqual(identity.authorization_fail_closed, 'PASSED');
assert.strictEqual(identity.authorization_exception, 'BLOCKED_NEVER_ALLOW');
assert.strictEqual(identity.auth_provider_adapter, 'PASSED');
assert.strictEqual(identity.local_identity_provider, 'PASSED');
assert.strictEqual(identity.external_provider, 'DISABLED');
assert.strictEqual(identity.oauth_oidc, 'NOT_IMPLEMENTED');
assert.strictEqual(identity.credential_or_token_storage, 'NONE');

const roleChange = manifest.role_change_identity;
assert.strictEqual(roleChange.identity_binding, 'PASSED');
['self_approval', 'unauthorized_approver', 'disabled_approver', 'expired_approver_assignment', 'scope_mismatch_approver', 'apply_before_approval'].forEach((key) => assert.strictEqual(roleChange[key], 'BLOCKED'));
assert.strictEqual(manifest.audit_identity.actor_identity, 'PASSED');
assert.strictEqual(manifest.audit_identity.redaction, 'PASSED');
assert.strictEqual(manifest.customer_safety.status, 'PASSED');

assert.strictEqual(manifest.packaged_ui.actual_identity_center_click, 'PASSED');
assert.strictEqual(manifest.packaged_ui.layout, 'PASSED');
assert.ok(manifest.packaged_ui.pixel_change_ratio >= 0.005);
assert.strictEqual(manifest.packaged_ui.capture_scope, 'APP_VIEWPORT_ONLY');
assert.strictEqual(manifest.packaged_ui.fixture_policy, 'ISOLATED_SYNTHETIC_USER_DATA');

const asarApi = require(path.join(ROOT, 'electron', 'node_modules', '@electron', 'asar'));
const entries = asarApi.listPackage(manifest.asar_path);
const requiredServices = [
  '\\services\\identityService.js', '\\services\\sessionService.js',
  '\\services\\roleAssignmentService.js', '\\services\\resourceScopeService.js',
  '\\services\\authProviderAdapter.js', '\\services\\localIdentityProvider.js'
];
requiredServices.forEach((entry) => assert.ok(entries.includes(entry), `app.asar missing ${entry}`));
const uiEntry = entries.find((entry) => /^\\dist\\assets\\index-.*\.js$/i.test(entry));
assert.ok(uiEntry, 'app.asar renderer bundle missing');
const uiSource = asarApi.extractFile(manifest.asar_path, uiEntry.slice(1)).toString('utf8');
['Identity Summary', 'Session / Identity Status', 'Role Assignment', '외부 인증은 비활성 상태입니다.'].forEach((marker) => assert.ok(uiSource.includes(marker), `packaged UI missing ${marker}`));

assert.deepStrictEqual(manifest.findings.P0, []);
assert.deepStrictEqual(manifest.findings.P1, []);
assert.deepStrictEqual(manifest.findings.P2, []);
assert.strictEqual(manifest.publication_state.official_v0_6_0_tag_created, false);
assert.strictEqual(manifest.publication_state.github_release_created, false);
assert.strictEqual(manifest.publication_state.github_release_check, 'release not found');
assert.strictEqual(manifest.publication_state.release_asset_uploaded, false);
assert.strictEqual(manifest.publication_state.rc_tag_moved, false);
assert.strictEqual(manifest.final_decision, 'v0.6.0 RC Desktop Package 검증 완료');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-rc-packaged-release',
  rcTarget,
  officialBaseTarget,
  exeSize: manifest.executable_size_bytes,
  exeSha256: manifest.executable_sha256,
  asarSize: manifest.asar_size_bytes,
  asarSha256: manifest.asar_sha256,
  actualLaunchRuns: manifest.actual_launch.runs,
  migration: manifest.migration.result,
  identityFailClosed: manifest.identity_authentication.authorization_fail_closed,
  packagedIdentityClick: manifest.packaged_ui.actual_identity_center_click,
  customerSafety: manifest.customer_safety.status,
  externalAuth: manifest.identity_authentication.external_provider,
  githubRelease: 'NOT_CREATED',
  finalDecision: manifest.final_decision
}, null, 2));
