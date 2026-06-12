'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'RC-0.4.1');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_4_1.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(rootDir, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(rootDir, 'electron', 'dist', 'index.html');
const servicePath = path.join(rootDir, 'electron', 'services', 'crmNextActionService.js');
const viewPath = path.join(rootDir, 'ui', 'app', 'crm', 'CrmNextActionCenterView.tsx');
const featureSmokePath = path.join(rootDir, 'tests', 'rc-0-4-1-crm-next-action.smoke.js');
const stabilizationSmokePath = path.join(rootDir, 'tests', 'rc-0-4-1-branch-stabilization.smoke.js');
const customerSafetyPath = path.join(rootDir, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');

const tags = execFileSync('git', ['tag', '--list', 'v0.4.1-rc'], {
  cwd: rootDir,
  encoding: 'utf8'
}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(tags.includes('v0.4.1-rc'), 'v0.4.1-rc tag exists');

[
  [releaseDir, 'release/RC-0.4.1 directory exists'],
  [manifestPath, 'release manifest exists'],
  [readmePath, 'run guide exists'],
  [reportPath, 'packaged app test report exists'],
  [exePath, 'packaged exe path exists'],
  [distIndexPath, 'production UI dist exists'],
  [servicePath, 'crmNextActionService exists'],
  [viewPath, 'CrmNextActionCenterView exists'],
  [featureSmokePath, 'RC-0.4.1 feature smoke exists'],
  [stabilizationSmokePath, 'RC-0.4.1 branch stabilization smoke exists'],
  [customerSafetyPath, 'customer safety regression exists']
].forEach(([targetPath, message]) => assert.ok(fs.existsSync(targetPath), message));

const featureOutput = execFileSync(process.execPath, [featureSmokePath], {
  cwd: rootDir,
  encoding: 'utf8'
});
[
  '"ok": true',
  '"complete": "PASSED"',
  '"snooze": "PASSED"',
  '"cancel": "PASSED"',
  '"overdue": "PASSED"',
  '"notifications": "INTERNAL_ONLY"',
  '"customerSafety": "PASSED"',
  '"externalApi": "DISABLED"'
].forEach((expected) => assert.ok(featureOutput.includes(expected), `feature smoke verifies ${expected}`));

const stabilizationOutput = execFileSync(process.execPath, [stabilizationSmokePath], {
  cwd: rootDir,
  encoding: 'utf8'
});
[
  '"actionLifecycle": "PASSED"',
  '"stageAutomation": "PASSED"',
  '"duplicatePrevention": "PASSED"',
  '"overdue": "PASSED"',
  '"holdLostRestrictions": "PASSED"',
  '"externalApi": "DISABLED"',
  '"customerSafety": "PASSED"'
].forEach((expected) => assert.ok(stabilizationOutput.includes(expected), `stabilization smoke verifies ${expected}`));

const customerSafetyOutput = execFileSync(process.execPath, [customerSafetyPath], {
  cwd: rootDir,
  encoding: 'utf8'
});
assert.ok(customerSafetyOutput.includes('"ok":true'), 'customer safety regression can run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.4.1', 'manifest records RC-0.4.1 version');
assert.strictEqual(manifest.tag, 'v0.4.1-rc', 'manifest records v0.4.1-rc tag');
assert.strictEqual(manifest.packaged_launch_status, 'PASSED', 'manifest records packaged launch status');
assert.strictEqual(manifest.dev_server_required, false, 'manifest records no dev server requirement');
assert.strictEqual(manifest.crm_next_action_status, 'PASSED', 'manifest records CRM next action status');
assert.strictEqual(manifest.auto_action_generation_status, 'PASSED', 'manifest records auto action generation');
assert.strictEqual(manifest.duplicate_prevention_status, 'PASSED', 'manifest records duplicate prevention');
assert.strictEqual(manifest.overdue_detection_status, 'PASSED', 'manifest records overdue detection');
assert.strictEqual(manifest.action_lifecycle_status, 'PASSED', 'manifest records action lifecycle');
assert.strictEqual(manifest.internal_notification_status, 'PASSED', 'manifest records notification status');
assert.strictEqual(manifest.on_hold_lost_guard_status, 'PASSED', 'manifest records ON_HOLD/LOST safeguards');
assert.strictEqual(manifest.privacy_masking_status, 'PASSED', 'manifest records privacy masking');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest records customer safety');
assert.strictEqual(manifest.external_api_status, 'DISABLED', 'manifest records external API disabled status');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.4.1 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.4.1 package section');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-1-packaged-release.smoke',
  tag: manifest.tag,
  sourceCommit: manifest.source_commit,
  exePath,
  packagedLaunch: manifest.packaged_launch_status,
  actionLifecycle: manifest.action_lifecycle_status,
  autoActionGeneration: manifest.auto_action_generation_status,
  duplicatePrevention: manifest.duplicate_prevention_status,
  overdueDetection: manifest.overdue_detection_status,
  internalNotification: manifest.internal_notification_status,
  holdLostGuard: manifest.on_hold_lost_guard_status,
  privacyMasking: manifest.privacy_masking_status,
  externalApi: manifest.external_api_status,
  customerSafety: manifest.customer_safety_status
}, null, 2));
