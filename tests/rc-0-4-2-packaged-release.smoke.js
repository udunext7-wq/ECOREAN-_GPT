'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const releaseDir = path.join(root, 'release', 'RC-0.4.2');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_4_2.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const asarPath = path.join(root, 'electron', 'release', 'win-unpacked', 'resources', 'app.asar');
const distIndex = path.join(root, 'electron', 'dist', 'index.html');
const servicePath = path.join(root, 'electron', 'services', 'addressNormalizationService.js');
const adapterPath = path.join(root, 'electron', 'services', 'addressProviderAdapter.js');
const viewPath = path.join(root, 'ui', 'app', 'crm', 'AddressNormalizationCenterView.tsx');
const implementationSmoke = path.join(root, 'tests', 'rc-0-4-2-address-normalization.smoke.js');
const stabilizationSmoke = path.join(root, 'tests', 'rc-0-4-2-branch-stabilization.smoke.js');
const customerSafetySmoke = path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

const tagTarget = execFileSync('git', ['rev-list', '-n', '1', 'v0.4.2-rc'], {
  cwd: root,
  encoding: 'utf8'
}).trim();
assert.ok(tagTarget.startsWith('8dfd5ef'), 'v0.4.2-rc points to source/document commit 8dfd5ef');

[
  releaseDir, manifestPath, readmePath, reportPath, exePath, asarPath, distIndex,
  servicePath, adapterPath, viewPath, implementationSmoke, stabilizationSmoke, customerSafetySmoke
].forEach((target) => assert.ok(fs.existsSync(target), `${target} exists`));
assert.ok(fs.statSync(exePath).size > 0, 'packaged executable is non-empty');
assert.ok(fs.statSync(asarPath).size > 0, 'app.asar is non-empty');

const asar = require(path.join(root, 'electron', 'node_modules', '@electron', 'asar'));
const packageFiles = asar.listPackage(asarPath);
const uiAsset = packageFiles.find((file) => /\\dist\\assets\\index-.*\.js$/i.test(file));
assert.ok(packageFiles.includes('\\services\\addressNormalizationService.js'), 'app.asar includes addressNormalizationService');
assert.ok(packageFiles.includes('\\services\\addressProviderAdapter.js'), 'app.asar includes addressProviderAdapter');
assert.ok(packageFiles.includes('\\main.js') && packageFiles.includes('\\preload.js'), 'app.asar includes Electron bridge');
assert.ok(uiAsset, 'app.asar includes production UI asset');
const mainText = asar.extractFile(asarPath, 'main.js').toString('utf8');
const preloadText = asar.extractFile(asarPath, 'preload.js').toString('utf8');
const uiText = asar.extractFile(asarPath, uiAsset.replace(/^\\/, '')).toString('utf8');
assert.ok(mainText.includes('address-normalization'), 'packaged main includes address IPC routes');
assert.ok(preloadText.includes('address-normalization'), 'packaged preload includes address IPC routes');
assert.ok(uiText.includes('주소 정규화 센터'), 'packaged UI includes Korean center label');
assert.ok(uiText.includes('addressNormalization'), 'packaged UI includes address route key');

const implementationOutput = execFileSync(process.execPath, [implementationSmoke], { cwd: root, encoding: 'utf8' });
assert.ok(implementationOutput.includes('address normalization smoke tests passed'), 'implementation smoke passes');
const stabilizationOutput = execFileSync(process.execPath, [stabilizationSmoke], { cwd: root, encoding: 'utf8' });
[
  '"originalProtection": "PASSED"',
  '"duplicateWarning": "PASSED"',
  '"automaticMergeDelete": "ABSENT"',
  '"provider": "DISABLED"',
  '"externalCall": false',
  '"customerSafety": "PASSED"',
  '"decision": "MERGE_READY"'
].forEach((value) => assert.ok(stabilizationOutput.includes(value), `stabilization verifies ${value}`));
const customerOutput = execFileSync(process.execPath, [customerSafetySmoke], { cwd: root, encoding: 'utf8' });
assert.ok(customerOutput.includes('"ok":true'), 'customer safety regression passes');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.4.2');
assert.strictEqual(manifest.tag, 'v0.4.2-rc');
assert.strictEqual(manifest.source_commit, '8dfd5ef');
assert.strictEqual(manifest.merge_commit, 'cb41933');
assert.strictEqual(manifest.packaged_launch_status, 'PASSED');
assert.strictEqual(manifest.dev_server_required, false);
[
  'address_normalization_status', 'address_type_status', 'confidence_status',
  'original_address_protection_status', 'approval_workflow_status', 'history_status',
  'duplicate_detection_status', 'automatic_merge_delete_guard_status', 'entity_linkage_status',
  'customer_safety_status', 'edge_case_status', 'app_asar_status'
].forEach((field) => assert.strictEqual(manifest[field], 'PASSED', `manifest ${field} is PASSED`));
assert.strictEqual(manifest.provider_adapter_status, 'DISABLED');
assert.strictEqual(manifest.external_api_status, 'DISABLED');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.4.2 Desktop Release Package'), 'release notes include package section');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-2-packaged-release.smoke',
  tag: manifest.tag,
  sourceCommit: manifest.source_commit,
  exePath,
  asarPath,
  packagedLaunch: manifest.packaged_launch_status,
  addressNormalization: manifest.address_normalization_status,
  provider: manifest.provider_adapter_status,
  externalApi: manifest.external_api_status,
  customerSafety: manifest.customer_safety_status,
  decision: 'RC-0.4.2 Desktop Release Package 사용 가능'
}, null, 2));
