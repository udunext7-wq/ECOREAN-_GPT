'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const electronDir = path.join(root, 'electron');
const packageJson = JSON.parse(fs.readFileSync(path.join(electronDir, 'package.json'), 'utf8'));
const mainSource = fs.readFileSync(path.join(electronDir, 'main.js'), 'utf8');
const sqliteSource = fs.readFileSync(path.join(electronDir, 'services', 'sqliteService.js'), 'utf8');
const manifestPath = path.join(root, 'release', 'RC-0.3.0', 'RELEASE_MANIFEST.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

assert.ok(packageJson.scripts['build:ui'], 'build:ui script exists');
assert.ok(packageJson.scripts.dist, 'dist packaging script exists');
assert.ok(packageJson.devDependencies['electron-builder'], 'electron-builder is available');
assert.ok(exists('electron/dist/index.html'), 'production UI dist exists');
assert.ok(exists('electron/release/win-unpacked'), 'packaged win-unpacked output exists');
assert.ok(exists('electron/release/win-unpacked/ECOREAN BOC CEO Dashboard.exe'), 'packaged executable exists');
assert.ok(exists('release/RC-0.3.0/README_RUN_RC_0_3_0.md'), 'run README exists');
assert.ok(exists('release/RC-0.3.0/BACKUP_RESTORE_GUIDE.md'), 'backup/restore guide exists');
assert.ok(exists('release/RC-0.3.0/USER_TEST_GUIDE.md'), 'user test guide exists');
assert.ok(exists('release/RC-0.3.0/RELEASE_MANIFEST.json'), 'release manifest exists');

assert.ok(mainSource.includes("mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))"), 'production app loads packaged dist/index.html');
assert.ok(mainSource.includes('ECOREAN_DEV_SERVER_URL'), 'dev server URL is gated by dev environment variable');
assert.ok(!mainSource.includes('loadURL(process.env.ECOREAN_DEV_SERVER_URL)'), 'production does not directly require Vite dev URL');
assert.ok(sqliteSource.includes("app.getPath('userData')"), 'packaged SQLite/export paths use Electron userData');
[
  'estimates',
  'contracts',
  'schedules',
  'purchase-orders',
  'visualizations',
  'boards',
  'reports',
  'lightbim'
].forEach((folderName) => {
  assert.ok(sqliteSource.includes(`'export', '${folderName}'`), `${folderName} export folder is configured`);
});

assert.strictEqual(manifest.version, 'RC-0.3.0', 'manifest version is RC-0.3.0');
assert.strictEqual(manifest.test_status, 'PASSED', 'manifest records passed test status');
assert.ok(manifest.output_paths.packaged_app.includes('ECOREAN BOC CEO Dashboard.exe'), 'manifest references packaged executable');
assert.ok(manifest.included_docs.includes('release/RC-0.3.0/README_RUN_RC_0_3_0.md'), 'manifest includes run README');

console.log(JSON.stringify({
  ok: true,
  test: 'packaged-app-readiness.smoke',
  packageOutput: manifest.package_output_path,
  executable: manifest.output_paths.packaged_app,
  packageType: manifest.package_type,
  docs: manifest.included_docs.length
}, null, 2));
