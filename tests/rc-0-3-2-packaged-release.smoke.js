'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'release', 'RC-0.3.2', 'RELEASE_MANIFEST.json');
const readmePath = path.join(root, 'release', 'RC-0.3.2', 'README_RUN_RC_0_3_2.md');
const reportPath = path.join(root, 'release', 'RC-0.3.2', 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(root, 'electron', 'dist', 'index.html');
const distDir = path.join(root, 'electron', 'dist');
const intakeServicePath = path.join(root, 'electron', 'services', 'realProjectIntakeService.js');
const intakeSmokePath = path.join(root, 'tests', 'real-project-intake.smoke.js');
const backupServicePath = path.join(root, 'electron', 'services', 'backupRestoreService.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const tags = git(['tag', '--list', 'v0.3.2-rc']);
assert.strictEqual(tags, 'v0.3.2-rc', 'v0.3.2-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.2 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.2 run README exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.2 packaged app report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(intakeServicePath), 'real project intake service exists');
assert.ok(fs.existsSync(intakeSmokePath), 'real project intake smoke test exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.2', 'manifest version is RC-0.3.2');
assert.strictEqual(manifest.tag, 'v0.3.2-rc', 'manifest tag is v0.3.2-rc');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest customer safety passed');
assert.strictEqual(manifest.packaged_launch.dev_server_required, false, 'packaged app does not require dev server');
assert.ok(manifest.included_changes.includes('Real Project Intake Center'), 'manifest includes Real Project Intake Center');

const backupService = fs.readFileSync(backupServicePath, 'utf8');
['backups', 'export', 'manifests'].forEach((term) => {
  assert.ok(backupService.includes(term), `export/backup path logic includes ${term}`);
});

const intakeService = fs.readFileSync(intakeServicePath, 'utf8');
['createRealProjectIntake', 'runCustomerSafetyCheckForIntake', 'detailed_address'].forEach((term) => {
  assert.ok(intakeService.includes(term), `intake service includes ${term}`);
});

const distAssets = fs.readdirSync(path.join(distDir, 'assets'))
  .filter((fileName) => fileName.endsWith('.js'))
  .map((fileName) => fs.readFileSync(path.join(distDir, 'assets', fileName), 'utf8'))
  .join('\n');
assert.ok(distAssets.includes('실제 프로젝트 접수'), 'production dist includes real project intake label');

const safety = spawnSync(process.execPath, [path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js')], {
  cwd: root,
  encoding: 'utf8'
});
assert.strictEqual(safety.status, 0, safety.stderr || safety.stdout);

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.2 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.2 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-2-packaged-release.smoke',
  manifestPath,
  exePath,
  distIndexPath,
  customerSafety: 'PASSED',
  realProjectIntake: 'PRESENT'
}, null, 2));
