'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'RC-0.3.7');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_3_7.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(rootDir, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(rootDir, 'electron', 'dist', 'index.html');
const workbenchServicePath = path.join(rootDir, 'electron', 'services', 'realPriceCalibrationWorkbenchService.js');
const workbenchViewPath = path.join(rootDir, 'ui', 'app', 'pricing', 'RealPriceCalibrationWorkbenchView.tsx');
const uxSmokePath = path.join(rootDir, 'tests', 'rc-0-3-7-real-price-calibration-ux.smoke.js');
const stabilizationSmokePath = path.join(rootDir, 'tests', 'rc-0-3-7-branch-stabilization.smoke.js');
const customerSafetyPath = path.join(rootDir, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');

const tags = execFileSync('git', ['tag', '--list', 'v0.3.7-rc'], { cwd: rootDir, encoding: 'utf8' }).trim().split(/\r?\n/).filter(Boolean);
assert.ok(tags.includes('v0.3.7-rc'), 'v0.3.7-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.7 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.7 run guide exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.7 packaged app test report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(workbenchServicePath), 'realPriceCalibrationWorkbenchService exists');
assert.ok(fs.existsSync(workbenchViewPath), 'RealPriceCalibrationWorkbenchView exists');
assert.ok(fs.existsSync(uxSmokePath), 'RC-0.3.7 UX smoke test exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.3.7 branch stabilization smoke test exists');
assert.ok(fs.existsSync(customerSafetyPath), 'customer safety regression can run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.7', 'manifest records RC-0.3.7 version');
assert.strictEqual(manifest.tag, 'v0.3.7-rc', 'manifest records v0.3.7-rc tag');
assert.strictEqual(manifest.real_price_calibration_workbench_status, 'PASSED', 'manifest records workbench status');
assert.strictEqual(manifest.master_price_protection_status, 'PASSED', 'manifest records master price protection status');
assert.strictEqual(manifest.backup_before_apply_status, 'PASSED', 'manifest records backup-before-apply status');
assert.strictEqual(manifest.history_record_status, 'PASSED', 'manifest records history status');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest records customer safety status');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.7 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.7 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-7-packaged-release.smoke',
  tag: 'v0.3.7-rc',
  manifestPath,
  exePath,
  distIndexPath,
  workbench: manifest.real_price_calibration_workbench_status,
  masterPriceProtection: manifest.master_price_protection_status,
  backupBeforeApply: manifest.backup_before_apply_status,
  historyRecord: manifest.history_record_status,
  customerSafety: manifest.customer_safety_status
}, null, 2));
