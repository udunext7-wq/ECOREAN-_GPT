'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'release', 'RC-0.3.4', 'RELEASE_MANIFEST.json');
const readmePath = path.join(root, 'release', 'RC-0.3.4', 'README_RUN_RC_0_3_4.md');
const reportPath = path.join(root, 'release', 'RC-0.3.4', 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(root, 'electron', 'dist', 'index.html');
const expansionSmokePath = path.join(root, 'tests', 'rc-0-3-4-actual-customer-pilot-expansion.smoke.js');
const stabilizationSmokePath = path.join(root, 'tests', 'rc-0-3-4-branch-stabilization.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const tags = git(['tag', '--list', 'v0.3.4-rc']);
assert.strictEqual(tags, 'v0.3.4-rc', 'v0.3.4-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.4 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.4 run README exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.4 packaged app report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(expansionSmokePath), 'RC-0.3.4 expansion smoke test exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.3.4 branch stabilization smoke test exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.4', 'manifest version is RC-0.3.4');
assert.strictEqual(manifest.tag, 'v0.3.4-rc', 'manifest tag is v0.3.4-rc');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest customer safety passed');
assert.strictEqual(manifest.privacy_anonymization_status, 'PASSED', 'manifest privacy anonymization passed');
assert.strictEqual(manifest.pilot_count, 3, 'manifest records 3 pilot types');
assert.deepStrictEqual(manifest.pilot_types, ['BATHROOM', 'KITCHEN', 'FULL_REMODELING'], 'manifest records exact pilot types');
assert.strictEqual(manifest.packaged_launch.dev_server_required, false, 'packaged app does not require dev server');
[
  'Actual Customer Pilot Expansion',
  'BATHROOM pilot',
  'KITCHEN pilot',
  'FULL_REMODELING pilot',
  'Privacy anonymization',
  'Customer safety regression',
  'Estimate/PCE repeated verification'
].forEach((item) => {
  assert.ok(manifest.included_changes.includes(item), `manifest includes ${item}`);
});

const safety = spawnSync(process.execPath, [path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js')], {
  cwd: root,
  encoding: 'utf8'
});
assert.strictEqual(safety.status, 0, safety.stderr || safety.stdout);

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.4 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.4 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-4-packaged-release.smoke',
  manifestPath,
  exePath,
  distIndexPath,
  pilotCount: manifest.pilot_count,
  pilotTypes: manifest.pilot_types,
  customerSafety: manifest.customer_safety_status,
  privacyAnonymization: manifest.privacy_anonymization_status
}, null, 2));
