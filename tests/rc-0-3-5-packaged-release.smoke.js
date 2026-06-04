'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'release', 'RC-0.3.5', 'RELEASE_MANIFEST.json');
const readmePath = path.join(root, 'release', 'RC-0.3.5', 'README_RUN_RC_0_3_5.md');
const reportPath = path.join(root, 'release', 'RC-0.3.5', 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(root, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(root, 'electron', 'dist', 'index.html');
const servicePath = path.join(root, 'electron', 'services', 'priceReadinessImpactService.js');
const impactSmokePath = path.join(root, 'tests', 'rc-0-3-5-price-readiness-impact.smoke.js');
const stabilizationSmokePath = path.join(root, 'tests', 'rc-0-3-5-branch-stabilization.smoke.js');
const releaseNotesPath = path.join(root, 'RELEASE_NOTES.md');

function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

const tags = git(['tag', '--list', 'v0.3.5-rc']);
assert.strictEqual(tags, 'v0.3.5-rc', 'v0.3.5-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.5 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.5 run README exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.5 packaged app report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(servicePath), 'priceReadinessImpactService exists');
assert.ok(fs.existsSync(impactSmokePath), 'RC-0.3.5 impact smoke test exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.3.5 branch stabilization smoke test exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.5', 'manifest version is RC-0.3.5');
assert.strictEqual(manifest.tag, 'v0.3.5-rc', 'manifest tag is v0.3.5-rc');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest customer safety passed');
assert.strictEqual(manifest.price_readiness_impact_status, 'PASSED', 'manifest records price readiness impact status');
assert.strictEqual(manifest.packaged_launch.dev_server_required, false, 'packaged app does not require dev server');
assert.strictEqual(manifest.price_readiness_results.READY.risk_level, 'LOW', 'READY risk is LOW');
assert.strictEqual(manifest.price_readiness_results.PARTIAL.BATHROOM.risk_level, 'MEDIUM', 'BATHROOM PARTIAL risk is MEDIUM');
assert.strictEqual(manifest.price_readiness_results.PARTIAL.KITCHEN.risk_level, 'HIGH', 'KITCHEN PARTIAL risk is HIGH');
assert.strictEqual(manifest.price_readiness_results.PARTIAL.FULL_REMODELING.risk_level, 'HIGH', 'FULL_REMODELING PARTIAL risk is HIGH');
assert.strictEqual(manifest.price_readiness_results.NEEDS_UPDATE.risk_level, 'BLOCKING', 'NEEDS_UPDATE risk is BLOCKING');
[
  'Price Readiness Impact Analysis',
  'READY / PARTIAL / NEEDS_UPDATE classification',
  'fallback / confirmed line item count',
  'margin impact',
  'PCE decision linkage',
  'CEO action required',
  'customer-safe payload filtering'
].forEach((item) => {
  assert.ok(manifest.included_changes.includes(item), `manifest includes ${item}`);
});

const safety = spawnSync(process.execPath, [path.join(root, 'tests', 'lightbim-customer-safety-regression.smoke.js')], {
  cwd: root,
  encoding: 'utf8'
});
assert.strictEqual(safety.status, 0, safety.stderr || safety.stdout);

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.5 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.5 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-5-packaged-release.smoke',
  manifestPath,
  exePath,
  distIndexPath,
  priceReadinessImpact: manifest.price_readiness_impact_status,
  customerSafety: manifest.customer_safety_status,
  readyRisk: manifest.price_readiness_results.READY.risk_level,
  partialBathroomRisk: manifest.price_readiness_results.PARTIAL.BATHROOM.risk_level,
  partialKitchenRisk: manifest.price_readiness_results.PARTIAL.KITCHEN.risk_level,
  partialFullRemodelingRisk: manifest.price_readiness_results.PARTIAL.FULL_REMODELING.risk_level,
  needsUpdateRisk: manifest.price_readiness_results.NEEDS_UPDATE.risk_level
}, null, 2));
