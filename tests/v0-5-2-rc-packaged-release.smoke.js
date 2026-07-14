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
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex').toUpperCase();
}

const manifest = readJson('release/V0.5.2-RC/RELEASE_MANIFEST.json');
const rcTarget = git(['rev-list', '-n', '1', 'v0.5.2-rc']);
const officialV051Target = git(['rev-list', '-n', '1', 'v0.5.1']);
const officialV052Local = git(['tag', '--list', 'v0.5.2']);
const officialV052Remote = git(['ls-remote', '--tags', 'origin', 'refs/tags/v0.5.2']);

assert.strictEqual(rcTarget, '6271159b021e3c4a179ec4cb0e0a582e95480b64', 'v0.5.2-rc target must be preserved');
assert.strictEqual(manifest.rc_tag_target, rcTarget, 'manifest records the RC target');
assert.strictEqual(officialV051Target, '4961573340280cc19a749d01e05359e97d700d1d', 'official v0.5.1 must be preserved');
assert.strictEqual(officialV052Local, '', 'official v0.5.2 tag must not exist locally');
assert.strictEqual(officialV052Remote, '', 'official v0.5.2 tag must not exist remotely');

[
  'release/V0.5.2-RC/RELEASE_MANIFEST.json',
  'release/V0.5.2-RC/README_RUN_V0_5_2_RC.md',
  'release/V0.5.2-RC/RC_PACKAGE_TEST_REPORT.md'
].forEach((relativePath) => assert.ok(fs.existsSync(path.join(ROOT, relativePath)), `${relativePath} must exist`));

assert.strictEqual(manifest.version, 'v0.5.2-rc');
assert.strictEqual(manifest.branch, 'main');
assert.strictEqual(manifest.base_official_version, 'v0.5.1');
assert.strictEqual(manifest.official_v0_5_1_tag_target, officialV051Target);
assert.ok(fs.existsSync(manifest.executable_path), 'packaged EXE must exist');
assert.ok(fs.existsSync(manifest.asar_path), 'packaged app.asar must exist');
assert.strictEqual(fs.statSync(manifest.executable_path).size, manifest.executable_size_bytes, 'EXE size matches');
assert.strictEqual(fs.statSync(manifest.asar_path).size, manifest.asar_size_bytes, 'app.asar size matches');
assert.strictEqual(sha256(manifest.executable_path), manifest.executable_sha256, 'EXE hash matches');
assert.strictEqual(sha256(manifest.asar_path), manifest.asar_sha256, 'app.asar hash matches');

assert.strictEqual(manifest.actual_launch.status, 'PASSED');
assert.strictEqual(manifest.actual_launch.runs, 2);
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard');
assert.strictEqual(manifest.actual_launch.dev_server_required, false);
assert.strictEqual(manifest.actual_launch.restart_persistence, 'PASSED');
assert.deepStrictEqual(manifest.actual_launch.missing_pre_existing_files, []);
assert.strictEqual(manifest.actual_launch.remaining_processes, 0);

assert.strictEqual(manifest.packaged_feature_verification.actual_packaged_click, 'PASSED');
assert.strictEqual(manifest.packaged_feature_verification.role_request_ui, 'PASSED');
assert.strictEqual(manifest.packaged_feature_verification.approval_queue_ui, 'PASSED');
assert.strictEqual(manifest.packaged_feature_verification.audit_export_ui, 'PASSED');
assert.strictEqual(manifest.packaged_feature_verification.layout, 'PASSED');
assert.ok(manifest.packaged_feature_verification.pixel_change_ratio >= 0.005);

const expectedStates = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'APPLIED', 'FAILED'];
assert.deepStrictEqual(manifest.role_change_workflow.states, expectedStates);
[
  'request_creation',
  'request_reason',
  'current_and_requested_role',
  'state_transitions',
  'approval_and_apply_separation',
  'self_approval_prevention',
  'approver_permission_validation',
  'permission_diff',
  'risk_classification',
  'approve_reject_cancel_expire',
  'apply_after_approval',
  'failure_rollback',
  'role_change_failed_audit',
  'duplicate_and_replay_prevention'
].forEach((key) => assert.strictEqual(manifest.role_change_workflow[key], 'PASSED', `${key} must pass`));
assert.strictEqual(manifest.role_change_workflow.unknown_or_missing_role, 'BLOCKED');
assert.strictEqual(manifest.role_change_workflow.rejected_cancelled_expired_apply, 'BLOCKED');
assert.strictEqual(manifest.role_change_workflow.external_auth_provider, 'DISABLED');

assert.deepStrictEqual(manifest.audit_export.formats, ['JSON', 'CSV', 'HTML']);
assert.deepStrictEqual(manifest.audit_export.filters, [
  'date_range', 'event_type', 'actor_role', 'target_role',
  'request_status', 'risk_level', 'decision'
]);
assert.strictEqual(manifest.audit_export.filter_result, 'PASSED');
assert.strictEqual(manifest.audit_export.redaction, 'PASSED');
assert.strictEqual(manifest.audit_export.audit_export_generated_event, 'PASSED');
assert.strictEqual(manifest.customer_safety.status, 'PASSED');
assert.strictEqual(manifest.customer_safety.audit_redaction, 'PASSED');

const asarApi = require(path.join(ROOT, 'electron', 'node_modules', '@electron', 'asar'));
const roleSource = asarApi.extractFile(manifest.asar_path, 'services\\roleChangeApprovalService.js').toString('utf8');
const exportSource = asarApi.extractFile(manifest.asar_path, 'services\\permissionAuditExportService.js').toString('utf8');
const uiEntry = asarApi.listPackage(manifest.asar_path)
  .find((entry) => /^\\dist\\assets\\index-.*\.js$/i.test(entry));
assert.ok(uiEntry, 'packaged renderer bundle must exist');
const uiSource = asarApi.extractFile(manifest.asar_path, uiEntry.slice(1)).toString('utf8');
expectedStates.forEach((state) => assert.ok(roleSource.includes(state), `app.asar role service includes ${state}`));
assert.ok(roleSource.includes('Self-approval is not allowed.'), 'app.asar blocks self approval');
assert.ok(roleSource.includes('Approver does not have role change approval permission.'), 'app.asar validates approver');
assert.ok(roleSource.includes('ROLE_CHANGE_FAILED'), 'app.asar records failed apply');
['JSON', 'CSV', 'HTML', 'AUDIT_EXPORT_GENERATED'].forEach((marker) => {
  assert.ok(exportSource.includes(marker), `app.asar audit export includes ${marker}`);
});
['역할 변경 요청', '역할 변경 승인 Queue', '승인 역할 적용', '권한 감사 내보내기'].forEach((marker) => {
  assert.ok(uiSource.includes(marker), `app.asar renderer includes ${marker}`);
});

assert.deepStrictEqual(manifest.findings.P0, []);
assert.deepStrictEqual(manifest.findings.P1, []);
assert.deepStrictEqual(manifest.findings.P2, []);
assert.ok(manifest.findings.P3.length >= 1);
assert.strictEqual(manifest.publication_state.official_v0_5_2_tag_created, false);
assert.strictEqual(manifest.publication_state.github_release_created, false);
assert.strictEqual(manifest.publication_state.github_release_check, 'release not found');
assert.strictEqual(manifest.publication_state.release_asset_uploaded, false);
assert.strictEqual(manifest.final_decision, 'v0.5.2 RC Desktop Package 검증 완료');

const readme = read('release/V0.5.2-RC/README_RUN_V0_5_2_RC.md');
const report = read('release/V0.5.2-RC/RC_PACKAGE_TEST_REPORT.md');
['역할 변경 요청', '자기 승인', '권한 감사 내보내기', 'Customer safety'].forEach((term) => {
  assert.ok(readme.includes(term) || readme.includes('고객 안전성'), `README includes ${term}`);
  assert.ok(report.includes(term) || report.includes('Customer Safety'), `report includes ${term}`);
});

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-rc-packaged-release',
  rcTarget,
  officialV051Target,
  exeSize: manifest.executable_size_bytes,
  exeSha256: manifest.executable_sha256,
  asarSize: manifest.asar_size_bytes,
  asarSha256: manifest.asar_sha256,
  actualLaunch: manifest.actual_launch.status,
  packagedClick: manifest.packaged_feature_verification.actual_packaged_click,
  roleWorkflow: manifest.role_change_workflow.state_transitions,
  auditExport: manifest.audit_export.status,
  customerSafety: manifest.customer_safety.status,
  githubRelease: 'NOT_CREATED',
  finalDecision: manifest.final_decision
}, null, 2));
