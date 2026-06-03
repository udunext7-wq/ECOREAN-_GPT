'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'release', 'RC-0.3.3', 'RELEASE_MANIFEST.json');
const readmePath = path.join(root, 'release', 'RC-0.3.3', 'README_RUN_RC_0_3_3.md');
const reportPath = path.join(root, 'release', 'RC-0.3.3', 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(root, 'electron', 'dist', 'index.html');
const pilotServicePath = path.join(root, 'electron', 'services', 'actualCustomerPilotService.js');
const backupServicePath = path.join(root, 'electron', 'services', 'backupRestoreService.js');
const pilotSmokePath = path.join(root, 'tests', 'rc-0-3-3-actual-customer-data-pilot.smoke.js');
const stabilizationSmokePath = path.join(root, 'tests', 'rc-0-3-3-branch-stabilization.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const tags = git(['tag', '--list', 'v0.3.3-rc']);
assert.strictEqual(tags, 'v0.3.3-rc', 'v0.3.3-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.3 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.3 run README exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.3 packaged app report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(pilotServicePath), 'actual customer pilot service exists');
assert.ok(fs.existsSync(pilotSmokePath), 'actual customer pilot smoke test exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'branch stabilization smoke test exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.3', 'manifest version is RC-0.3.3');
assert.strictEqual(manifest.tag, 'v0.3.3-rc', 'manifest tag is v0.3.3-rc');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest customer safety passed');
assert.strictEqual(manifest.privacy_anonymization_status, 'PASSED', 'manifest privacy anonymization passed');
assert.strictEqual(manifest.packaged_launch.dev_server_required, false, 'packaged app does not require dev server');
assert.ok(manifest.included_changes.includes('Actual Customer Data Pilot'), 'manifest includes Actual Customer Data Pilot');
assert.ok(manifest.included_changes.some((item) => item.includes('report 저장 방지')), 'manifest records raw personal data report storage prevention');

const backupService = fs.readFileSync(backupServicePath, 'utf8');
['backups', 'export', 'manifests'].forEach((term) => {
  assert.ok(backupService.includes(term), `export/backup path logic includes ${term}`);
});

const pilotService = fs.readFileSync(pilotServicePath, 'utf8');
[
  'createActualCustomerPilotRun',
  'connectPilotToIntake',
  'generateActualCustomerPilotReport',
  'anonymizeName',
  'redactPayload'
].forEach((term) => {
  assert.ok(pilotService.includes(term), `actual customer pilot service includes ${term}`);
});

const safety = spawnSync(process.execPath, [path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js')], {
  cwd: root,
  encoding: 'utf8'
});
assert.strictEqual(safety.status, 0, safety.stderr || safety.stdout);

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.3 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.3 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-3-packaged-release.smoke',
  manifestPath,
  exePath,
  distIndexPath,
  customerSafety: 'PASSED',
  privacyAnonymization: 'PASSED',
  actualCustomerPilot: 'PRESENT'
}, null, 2));

