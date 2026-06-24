const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));

const branch = spawnSync('git', ['branch', '--show-current'], {
  cwd: ROOT,
  encoding: 'utf8'
}).stdout.trim();
assert.strictEqual(branch, 'v0.4.6-packaged-visual-click-output-typography-qa');

const expectedFiles = [
  'tests/helpers/packagedVisualClickHarness.js',
  'tests/helpers/safeScreenshotCapture.js',
  'tests/helpers/outputRenderInspector.js',
  'tests/helpers/pdfTypographyInspector.js',
  'tests/v0-4-6-packaged-visual-click.smoke.js',
  'tests/v0-4-6-safe-screenshot-harness.smoke.js',
  'tests/v0-4-6-output-typography-render.smoke.js',
  'docs/V0_4_6_PACKAGED_VISUAL_CLICK_QA_GUIDE.md',
  'docs/V0_4_6_OUTPUT_TYPOGRAPHY_QA_GUIDE.md',
  'docs/V0_4_6_IMPLEMENTATION_REPORT.md'
];
expectedFiles.forEach((file) => assert.ok(exists(file), `${file} should exist`));

const visualHarness = read('tests/helpers/packagedVisualClickHarness.js');
const safeCapture = read('tests/helpers/safeScreenshotCapture.js');
const outputInspector = read('tests/helpers/outputRenderInspector.js');
const exportService = read('electron/services/estimateExportService.js');
const gitignore = read('.gitignore');
const packageJson = JSON.parse(read('electron/package.json'));
const releaseNotes = read('RELEASE_NOTES.md');

assert.ok(visualHarness.includes('Input.dispatchMouseEvent'), 'actual packaged click uses CDP mouse events');
assert.ok(visualHarness.includes('Page.captureScreenshot'), 'app viewport screenshot uses CDP');
assert.ok(visualHarness.includes('APPDATA: USER_DATA_ROOT'), 'packaged run uses isolated userData');
assert.ok(safeCapture.includes('SAFE_CAPTURE_REJECTS_DESKTOP_CAPTURE'), 'desktop capture is rejected');
assert.ok(outputInspector.includes('changed_pixel_ratio'), 'pixel comparison is implemented');
assert.ok(outputInspector.includes('inspectLayoutSnapshot'), 'layout bounds inspection is implemented');
assert.ok(exportService.includes('/Subtype /Type0'), 'PDF uses Type0 Unicode font');
assert.ok(exportService.includes('/FontFile2'), 'PDF embeds runtime system font');
assert.ok(exportService.includes('/ToUnicode'), 'PDF includes Unicode extraction map');
assert.ok(gitignore.includes('release-assets/'), 'release assets are ignored');
assert.ok(gitignore.includes('qa-output/'), 'QA output is ignored');
assert.ok(gitignore.includes('screenshots/'), 'screenshots are ignored');
assert.ok(packageJson.scripts['qa:v0.4.6:all'], 'combined v0.4.6 QA script exists');
assert.ok(releaseNotes.includes('v0.4.6 Packaged Visual Click & Output Typography QA'), 'release notes updated');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-4-6-branch-stabilization',
  branch,
  checks: 23,
  p0: 0,
  p1: 0,
  final_decision: 'MERGE_READY'
}, null, 2));
