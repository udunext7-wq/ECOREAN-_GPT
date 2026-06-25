const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

function git(args) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false
  });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

const manifest = readJson('release/V0.4.5-RC/RELEASE_MANIFEST.json');
const report = read('release/V0.4.5-RC/RC_PACKAGE_TEST_REPORT.md');
const readme = read('release/V0.4.5-RC/README_RUN_V0_4_5_RC.md');
const releaseNotes = read('RELEASE_NOTES.md');

const rcTarget = git(['rev-list', '-n', '1', 'v0.4.5-rc']);
const officialV044Target = git(['rev-list', '-n', '1', 'v0.4.4']);
const officialV045 = git(['rev-list', '-n', '1', 'v0.4.5']);

assert.strictEqual(rcTarget, 'b5761f5ffba5cdcd29eedf1e3f9bc1fbd7eb6b0e', 'v0.4.5-rc target should be preserved');
assert.strictEqual(officialV044Target, '36aaa3d98b26743a828a879d878b142e9e003905', 'official v0.4.4 target should be preserved');
assert.strictEqual(officialV045, 'abe9094a8f09776a0960f0e65550bf301c5b8c55', 'official v0.4.5 tag target should be preserved');

assert.ok(exists('release/V0.4.5-RC/RELEASE_MANIFEST.json'), 'manifest exists');
assert.ok(exists('release/V0.4.5-RC/README_RUN_V0_4_5_RC.md'), 'run guide exists');
assert.ok(exists('release/V0.4.5-RC/RC_PACKAGE_TEST_REPORT.md'), 'test report exists');

assert.strictEqual(manifest.version, 'v0.4.5-rc', 'manifest version recorded');
assert.strictEqual(manifest.official_v0_4_5_tag_created, false, 'official v0.4.5 tag not created');
assert.strictEqual(manifest.github_release_created, false, 'GitHub Release not created by this package task');
assert.strictEqual(manifest.actual_launch.status, 'PASSED', 'actual launch recorded');
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard', 'window title recorded');
assert.strictEqual(manifest.actual_launch.dev_server_required, false, 'dev server not required');
assert.strictEqual(manifest.test_status.packaged_visual_qa, 'CONDITIONAL_PASSED', 'visual QA result recorded');
assert.strictEqual(manifest.test_status.output_artifact_qa, 'PASSED_WITH_WARNINGS', 'output QA result recorded');
assert.strictEqual(manifest.test_status.customer_safety, 'PASSED', 'customer safety recorded');
assert.strictEqual(manifest.findings.P0.length, 0, 'P0 findings none');
assert.strictEqual(manifest.findings.P1.length, 0, 'P1 findings none');

assert.ok(fs.existsSync(manifest.executable_path), 'packaged EXE exists');
assert.ok(fs.existsSync(manifest.asar_path), 'packaged app.asar exists');
assert.ok(manifest.executable_size_bytes > 0, 'historical v0.4.5 EXE size is recorded');
assert.ok(manifest.asar_size_bytes > 0, 'historical v0.4.5 app.asar size is recorded');
assert.ok(fs.statSync(manifest.executable_path).size > 0, 'current packaged EXE is non-empty');
assert.ok(fs.statSync(manifest.asar_path).size > 0, 'current packaged app.asar is non-empty');

for (const text of [report, readme, releaseNotes]) {
  assert.ok(text.includes('v0.4.5-rc'), 'docs mention v0.4.5-rc');
  assert.ok(text.includes('PDF_KOREAN_TEXT_ASCII_FALLBACK') || text.includes('PDF Korean'), 'docs mention PDF warning');
  assert.ok(text.includes('Customer safety') || text.includes('고객'), 'docs mention customer safety');
}

assert.ok(releaseNotes.includes('v0.4.5 RC Desktop Package'), 'release notes include RC package section');
assert.ok(report.includes('Full packaged click automation') || report.includes('full packaged click automation'), 'deferred click automation documented');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-4-5-rc-packaged-release.smoke',
  rcTarget,
  officialV044Target,
  officialV045TagTarget: officialV045,
  exeSize: manifest.executable_size_bytes,
  asarSize: manifest.asar_size_bytes,
  launch: manifest.actual_launch.status,
  visualQa: manifest.test_status.packaged_visual_qa,
  outputQa: manifest.test_status.output_artifact_qa,
  customerSafety: manifest.test_status.customer_safety,
  finalDecision: manifest.final_decision
}, null, 2));
