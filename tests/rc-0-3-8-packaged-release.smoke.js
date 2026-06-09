'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'RC-0.3.8');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_3_8.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(rootDir, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(rootDir, 'electron', 'dist', 'index.html');
const servicePath = path.join(rootDir, 'electron', 'services', 'unmatchedPriceRecommendationService.js');
const viewPath = path.join(rootDir, 'ui', 'app', 'pricing', 'UnmatchedPriceRecommendationCenterView.tsx');
const recommendationSmokePath = path.join(rootDir, 'tests', 'rc-0-3-8-unmatched-price-recommendation.smoke.js');
const stabilizationSmokePath = path.join(rootDir, 'tests', 'rc-0-3-8-branch-stabilization.smoke.js');
const customerSafetyPath = path.join(rootDir, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');

const tags = execFileSync('git', ['tag', '--list', 'v0.3.8-rc'], {
  cwd: rootDir,
  encoding: 'utf8'
}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(tags.includes('v0.3.8-rc'), 'v0.3.8-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.3.8 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.3.8 run guide exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.3.8 packaged app test report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(servicePath), 'unmatchedPriceRecommendationService exists');
assert.ok(fs.existsSync(viewPath), 'UnmatchedPriceRecommendationCenterView exists');
assert.ok(fs.existsSync(recommendationSmokePath), 'RC-0.3.8 recommendation smoke exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.3.8 stabilization smoke exists');
assert.ok(fs.existsSync(customerSafetyPath), 'customer safety regression exists');

const customerSafetyOutput = execFileSync(process.execPath, [customerSafetyPath], {
  cwd: rootDir,
  encoding: 'utf8'
});
assert.ok(customerSafetyOutput.includes('"ok":true'), 'customer safety regression can run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.3.8', 'manifest records RC-0.3.8 version');
assert.strictEqual(manifest.tag, 'v0.3.8-rc', 'manifest records v0.3.8-rc tag');
assert.strictEqual(manifest.unmatched_price_recommendation_status, 'PASSED', 'manifest records recommendation status');
assert.strictEqual(manifest.confidence_classification_status, 'PASSED', 'manifest records confidence classification');
assert.strictEqual(manifest.queue_linkage_status, 'PASSED', 'manifest records queue linkage');
assert.strictEqual(manifest.master_price_protection_status, 'PASSED', 'manifest records Master Data protection');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest records customer safety');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.3.8 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.3.8 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-3-8-packaged-release.smoke',
  tag: manifest.tag,
  commit: manifest.commit,
  manifestPath,
  exePath,
  distIndexPath,
  recommendation: manifest.unmatched_price_recommendation_status,
  confidenceClassification: manifest.confidence_classification_status,
  queueLinkage: manifest.queue_linkage_status,
  masterPriceProtection: manifest.master_price_protection_status,
  customerSafety: manifest.customer_safety_status
}, null, 2));
