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

function gh(args) {
  return spawnSync('gh', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false
  });
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const rcTarget = git(['rev-list', '-n', '1', 'v0.5.1-rc']);
const officialV050Target = git(['rev-list', '-n', '1', 'v0.5.0']);
const officialV051Local = git(['tag', '--list', 'v0.5.1']);
const officialV051Remote = git(['ls-remote', '--tags', 'origin', 'refs/tags/v0.5.1']);
const manifest = readJson('release/V0.5.1-RC/RELEASE_MANIFEST.json');

assert.strictEqual(rcTarget, '12b7f37eae8a9bde2c8a8f91ff4c77c09a50bc51', 'v0.5.1-rc target preserved');
assert.strictEqual(manifest.rc_tag_target, rcTarget, 'manifest records v0.5.1-rc target');
assert.strictEqual(officialV050Target, '2ae94a13ba7f3f42450684f33946bc4a1cd0604e', 'official v0.5.0 preserved');
assert.strictEqual(officialV051Local, '', 'official v0.5.1 tag is not created locally');
assert.strictEqual(officialV051Remote, '', 'official v0.5.1 tag is not created remotely');

assert.ok(exists('release/V0.5.1-RC'), 'release directory exists');
assert.ok(exists('release/V0.5.1-RC/RELEASE_MANIFEST.json'), 'manifest exists');
assert.ok(exists('release/V0.5.1-RC/README_RUN_V0_5_1_RC.md'), 'run guide exists');
assert.ok(exists('release/V0.5.1-RC/RC_PACKAGE_TEST_REPORT.md'), 'test report exists');

assert.strictEqual(manifest.version, 'v0.5.1-rc');
assert.strictEqual(manifest.rc_tag, 'v0.5.1-rc');
assert.strictEqual(manifest.official_v0_5_0_tag_target, '2ae94a13ba7f3f42450684f33946bc4a1cd0604e');
assert.strictEqual(manifest.official_v0_5_1_tag_created, false);
assert.strictEqual(manifest.github_release_created, false);
assert.strictEqual(manifest.release_asset_uploaded, false);

assert.ok(fs.existsSync(manifest.executable_path), 'packaged EXE exists');
assert.ok(fs.existsSync(manifest.asar_path), 'packaged app.asar exists');
assert.strictEqual(fs.statSync(manifest.executable_path).size, manifest.executable_size_bytes, 'EXE size matches manifest');
assert.strictEqual(fs.statSync(manifest.asar_path).size, manifest.asar_size_bytes, 'app.asar size matches manifest');

assert.strictEqual(manifest.actual_launch.status, 'PASSED', 'packaged launch recorded');
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard', 'window title recorded');
assert.strictEqual(manifest.actual_launch.dev_server_required, false, 'dev server not required');
assert.strictEqual(manifest.actual_launch.remaining_processes, 0, 'no remaining process recorded');

assert.strictEqual(manifest.rbac_ux_acceptance.role_management_ux, 'PASSED', 'Role Management UX result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.permission_center_ux, 'PASSED', 'Permission Center UX result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.permission_audit_viewer, 'PASSED', 'Permission Audit Viewer result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.access_denied_reason, 'PASSED', 'Access Denied Reason result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.visibility_preview, 'PASSED', 'Visibility Preview result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.audit_redaction, 'PASSED', 'Audit redaction result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.customer_safety, 'PASSED', 'Customer safety result recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.external_auth_provider, 'DISABLED', 'external auth/provider disabled recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.v0_5_0_rbac_regression, 'PASSED', 'v0.5.0 RBAC regression recorded');
assert.strictEqual(manifest.rbac_ux_acceptance.overdue_crm_reminder_duplicate_prevention, 'PASSED', 'OVERDUE CRM duplicate prevention recorded');

assert.deepStrictEqual(manifest.findings.P0, [], 'P0 none recorded');
assert.deepStrictEqual(manifest.findings.P1, [], 'P1 none recorded');
assert.deepStrictEqual(manifest.findings.P2, [], 'P2 none recorded');
assert.ok(manifest.findings.P3.length >= 1, 'P3/deferred findings recorded');
assert.ok(manifest.deferred_items.length >= 1, 'deferred items recorded');
assert.strictEqual(manifest.final_decision, 'v0.5.1 RC Desktop Package 검증 완료');

const readme = read('release/V0.5.1-RC/README_RUN_V0_5_1_RC.md');
const report = read('release/V0.5.1-RC/RC_PACKAGE_TEST_REPORT.md');
['Role Management UX', 'Permission Audit Viewer', 'Access Denied', 'Visibility Preview', 'Customer'].forEach((term) => {
  assert.ok(readme.includes(term) || readme.includes('고객'), `README mentions ${term}`);
  assert.ok(report.includes(term) || report.includes('고객'), `report mentions ${term}`);
});

const releaseView = gh(['release', 'view', 'v0.5.1']);
assert.notStrictEqual(releaseView.status, 0, 'GitHub Release v0.5.1 is not created');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-1-rc-packaged-release',
  rcTarget,
  officialV050Target,
  exeSize: manifest.executable_size_bytes,
  asarSize: manifest.asar_size_bytes,
  launch: manifest.actual_launch.status,
  roleManagementUx: manifest.rbac_ux_acceptance.role_management_ux,
  permissionAuditViewer: manifest.rbac_ux_acceptance.permission_audit_viewer,
  customerSafety: manifest.rbac_ux_acceptance.customer_safety,
  finalDecision: manifest.final_decision
}, null, 2));
