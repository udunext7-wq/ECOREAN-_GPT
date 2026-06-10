'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const releaseDir = path.join(rootDir, 'release', 'RC-0.4.0');
const manifestPath = path.join(releaseDir, 'RELEASE_MANIFEST.json');
const readmePath = path.join(releaseDir, 'README_RUN_RC_0_4_0.md');
const reportPath = path.join(releaseDir, 'PACKAGED_APP_TEST_REPORT.md');
const exePath = path.join(rootDir, 'electron', 'release', 'win-unpacked', 'ECOREAN BOC CEO Dashboard.exe');
const distIndexPath = path.join(rootDir, 'electron', 'dist', 'index.html');
const crmServicePath = path.join(rootDir, 'electron', 'services', 'crmPipelineService.js');
const crmViewPath = path.join(rootDir, 'ui', 'app', 'crm', 'CrmPipelineCenterView.tsx');
const crmSmokePath = path.join(rootDir, 'tests', 'rc-0-4-0-crm-pipeline.smoke.js');
const stabilizationSmokePath = path.join(rootDir, 'tests', 'rc-0-4-0-branch-stabilization.smoke.js');
const customerSafetyPath = path.join(rootDir, 'tests', 'lightbim-customer-safety-regression.smoke.js');
const releaseNotesPath = path.join(rootDir, 'RELEASE_NOTES.md');

const tags = execFileSync('git', ['tag', '--list', 'v0.4.0-rc'], {
  cwd: rootDir,
  encoding: 'utf8'
}).trim().split(/\r?\n/).filter(Boolean);
assert.ok(tags.includes('v0.4.0-rc'), 'v0.4.0-rc tag exists');

assert.ok(fs.existsSync(manifestPath), 'release/RC-0.4.0 manifest exists');
assert.ok(fs.existsSync(readmePath), 'RC-0.4.0 run guide exists');
assert.ok(fs.existsSync(reportPath), 'RC-0.4.0 packaged app test report exists');
assert.ok(fs.existsSync(exePath), 'packaged exe path exists');
assert.ok(fs.existsSync(distIndexPath), 'production dist exists');
assert.ok(fs.existsSync(crmServicePath), 'crmPipelineService exists');
assert.ok(fs.existsSync(crmViewPath), 'CrmPipelineCenterView exists');
assert.ok(fs.existsSync(crmSmokePath), 'RC-0.4.0 CRM pipeline smoke exists');
assert.ok(fs.existsSync(stabilizationSmokePath), 'RC-0.4.0 branch stabilization smoke exists');
assert.ok(fs.existsSync(customerSafetyPath), 'customer safety regression exists');

const customerSafetyOutput = execFileSync(process.execPath, [customerSafetyPath], {
  cwd: rootDir,
  encoding: 'utf8'
});
assert.ok(customerSafetyOutput.includes('"ok":true'), 'customer safety regression can run');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.strictEqual(manifest.version, 'RC-0.4.0', 'manifest records RC-0.4.0 version');
assert.strictEqual(manifest.tag, 'v0.4.0-rc', 'manifest records v0.4.0-rc tag');
assert.strictEqual(manifest.crm_pipeline_status, 'PASSED', 'manifest records CRM pipeline status');
assert.strictEqual(manifest.lead_flow_status, 'PASSED', 'manifest records lead flow status');
assert.strictEqual(manifest.stage_history_status, 'PASSED', 'manifest records stage history status');
assert.strictEqual(manifest.consultation_log_status, 'PASSED', 'manifest records consultation log status');
assert.strictEqual(manifest.site_survey_status, 'PASSED', 'manifest records site survey status');
assert.strictEqual(manifest.estimate_project_link_status, 'PASSED', 'manifest records estimate/project linking');
assert.strictEqual(manifest.privacy_masking_status, 'PASSED', 'manifest records privacy masking status');
assert.strictEqual(manifest.portal_token_hash_status, 'PASSED', 'manifest records portal token hash status');
assert.strictEqual(manifest.external_api_status, 'DISABLED', 'manifest records external API disabled status');
assert.strictEqual(manifest.customer_safety_status, 'PASSED', 'manifest records customer safety');

const releaseNotes = fs.readFileSync(releaseNotesPath, 'utf8');
assert.ok(releaseNotes.includes('RC-0.4.0 Desktop Release Package'), 'RELEASE_NOTES includes RC-0.4.0 Desktop Release Package');

console.log(JSON.stringify({
  ok: true,
  test: 'rc-0-4-0-packaged-release.smoke',
  tag: manifest.tag,
  commit: manifest.commit,
  manifestPath,
  exePath,
  distIndexPath,
  crmPipeline: manifest.crm_pipeline_status,
  leadFlow: manifest.lead_flow_status,
  stageHistory: manifest.stage_history_status,
  privacyMasking: manifest.privacy_masking_status,
  portalTokenHash: manifest.portal_token_hash_status,
  externalApi: manifest.external_api_status,
  customerSafety: manifest.customer_safety_status
}, null, 2));
