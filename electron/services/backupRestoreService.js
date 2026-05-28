const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const APP_VERSION = 'RC-0.3.0';
const APP_NAME = 'ECOREAN BOC CEO Dashboard';

function nowIso() {
  return new Date().toISOString();
}

function stamp() {
  const date = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function fileSize(filePath) {
  return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0;
}

function hashFile(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return '';
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath, { withFileTypes: true }).reduce((count, entry) => {
    const child = path.join(dirPath, entry.name);
    return count + (entry.isDirectory() ? countFiles(child) : 1);
  }, 0);
}

function directorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  return fs.readdirSync(dirPath, { withFileTypes: true }).reduce((size, entry) => {
    const child = path.join(dirPath, entry.name);
    return size + (entry.isDirectory() ? directorySize(child) : fileSize(child));
  }, 0);
}

function copyDirectory(source, target, shouldSkip = () => false) {
  ensureDir(target);
  if (!fs.existsSync(source)) return;
  fs.readdirSync(source, { withFileTypes: true }).forEach((entry) => {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (shouldSkip(sourcePath)) return;
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, shouldSkip);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

function openDatabase(filePath) {
  return new DatabaseSync(filePath);
}

function createBackupRestoreService({ app, sqliteService }) {
  const stats = sqliteService.getDbStats();
  const dbPaths = sqliteService.dbPaths;
  const userDataRoot = app && app.getPath ? app.getPath('userData') : path.join(__dirname, '..', '..', 'userData');
  const databaseDir = path.dirname(dbPaths.project);
  const exportRoot = path.dirname(stats.estimateExportDir);
  const backupRoot = path.join(userDataRoot, 'backups');
  const backupFolders = {
    db: path.join(backupRoot, 'db'),
    export: path.join(backupRoot, 'export'),
    full: path.join(backupRoot, 'full'),
    manifests: path.join(backupRoot, 'manifests')
  };

  function ensureBackupFolders() {
    ensureDir(backupRoot);
    Object.values(backupFolders).forEach(ensureDir);
    return { backupRoot, backupFolders };
  }

  function ensureHistoryTable() {
    const projectDb = openDatabase(dbPaths.project);
    projectDb.exec(`
      CREATE TABLE IF NOT EXISTS backup_history (
        id TEXT PRIMARY KEY,
        backup_id TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        manifest_path TEXT NOT NULL,
        status TEXT NOT NULL,
        file_size INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        verified_at TEXT
      );
    `);
    projectDb.close();
  }

  function insertHistory(record) {
    ensureHistoryTable();
    const projectDb = openDatabase(dbPaths.project);
    projectDb.prepare(`
      INSERT OR REPLACE INTO backup_history (
        id, backup_id, backup_type, backup_path, manifest_path, status,
        file_size, notes, created_at, verified_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `BH-${record.backupId}`,
      record.backupId,
      record.backupType,
      record.backupPath,
      record.manifestPath,
      record.status,
      Number(record.fileSize || 0),
      record.notes || '',
      record.createdAt,
      record.verifiedAt || null
    );
    projectDb.close();
  }

  function updateHistoryVerification(backupId, status) {
    ensureHistoryTable();
    const projectDb = openDatabase(dbPaths.project);
    projectDb.prepare('UPDATE backup_history SET status = ?, verified_at = ? WHERE backup_id = ?').run(status, nowIso(), backupId);
    projectDb.close();
  }

  function getDataPaths() {
    ensureBackupFolders();
    return {
      appName: APP_NAME,
      version: APP_VERSION,
      userDataRoot,
      databaseDir,
      exportRoot,
      backupRoot,
      backupFolders,
      dbPaths,
      exportFolders: {
        estimates: stats.estimateExportDir,
        contracts: stats.contractExportDir,
        schedules: stats.scheduleExportDir,
        purchaseOrders: stats.purchaseOrderExportDir,
        visualizations: stats.visualizationExportDir,
        boards: stats.boardExportDir,
        reports: stats.reportExportDir,
        lightbim: stats.lightBimExportDir
      }
    };
  }

  function createBackupManifest({ backupId, backupType, backupPath, sourcePaths, backupPaths, status = 'SUCCESS', notes = '' }) {
    ensureBackupFolders();
    const createdAt = nowIso();
    const manifest = {
      backup_id: backupId,
      version: APP_VERSION,
      app_name: APP_NAME,
      created_at: createdAt,
      backup_type: backupType,
      source_paths: sourcePaths,
      backup_paths: backupPaths,
      db_file_size: Object.values(dbPaths).reduce((sum, dbPath) => sum + fileSize(dbPath), 0),
      export_file_count: countFiles(exportRoot),
      checksum_placeholder: Object.fromEntries(backupPaths.filter((item) => fs.existsSync(item.path) && !fs.statSync(item.path).isDirectory()).map((item) => [item.label, hashFile(item.path)])),
      status,
      notes
    };
    const manifestPath = path.join(backupFolders.manifests, `boc_backup_manifest_${backupId}.json`);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    return { manifest, manifestPath };
  }

  function createDatabaseBackup({ actor = 'CEO', notes = '' } = {}) {
    ensureBackupFolders();
    const backupId = `DB-${stamp()}`;
    const backupPath = path.join(backupFolders.db, `boc_db_backup_${stamp()}`);
    ensureDir(backupPath);
    const backupPaths = Object.entries(dbPaths).map(([name, sourcePath]) => {
      const targetPath = path.join(backupPath, `${name}.db`);
      if (fs.existsSync(sourcePath)) fs.copyFileSync(sourcePath, targetPath);
      return { label: name, path: targetPath };
    });
    const { manifest, manifestPath } = createBackupManifest({
      backupId,
      backupType: 'DB',
      backupPath,
      sourcePaths: Object.entries(dbPaths).map(([label, sourcePath]) => ({ label, path: sourcePath })),
      backupPaths,
      notes: notes || `DB 백업 생성자: ${actor}`
    });
    insertHistory({ backupId, backupType: 'DB', backupPath, manifestPath, status: manifest.status, fileSize: directorySize(backupPath), notes, createdAt: manifest.created_at });
    return { backupId, backupType: 'DB', backupPath, manifestPath, manifest, statusKo: '정상' };
  }

  function createExportFolderBackup({ actor = 'CEO', notes = '' } = {}) {
    ensureBackupFolders();
    ensureDir(exportRoot);
    const backupId = `EXPORT-${stamp()}`;
    const backupPath = path.join(backupFolders.export, `boc_export_backup_${stamp()}`);
    copyDirectory(exportRoot, backupPath);
    const { manifest, manifestPath } = createBackupManifest({
      backupId,
      backupType: 'EXPORT',
      backupPath,
      sourcePaths: [{ label: 'exportRoot', path: exportRoot }],
      backupPaths: [{ label: 'exportRoot', path: backupPath }],
      notes: notes || `Export 백업 생성자: ${actor}`
    });
    insertHistory({ backupId, backupType: 'EXPORT', backupPath, manifestPath, status: manifest.status, fileSize: directorySize(backupPath), notes, createdAt: manifest.created_at });
    return { backupId, backupType: 'EXPORT', backupPath, manifestPath, manifest, statusKo: '정상' };
  }

  function createFullUserDataBackup({ actor = 'CEO', notes = '' } = {}) {
    ensureBackupFolders();
    const backupId = `FULL-${stamp()}`;
    const backupPath = path.join(backupFolders.full, `boc_full_backup_${stamp()}`);
    ensureDir(backupPath);
    copyDirectory(databaseDir, path.join(backupPath, 'storage', 'sqlite'));
    copyDirectory(exportRoot, path.join(backupPath, 'export'));
    const { manifest, manifestPath } = createBackupManifest({
      backupId,
      backupType: 'FULL',
      backupPath,
      sourcePaths: [
        { label: 'databaseDir', path: databaseDir },
        { label: 'exportRoot', path: exportRoot }
      ],
      backupPaths: [
        { label: 'databaseDir', path: path.join(backupPath, 'storage', 'sqlite') },
        { label: 'exportRoot', path: path.join(backupPath, 'export') }
      ],
      notes: notes || `전체 백업 생성자: ${actor}`
    });
    insertHistory({ backupId, backupType: 'FULL', backupPath, manifestPath, status: manifest.status, fileSize: directorySize(backupPath), notes, createdAt: manifest.created_at });
    return { backupId, backupType: 'FULL', backupPath, manifestPath, manifest, statusKo: '정상' };
  }

  function createPreUpdateBackup(payload = {}) {
    return createFullUserDataBackup({ ...payload, notes: payload.notes || '업데이트 전 수동 전체 백업' });
  }

  function listBackups() {
    ensureHistoryTable();
    const projectDb = openDatabase(dbPaths.project);
    const rows = projectDb.prepare('SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 100').all();
    projectDb.close();
    return rows.map((row) => ({
      id: row.id,
      backupId: row.backup_id,
      backupType: row.backup_type,
      backupPath: row.backup_path,
      manifestPath: row.manifest_path,
      status: row.status,
      fileSize: Number(row.file_size || 0),
      notes: row.notes || '',
      createdAt: row.created_at,
      verifiedAt: row.verified_at || ''
    }));
  }

  function readManifest(backupIdOrPath) {
    const candidate = backupIdOrPath || '';
    if (candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return { manifest: JSON.parse(fs.readFileSync(candidate, 'utf8')), manifestPath: candidate };
    }
    if (candidate && fs.existsSync(path.join(candidate, 'manifest.json'))) {
      const manifestPath = path.join(candidate, 'manifest.json');
      return { manifest: JSON.parse(fs.readFileSync(manifestPath, 'utf8')), manifestPath };
    }
    const history = listBackups().find((item) => item.backupId === candidate || item.backupPath === candidate);
    if (!history) throw new Error('백업 manifest를 찾을 수 없습니다.');
    return { manifest: JSON.parse(fs.readFileSync(history.manifestPath, 'utf8')), manifestPath: history.manifestPath };
  }

  function verifyBackup({ backupId = '', backupPath = '' } = {}) {
    try {
      const { manifest } = readManifest(backupId || backupPath);
      const missing = manifest.backup_paths.filter((item) => !fs.existsSync(item.path));
      const status = missing.length ? 'VERIFY_FAILED' : 'SUCCESS';
      updateHistoryVerification(manifest.backup_id, status);
      return {
        ok: missing.length === 0,
        backupId: manifest.backup_id,
        status,
        statusKo: missing.length ? '확인 필요' : '정상',
        missing
      };
    } catch (error) {
      return { ok: false, status: 'VERIFY_FAILED', statusKo: '오류', errorMessage: error.message };
    }
  }

  function validateCurrentDatabase() {
    const results = Object.entries(dbPaths).map(([dbName, dbPath]) => {
      if (!fs.existsSync(dbPath)) return { dbName, dbPath, status: 'ERROR', statusKo: '오류', message: 'DB 파일이 없습니다.' };
      try {
        const database = openDatabase(dbPath);
        const integrity = database.prepare('PRAGMA integrity_check').get();
        const tables = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((row) => row.name);
        database.close();
        const integrityValue = Object.values(integrity || {})[0];
        return {
          dbName,
          dbPath,
          status: integrityValue === 'ok' && tables.length ? 'OK' : 'NEEDS_REVIEW',
          statusKo: integrityValue === 'ok' && tables.length ? '정상' : '확인 필요',
          integrity: integrityValue,
          tableCount: tables.length
        };
      } catch (error) {
        return { dbName, dbPath, status: 'ERROR', statusKo: '오류', message: error.message };
      }
    });
    const hasError = results.some((item) => item.status === 'ERROR');
    const hasReview = results.some((item) => item.status === 'NEEDS_REVIEW');
    return {
      status: hasError ? 'ERROR' : hasReview ? 'NEEDS_REVIEW' : 'OK',
      statusKo: hasError ? '오류' : hasReview ? '확인 필요' : '정상',
      results
    };
  }

  function prepareRestorePlan({ backupPath = '', backupId = '' } = {}) {
    const { manifest } = readManifest(backupId || backupPath);
    return {
      backupId: manifest.backup_id,
      backupType: manifest.backup_type,
      backupPath: backupPath || listBackups().find((item) => item.backupId === manifest.backup_id)?.backupPath || '',
      requiresConfirmationText: '복구를 진행합니다',
      willCreatePreRestoreBackup: true,
      directRestoreEnabled: false,
      statusKo: '복구 계획 준비',
      warningKo: '복구 전 현재 데이터가 백업됩니다. RC-0.3.0에서는 자동 덮어쓰기 대신 수동 복구 계획을 제공합니다.',
      steps: [
        '앱을 종료합니다.',
        '현재 userData 전체 백업을 생성합니다.',
        '백업 manifest와 파일 존재 여부를 검증합니다.',
        '필요한 DB/export 폴더를 운영 위치에 수동 복사합니다.',
        '앱을 재실행하고 무결성 검사를 수행합니다.'
      ],
      sourcePaths: manifest.source_paths,
      backupPaths: manifest.backup_paths
    };
  }

  function restoreFromBackup({ backupPath = '', backupId = '', confirmationText = '' } = {}) {
    const plan = prepareRestorePlan({ backupPath, backupId });
    if (confirmationText !== '복구를 진행합니다') {
      return {
        restored: false,
        manualRestoreRequired: true,
        statusKo: '복구 확인 필요',
        messageKo: '복구를 진행하려면 확인 문구가 필요합니다.',
        plan
      };
    }
    const preRestoreBackup = createFullUserDataBackup({ notes: `복구 전 자동 백업: ${plan.backupId}` });
    return {
      restored: false,
      manualRestoreRequired: true,
      statusKo: '수동 복구 계획 생성',
      messageKo: '안전을 위해 자동 덮어쓰기는 수행하지 않았습니다. 생성된 사전 백업을 확인한 뒤 수동 복구 절차를 진행하세요.',
      preRestoreBackup,
      plan
    };
  }

  function getBackupStatus() {
    const paths = getDataPaths();
    const backups = listBackups();
    const integrity = validateCurrentDatabase();
    return {
      paths,
      backups,
      integrity,
      latestBackup: backups[0] || null,
      recentStatusKo: backups[0] ? `${backups[0].backupType} 백업 ${backups[0].status}` : '생성된 백업이 없습니다.',
      internalOnly: true
    };
  }

  ensureBackupFolders();
  ensureHistoryTable();

  return {
    getDataPaths,
    ensureBackupFolders,
    createDatabaseBackup,
    createExportFolderBackup,
    createFullUserDataBackup,
    createBackupManifest,
    listBackups,
    verifyBackup,
    validateCurrentDatabase,
    getBackupStatus,
    prepareRestorePlan,
    restoreFromBackup,
    createPreUpdateBackup
  };
}

module.exports = {
  createBackupRestoreService
};
