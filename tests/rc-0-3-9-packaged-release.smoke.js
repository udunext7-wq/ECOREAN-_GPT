'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'RC-0.3.9');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_3_9.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(rootDir, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(rootDir, 'electron', 'dist', 'index.html');
const scoringServicePath = path.join(rootDir, 'electron', 'services', 'recommendationScoringService.js');
const scoringViewPath = path.join(rootDir, 'ui', 'app', 'pricing', 'RecommendationScoringRulesView.tsx');
const scoringSmokePath = path.join(rootDir, 'tests', 'rc-0-3-9-recommendation-scoring.smoke.js');
const stabilizationSmokePath = path.join(rootDir, 'tests', 'rc-0-3-9-branch-stabilization.smoke.js');
const customerSafetyPath = path.join(rootDir, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');

const tags = execFileSync('git', ['tag', '--list', 'v0.3.9-rc'], {
  cwd: rootDir,
  encoding: 'utf8'
}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(tags.includes('v0.3.9-rc'), 'v0.3.9-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.9 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.9 run guide exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.9 packaged app test report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(scoringServicePath), 'recommendationScoringService exists');
assert.ok(fs.existsSync(scoringViewPath), 'RecommendationScoringRulesView exists');
assert.ok(fs.existsSync(scoringSmokePath), 'RC-0.3.9 recommendation scoring smoke exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.3.9 stabilization smoke exists');
assert.ok(fs.existsSync(customerSafetyPath), 'customer safety regression exists');

const customerSafetyOutput = execFileSync(process.execPath, [customerSafetyPath], {
  cwd: rootDir,
  encoding: 'utf8'
});
assert.ok(customerSafetyOutput.includes('"ok":true'), 'customer safety regression can run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.9', 'manifest records RC-0.3.9 version');
assert.strictEqual(manifest.tag, 'v0.3.9-rc', 'manifest records v0.3.9-rc tag');
assert.strictEqual(manifest.recommendation_scoring_status, 'PASSED', 'manifest records recommendation scoring status');
assert.strictEqual(manifest.score_breakdown_status, 'PASSED', 'manifest records score breakdown status');
assert.strictEqual(manifest.vendor_weight_status, 'PASSED', 'manifest records vendor weight status');
assert.strictEqual(manifest.single_vendor_high_guard_status, 'PASSED', 'manifest records single vendor HIGH guard status');
assert.strictEqual(manifest.master_price_protection_status, 'PASSED', 'manifest records Master Data protection');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest records customer safety');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.9 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.9 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-9-packaged-release.smoke',
  tag: manifest.tag,
  commit: manifest.commit,
  manifestPath,
  exePath,
  distIndexPath,
  recommendationScoring: manifest.recommendation_scoring_status,
  scoreBreakdown: manifest.score_breakdown_status,
  vendorWeight: manifest.vendor_weight_status,
  singleVendorHighGuard: manifest.single_vendor_high_guard_status,
  masterPriceProtection: manifest.master_price_protection_status,
  customerSafety: manifest.customer_safety_status
}, null, 2));
