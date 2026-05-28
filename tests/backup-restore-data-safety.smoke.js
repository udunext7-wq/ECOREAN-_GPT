'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createSqliteService } = require('../electron/services/sqliteService');
const { createBackupRestoreService } = require('../electron/services/backupRestoreService');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-backup-safety-'));

function makeApp(userDataPath = tempRoot) {
  return {
    isPackaged: true,
    getPath(name) {
      if (name === 'userData') return userDataPath;
      return userDataPath;
    }
  };
}

function assertExists(filePath, label) {
  assert.ok(fs.existsSync(filePath), `${label} exists: ${filePath}`);
}

function assertNotHardcodedUserPath(filePath, label) {
  const normalized = String(filePath).replace(/\\/g, '/').toLowerCase();
  assert.ok(!normalized.includes('/users/udune/documents/codex/'), `${label} does not depend on Codex workspace path`);
}

const sqliteService = createSqliteService({ app: makeApp() });
const backupService = createBackupRestoreService({ app: makeApp(), sqliteService });

const paths = backupService.getDataPaths();
assert.strictEqual(paths.userDataRoot, tempRoot, 'Data root resolves to packaged userData path');
assert.ok(paths.backupRoot.startsWith(tempRoot), 'Backup root is under userData');
assertNotHardcodedUserPath(paths.backupRoot, 'Backup root');

Object.values(paths.backupFolders).forEach((folderPath) => assertExists(folderPath, 'Backup folder'));

const dbBackup = backupService.createDatabaseBackup({ notes: 'Smoke DB backup' });
assert.strictEqual(dbBackup.backupType, 'DB', 'Database backup type is DB');
assertExists(dbBackup.backupPath, 'Database backup path');
assertExists(dbBackup.manifestPath, 'Database backup manifest');
assert.strictEqual(dbBackup.manifest.status, 'SUCCESS', 'Database backup manifest status is SUCCESS');
assert.ok(dbBackup.manifest.db_file_size > 0, 'Database backup manifest records DB size');

fs.writeFileSync(path.join(paths.exportFolders.estimates, 'smoke-customer-estimate.pdf'), 'placeholder', 'utf8');
const exportBackup = backupService.createExportFolderBackup({ notes: 'Smoke export backup' });
assert.strictEqual(exportBackup.backupType, 'EXPORT', 'Export backup type is EXPORT');
assertExists(exportBackup.backupPath, 'Export backup path');
assertExists(path.join(exportBackup.backupPath, 'estimates', 'smoke-customer-estimate.pdf'), 'Export backup copied estimate file');
assert.ok(exportBackup.manifest.export_file_count >= 1, 'Export manifest records file count');

const fullBackup = backupService.createFullUserDataBackup({ notes: 'Smoke full backup' });
assert.strictEqual(fullBackup.backupType, 'FULL', 'Full backup type is FULL');
assertExists(path.join(fullBackup.backupPath, 'storage', 'sqlite'), 'Full backup DB folder');
assertExists(path.join(fullBackup.backupPath, 'export'), 'Full backup export folder');

const history = backupService.listBackups();
assert.ok(history.length >= 3, 'Backup history records are created');
assert.ok(history.some((item) => item.backupId === dbBackup.backupId), 'Database backup is listed in history');

const verifyResult = backupService.verifyBackup({ backupId: dbBackup.backupId });
assert.strictEqual(verifyResult.ok, true, 'Backup verification succeeds');
assert.strictEqual(verifyResult.status, 'SUCCESS', 'Backup verification status is SUCCESS');

const integrity = backupService.validateCurrentDatabase();
assert.ok(['정상', '확인 필요'].includes(integrity.statusKo), 'DB integrity returns safe Korean status');
assert.ok(integrity.results.every((item) => String(item.dbPath || '').startsWith(tempRoot)), 'Integrity check uses userData DB files');

const restorePlan = backupService.prepareRestorePlan({ backupId: fullBackup.backupId });
assert.strictEqual(restorePlan.directRestoreEnabled, false, 'Restore is plan-only by default');
assert.strictEqual(restorePlan.requiresConfirmationText, '복구를 진행합니다', 'Restore plan requires explicit Korean confirmation');
assert.ok(restorePlan.steps.length >= 3, 'Restore plan includes manual steps');

const restoreWithoutConfirmation = backupService.restoreFromBackup({ backupId: fullBackup.backupId });
assert.strictEqual(restoreWithoutConfirmation.restored, false, 'Restore does not overwrite without confirmation');
assert.strictEqual(restoreWithoutConfirmation.manualRestoreRequired, true, 'Restore requires manual confirmation and planning');

const secondRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-backup-missing-export-'));
const secondSqliteService = createSqliteService({ app: makeApp(secondRoot) });
const secondBackupService = createBackupRestoreService({ app: makeApp(secondRoot), sqliteService: secondSqliteService });
const secondPaths = secondBackupService.getDataPaths();
fs.rmSync(secondPaths.exportRoot, { recursive: true, force: true });
const missingExportBackup = secondBackupService.createExportFolderBackup({ notes: 'Missing export folder fallback' });
assertExists(missingExportBackup.backupPath, 'Missing export folder backup path');
assert.strictEqual(missingExportBackup.manifest.status, 'SUCCESS', 'Missing export folder backup is handled safely');

const clientPortalSource = fs.readFileSync(path.join(root, 'ui', 'app', 'client', 'ClientPortalCenterView.tsx'), 'utf8');
const customerMapSource = fs.readFileSync(path.join(root, 'ui', 'app', 'lightbim', 'LightBIMCustomerProposalMapView.tsx'), 'utf8');
assert.ok(!clientPortalSource.includes('backupRestore') && !clientPortalSource.includes('백업 / 복구'), 'Client portal does not expose backup controls');
assert.ok(!customerMapSource.includes('backupRestore') && !customerMapSource.includes('백업 / 복구'), 'Customer map does not expose backup controls');

const status = backupService.getBackupStatus();
assert.strictEqual(status.internalOnly, true, 'Backup status is marked internal-only');
assert.ok(status.latestBackup, 'Backup status includes latest backup');

console.log(JSON.stringify({
  ok: true,
  test: 'backup-restore-data-safety.smoke',
  userDataRoot: paths.userDataRoot,
  backupRoot: paths.backupRoot,
  dbBackup: dbBackup.backupId,
  exportBackup: exportBackup.backupId,
  fullBackup: fullBackup.backupId,
  integrity: integrity.statusKo,
  restoreMode: 'PLAN_ONLY'
}, null, 2));
