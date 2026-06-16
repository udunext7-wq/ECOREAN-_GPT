'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release', 'RC-0.4.3');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_4_3.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const asarPath = path.join(root, 'electron', 'release', 'win-unpacked', 'resources', 'app.asar');
const distIndex = path.join(root, 'electron', 'dist', 'index.html');
const servicePath = path.join(root, 'electron', 'services', 'customerPortalDraftService.js');
const viewPath = path.join(root, 'ui', 'app', 'customer-portal', 'CustomerPortalDraftCenterView.tsx');
const clientPortalPath = path.join(root, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx');
const featureSmoke = path.join(root, 'tests', 'rc-0-4-3-customer-portal-draft.smoke.js');
const stabilizationSmoke = path.join(root, 'tests', 'rc-0-4-3-branch-stabilization.smoke.js');
const customerSafetySmoke = path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

const tagTarget = execFileSync('git', ['rev-list', '-n', '1', 'v0.4.3-rc'], {
  cwd: root,
  encoding: 'utf8'
}).trim();
assert.ok(tagTarget.startsWith('3a99fdf'), 'v0.4.3-rc points to source/document commit 3a99fdf');

[
  releaseDir, manifestPath, readmePath, reportPath, exePath, asarPath, distIndex,
  servicePath, viewPath, featureSmoke, stabilizationSmoke, customerSafetySmoke
].forEach((target) => assert.ok(fs.existsSync(target), `${target} exists`));
assert.ok(fs.statSync(exePath).size > 0, 'packaged executable is non-empty');
assert.ok(fs.statSync(asarPath).size > 0, 'app.asar is non-empty');

const asar = require(path.join(root, 'electron', 'node_modules', '@electron', 'asar'));
const packageFiles = asar.listPackage(asarPath);
const uiAsset = packageFiles.find((file) => /\\dist\\assets\\index-.*\.js$/i.test(file));
assert.ok(packageFiles.includes('\\services\\customerPortalDraftService.js'), 'app.asar includes customerPortalDraftService');
assert.ok(packageFiles.includes('\\main.js') && packageFiles.includes('\\preload.js'), 'app.asar includes Electron bridge');
assert.ok(uiAsset, 'app.asar includes production UI asset');

const serviceText = asar.extractFile(asarPath, 'services/customerPortalDraftService.js').toString('utf8');
const mainText = asar.extractFile(asarPath, 'main.js').toString('utf8');
const preloadText = asar.extractFile(asarPath, 'preload.js').toString('utf8');
const uiText = asar.extractFile(asarPath, uiAsset.replace(/^\\/, '')).toString('utf8');

[
  'customer_portal_drafts',
  'customer_portal_snapshots',
  'customer_portal_audit_history',
  'customer_portal_preview_sessions'
].forEach((tableName) => assert.ok(serviceText.includes(tableName), `packaged service includes ${tableName}`));
assert.ok(serviceText.includes('buildCustomerSafePortalPayload'), 'packaged service includes allowlist payload builder');
assert.ok(serviceText.includes('PUBLISH_BLOCKED'), 'packaged service includes publish block status');
assert.ok(serviceText.includes('INTERNAL_PREVIEW_ONLY'), 'packaged service keeps internal preview authentication status');
assert.ok(serviceText.includes('createHash'), 'packaged service includes SHA-256 token hashing support');
assert.ok(mainText.includes('customer-portal-draft'), 'packaged main includes customer portal draft IPC routes');
assert.ok(preloadText.includes('customer-portal-draft'), 'packaged preload includes customer portal draft bridge');
assert.ok(uiText.includes('고객 포털 내부 초안'), 'packaged UI includes Korean Draft Center label');
assert.ok(uiText.includes('customerPortalDraft'), 'packaged UI includes customerPortalDraft route key');
assert.ok(fs.existsSync(clientPortalPath), 'customer portal screen source exists');
const clientPortalSource = fs.readFileSync(clientPortalPath, 'utf8');
assert.ok(!clientPortalSource.includes('customerPortalDraft'), 'customer screen does not expose internal Draft Center route');

const featureOutput = execFileSync(process.execPath, [featureSmoke], { cwd: root, encoding: 'utf8' });
[
  '"customerSafety": "PASSED"',
  '"externalDelivery": "DISABLED"',
  '"authentication": "INTERNAL_PREVIEW_ONLY"',
  '"decision": "MERGE_READY"'
].forEach((value) => assert.ok(featureOutput.includes(value), `feature smoke verifies ${value}`));

const stabilizationOutput = execFileSync(process.execPath, [stabilizationSmoke], { cwd: root, encoding: 'utf8' });
[
  '"customerSafety": "PASSED"',
  '"externalDelivery": "DISABLED"',
  '"authentication": "INTERNAL_PREVIEW_ONLY"',
  '"publicPortalStatus": "NOT_AVAILABLE"',
  '"decision": "MERGE_READY"'
].forEach((value) => assert.ok(stabilizationOutput.includes(value), `stabilization verifies ${value}`));

const customerOutput = execFileSync(process.execPath, [customerSafetySmoke], { cwd: root, encoding: 'utf8' });
assert.ok(customerOutput.includes('"ok":true'), 'customer safety regression passes');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.4.3');
assert.strictEqual(manifest.tag, 'v0.4.3-rc');
assert.strictEqual(manifest.source_commit, '3a99fdf');
assert.strictEqual(manifest.merge_commit, 'b6c9500');
assert.strictEqual(manifest.implementation_commit, 'a345991');
assert.strictEqual(manifest.stabilization_commit, 'f22c5a6');
assert.strictEqual(manifest.smoke_correction_commit, 'f5be119');
assert.strictEqual(manifest.packaged_launch_status, 'PASSED');
assert.strictEqual(manifest.window_title_status, 'PASSED');
assert.strictEqual(manifest.responsiveness_status, 'PASSED');
assert.strictEqual(manifest.dev_server_required, false);
[
  'portal_draft_status',
  'allowlist_payload_status',
  'forbidden_field_exclusion_status',
  'document_filter_status',
  'progress_safety_status',
  'snapshot_revision_status',
  'audit_history_status',
  'review_workflow_status',
  'publish_block_status',
  'preview_session_status',
  'token_protection_status',
  'customer_safety_status',
  'customer_screen_isolation_status'
].forEach((field) => assert.strictEqual(manifest[field], 'PASSED', `manifest ${field} is PASSED`));
assert.strictEqual(manifest.external_public_portal_status, 'DISABLED');
assert.strictEqual(manifest.external_delivery_status, 'DISABLED');
assert.strictEqual(manifest.external_authentication_status, 'INTERNAL_PREVIEW_ONLY');
assert.ok(String(manifest.internal_entry_points_status).includes('PASSED'), 'manifest records internal entry points status');
assert.ok(String(manifest.visual_click_qa_status).includes('NOT_PERFORMED'), 'manifest distinguishes visual click QA status');
assert.ok(manifest.app_asar_size > 0, 'manifest records app.asar size');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.4.3 Desktop Release Package'), 'release notes include package section');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-3-packaged-release.smoke',
  tag: manifest.tag,
  sourceCommit: manifest.source_commit,
  mergeCommit: manifest.merge_commit,
  exePath,
  asarPath,
  asarSize: fs.statSync(asarPath).size,
  packagedLaunch: manifest.packaged_launch_status,
  portalDraft: manifest.portal_draft_status,
  allowlistPayload: manifest.allowlist_payload_status,
  publishBlock: manifest.publish_block_status,
  tokenProtection: manifest.token_protection_status,
  externalDelivery: manifest.external_delivery_status,
  customerSafety: manifest.customer_safety_status,
  visualClickQa: manifest.visual_click_qa_status,
  decision: 'RC-0.4.3 Desktop Release Package 사용 가능'
}, null, 2));
