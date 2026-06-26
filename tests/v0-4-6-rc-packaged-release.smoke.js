const assert = require('assert');
const crypto = require('crypto');
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
  assert.strictEqual(result.status, 0, `git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  return String(result.stdout || '').trim();
}

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
}

const manifest = readJson('release/V0.4.6-RC/RELEASE_MANIFEST.json');
const report = read('release/V0.4.6-RC/RC_PACKAGE_TEST_REPORT.md');
const readme = read('release/V0.4.6-RC/README_RUN_V0_4_6_RC.md');
const releaseNotes = read('RELEASE_NOTES.md');

const rcTarget = git(['rev-list', '-n', '1', 'v0.4.6-rc']);
const officialV045Target = git(['rev-list', '-n', '1', 'v0.4.5']);
const officialV046 = git(['tag', '--list', 'v0.4.6']);
const officialV046Target = officialV046 ? git(['rev-list', '-n', '1', 'v0.4.6']) : '';

assert.strictEqual(rcTarget, '59f646968e7de4aa6c1392216f8c9444a49d6bf8', 'v0.4.6-rc target preserved');
assert.strictEqual(officialV045Target, 'abe9094a8f09776a0960f0e65550bf301c5b8c55', 'official v0.4.5 target preserved');
if (officialV046) {
  assert.strictEqual(officialV046Target, 'f1c45d4a10bae5b269b2751ab030cec06df59a58', 'official v0.4.6 target preserved');
}

assert.ok(exists('release/V0.4.6-RC/RELEASE_MANIFEST.json'), 'manifest exists');
assert.ok(exists('release/V0.4.6-RC/README_RUN_V0_4_6_RC.md'), 'run guide exists');
assert.ok(exists('release/V0.4.6-RC/RC_PACKAGE_TEST_REPORT.md'), 'test report exists');

assert.strictEqual(manifest.version, 'v0.4.6-rc');
assert.strictEqual(manifest.official_v0_4_6_tag_created, false);
assert.strictEqual(manifest.github_release_created, false);
assert.strictEqual(manifest.actual_launch.status, 'PASSED');
assert.strictEqual(manifest.actual_launch.runs, 2);
assert.strictEqual(manifest.actual_launch.window_title, 'ECOREAN BOC CEO Dashboard');
assert.strictEqual(manifest.actual_launch.dev_server_required, false);
assert.strictEqual(manifest.actual_launch.restart_persistence, 'PASSED');

assert.ok(fs.existsSync(manifest.executable_path), 'packaged EXE exists');
assert.ok(fs.existsSync(manifest.asar_path), 'packaged app.asar exists');
assert.strictEqual(fs.statSync(manifest.executable_path).size, manifest.executable_size_bytes);
assert.strictEqual(fs.statSync(manifest.asar_path).size, manifest.asar_size_bytes);
assert.strictEqual(sha256(manifest.executable_path), manifest.executable_sha256);
assert.strictEqual(sha256(manifest.asar_path), manifest.asar_sha256);

assert.strictEqual(manifest.test_status.packaged_visual_click, 'PASSED');
assert.strictEqual(manifest.test_status.safe_screenshot, 'PASSED');
assert.strictEqual(manifest.test_status.pixel_layout, 'PASSED');
assert.strictEqual(manifest.test_status.pdf_korean_typography, 'PASSED');
assert.strictEqual(manifest.test_status.poppler_render, 'PASSED');
assert.strictEqual(manifest.test_status.pdf_output, 'PASSED');
assert.strictEqual(manifest.test_status.excel_output, 'PASSED');
assert.strictEqual(manifest.test_status.print_output, 'PASSED');
assert.strictEqual(manifest.test_status.customer_internal_separation, 'PASSED');
assert.strictEqual(manifest.test_status.customer_safety, 'PASSED');

assert.strictEqual(manifest.safe_screenshot.full_desktop_capture, 'REJECTED');
assert.strictEqual(manifest.safe_screenshot.sensitive_information_capture, 'REJECTED');
assert.strictEqual(manifest.output_artifacts.customer_pdf.page_count, 1);
assert.strictEqual(manifest.output_artifacts.internal_pdf.page_count, 2);
assert.strictEqual(manifest.findings.P0.length, 0);
assert.strictEqual(manifest.findings.P1.length, 0);
assert.strictEqual(manifest.findings.P2.length, 0);
assert.deepStrictEqual(manifest.findings.P3, [
  'Excel native viewer pixel automation',
  'OS print dialog click automation'
]);

for (const text of [report, readme, releaseNotes]) {
  assert.ok(text.includes('v0.4.6-rc'), 'docs mention v0.4.6-rc');
  assert.ok(text.includes('Customer safety') || text.includes('고객'), 'docs mention customer safety');
  assert.ok(text.includes('Excel native viewer pixel automation'), 'docs record P3 Excel viewer automation');
  assert.ok(text.includes('OS print dialog click automation'), 'docs record P3 print dialog automation');
}

assert.ok(releaseNotes.includes('v0.4.6 RC Desktop Package'), 'release notes include RC package section');
assert.ok(report.includes('Poppler render: PASSED'), 'report records Poppler render');
assert.ok(report.includes('Customer PDF: PASSED, 1 page'), 'report records customer PDF page count');
assert.ok(report.includes('Internal PDF: PASSED, 2 pages'), 'report records internal PDF page count');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-4-6-rc-packaged-release.smoke',
  rcTarget,
  officialV045Target,
  officialV046Tag: officialV046 || 'NOT_CREATED',
  officialV046Target: officialV046Target || 'NOT_CREATED',
  exeSize: manifest.executable_size_bytes,
  asarSize: manifest.asar_size_bytes,
  launch: manifest.actual_launch.status,
  visualClick: manifest.test_status.packaged_visual_click,
  safeScreenshot: manifest.test_status.safe_screenshot,
  pdfTypography: manifest.test_status.pdf_korean_typography,
  customerSafety: manifest.test_status.customer_safety,
  finalDecision: manifest.final_decision
}, null, 2));
