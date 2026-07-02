const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false
  });
  assert.strictEqual(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const rcTarget = git(['rev-list', '-n', '1', 'v0.5.0-rc']);
const officialV046Target = git(['rev-list', '-n', '1', 'v0.4.6']);
const officialV050 = git(['tag', '--list', 'v0.5.0']);
const remoteOfficialV050 = git(['ls-remote', '--tags', 'origin', 'v0.5.0']);
const officialV050Target = officialV050 ? git(['rev-list', '-n', '1', 'v0.5.0']) : '';

assert.strictEqual(rcTarget, '2ed04851024b5b9a2e26195a78a2ceb53afd61cd', 'v0.5.0-rc target preserved');
assert.strictEqual(officialV046Target, 'f1c45d4a10bae5b269b2751ab030cec06df59a58', 'official v0.4.6 target preserved');
if (officialV050) {
  assert.strictEqual(officialV050Target, '2ae94a13ba7f3f42450684f33946bc4a1cd0604e', 'official v0.5.0 target preserved after release');
  assert.ok(remoteOfficialV050.includes('refs/tags/v0.5.0'), 'remote official v0.5.0 tag exists after release');
} else {
  assert.strictEqual(remoteOfficialV050, '', 'remote official v0.5.0 tag must not exist before official release');
}

assert.ok(exists('release/V0.5.0-RC'), 'release directory exists');
assert.ok(exists('release/V0.5.0-RC/RELEASE_MANIFEST.json'), 'manifest exists');
assert.ok(exists('release/V0.5.0-RC/README_RUN_V0_5_0_RC.md'), 'run guide exists');
assert.ok(exists('release/V0.5.0-RC/RC_PACKAGE_TEST_REPORT.md'), 'test report exists');

const manifest = readJson('release/V0.5.0-RC/RELEASE_MANIFEST.json');
const readme = read('release/V0.5.0-RC/README_RUN_V0_5_0_RC.md');
const report = read('release/V0.5.0-RC/RC_PACKAGE_TEST_REPORT.md');

assert.strictEqual(manifest.version, 'v0.5.0-rc');
assert.strictEqual(manifest.rc_tag, 'v0.5.0-rc');
assert.strictEqual(manifest.rc_tag_target, '2ed04851024b5b9a2e26195a78a2ceb53afd61cd');
assert.strictEqual(manifest.official_v0_5_0_tag_created, false);
assert.strictEqual(manifest.github_release_created, false);
assert.strictEqual(manifest.release_asset_uploaded, false);
assert.strictEqual(manifest.official_v0_4_6_tag_target, 'f1c45d4a10bae5b269b2751ab030cec06df59a58');

assert.ok(fs.existsSync(manifest.executable_path), 'packaged EXE exists');
assert.ok(fs.existsSync(manifest.asar_path), 'packaged app.asar exists');
assert.ok(manifest.executable_size_bytes > 0, 'historical v0.5.0 EXE size is recorded');
assert.ok(manifest.asar_size_bytes > 0, 'historical v0.5.0 app.asar size is recorded');
assert.ok(fs.statSync(manifest.executable_path).size > 0, 'current packaged EXE is non-empty');
assert.ok(fs.statSync(manifest.asar_path).size > 0, 'current packaged app.asar is non-empty');

assert.strictEqual(manifest.actual_launch.status, 'PASSED');
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard');
assert.strictEqual(manifest.actual_launch.dev_server_required, false);
assert.strictEqual(manifest.actual_launch.remaining_processes, 0);

assert.strictEqual(manifest.rbac_acceptance.role_matrix, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.permission_evaluator, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.default_deny, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.route_guard, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.menu_guard, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.output_guard, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.customer_data_guard, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.audit_redaction, 'PASSED');
assert.strictEqual(manifest.rbac_acceptance.external_auth_provider, 'DISABLED');

for (const role of ['CEO', 'ADMIN', 'MANAGER', 'STAFF', 'SITE_CREW', 'CLIENT_VIEWER', 'READ_ONLY_AUDITOR']) {
  assert.strictEqual(manifest.role_specific_results[role], 'PASSED', `${role} should pass`);
}

assert.strictEqual(manifest.customer_safety.status, 'PASSED');
assert.strictEqual(manifest.test_status.v0_5_0_smoke, 'PASSED');
assert.strictEqual(manifest.test_status.v0_4_6_regression, 'PASSED');
assert.strictEqual(manifest.test_status.build_ui, 'PASSED');
assert.strictEqual(manifest.test_status.smoke_prod, 'PASSED');
assert.strictEqual(manifest.test_status.smoke_release_diagnose, 'PASSED');
assert.strictEqual(manifest.test_status.smoke_release, 'PASSED');
assert.strictEqual(manifest.test_status.npm_dist, 'PASSED');
assert.deepStrictEqual(manifest.findings.P0, []);
assert.deepStrictEqual(manifest.findings.P1, []);
assert.deepStrictEqual(manifest.findings.P2, []);
assert.ok(manifest.deferred_items.length > 0, 'deferred items recorded');

for (const text of [readme, report]) {
  assert.ok(text.includes('v0.5.0-rc'), 'docs mention v0.5.0-rc');
  assert.ok(text.includes('Customer') || text.includes('고객'), 'docs mention customer safety');
  assert.ok(text.includes('DISABLED') || text.includes('비활성'), 'docs record external auth disabled');
}

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-rc-packaged-release.smoke',
  rcTarget,
  officialV046Target,
  officialV050: officialV050 || 'NOT_CREATED',
  officialV050Target: officialV050Target || 'NOT_CREATED',
  exeSize: manifest.executable_size_bytes,
  asarSize: manifest.asar_size_bytes,
  launch: manifest.actual_launch.status,
  roleMatrix: manifest.rbac_acceptance.role_matrix,
  customerSafety: manifest.customer_safety.status,
  finalDecision: manifest.final_decision
}, null, 2));
