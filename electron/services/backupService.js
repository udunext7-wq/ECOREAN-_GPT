const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const BOC_VERSION = '0.1.0';
const DATABASES = ['project', 'approval', 'master', 'logs'];

function nowIso() {
  return new Date().toISOString();
}

function safeStamp() {
  return nowIso().replace(/[:.]/g, '-');
}

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function openDatabase(filePath) {
  return new DatabaseSync(filePath);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getTables(database) {
  return database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all()
    .map((row) => row.name);
}

function readTable(database, tableName) {
  return database.prepare(`SELECT * FROM ${tableName}`).all();
}

function createBackupService({ dbPaths, databaseDir }) {
  const backupRoot = path.join(databaseDir, 'backups');
  const exportRoot = path.join(databaseDir, 'exports');
  ensureDir(backupRoot);
  ensureDir(exportRoot);

  const logDb = openDatabase(dbPaths.logs);

  function migrateLogs() {
    logDb.exec(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        backup_log_id TEXT PRIMARY KEY,
        backup_id TEXT NOT NULL,
        backup_type TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        db_list_json TEXT NOT NULL,
        checksum_json TEXT NOT NULL,
        version TEXT NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restore_logs (
        restore_log_id TEXT PRIMARY KEY,
        backup_id TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        pre_restore_backup_path TEXT NOT NULL,
        checksum_verified INTEGER NOT NULL,
        approval_actor TEXT NOT NULL,
        approval_reason_ko TEXT NOT NULL,
        restored_db_list_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS export_logs (
        export_log_id TEXT PRIMARY KEY,
        export_id TEXT NOT NULL,
        export_type TEXT NOT NULL,
        export_path TEXT NOT NULL,
        scope TEXT NOT NULL,
        has_personal_data INTEGER NOT NULL,
        actor TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
  }

  function logBackup({ backupId, backupType, backupPath, dbList, checksums, actor, createdAt }) {
    logDb.prepare(`
      INSERT INTO backup_logs (
        backup_log_id, backup_id, backup_type, backup_path, db_list_json,
        checksum_json, version, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `BLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      backupId,
      backupType,
      backupPath,
      JSON.stringify(dbList),
      JSON.stringify(checksums),
      BOC_VERSION,
      actor,
      createdAt
    );
  }

  function createBackup({ dbNames = DATABASES, actor = 'CEO', backupType = 'FULL' } = {}) {
    const createdAt = nowIso();
    const backupId = `BACKUP-${safeStamp()}`;
    const backupPath = path.join(backupRoot, backupId);
    ensureDir(backupPath);

    const normalizedDbNames = dbNames.filter((dbName) => DATABASES.includes(dbName));
    const checksums = {};
    const dbList = normalizedDbNames.map((dbName) => {
      const sourcePath = dbPaths[dbName];
      const fileName = `${dbName}.db`;
      const targetPath = path.join(backupPath, fileName);
      fs.copyFileSync(sourcePath, targetPath);
      checksums[fileName] = sha256File(targetPath);
      return { dbName, fileName, hasPersonalData: ['project', 'approval', 'logs'].includes(dbName) };
    });

    const manifest = {
      backupId,
      version: BOC_VERSION,
      createdAt,
      backupType,
      dbList,
      checksums,
      checksumAlgorithm: 'sha256',
      systemLayer: 'English',
      displayLayer: 'Korean',
      restoreRequiresCeoApproval: true,
      personalDataNoticeKo: 'project/approval/logs DB에는 고객 또는 운영 개인정보가 포함될 수 있습니다.'
    };
    fs.writeFileSync(path.join(backupPath, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    logBackup({ backupId, backupType, backupPath, dbList, checksums, actor, createdAt });
    return { backupId, backupPath, manifest };
  }

  function createFullBackup(payload = {}) {
    return createBackup({ ...payload, dbNames: DATABASES, backupType: 'FULL' });
  }

  function createDatabaseBackup({ dbName, actor = 'CEO' }) {
    return createBackup({ dbNames: [dbName], actor, backupType: `DB:${dbName}` });
  }

  function readManifest(backupPath) {
    const manifestPath = path.join(backupPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) throw new Error('Restore preview blocked: manifest.json is missing.');
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }

  function previewRestore({ backupPath }) {
    const manifest = readManifest(backupPath);
    const verification = manifest.dbList.map((item) => {
      const filePath = path.join(backupPath, item.fileName);
      const exists = fs.existsSync(filePath);
      const checksum = exists ? sha256File(filePath) : 'MISSING';
      const expectedChecksum = manifest.checksums[item.fileName];
      return {
        dbName: item.dbName,
        fileName: item.fileName,
        exists,
        checksum,
        expectedChecksum,
        checksumValid: exists && checksum === expectedChecksum,
        hasPersonalData: Boolean(item.hasPersonalData)
      };
    });
    return {
      backupId: manifest.backupId,
      backupPath,
      version: manifest.version,
      createdAt: manifest.createdAt,
      restoreRequiresCeoApproval: true,
      checksumAlgorithm: manifest.checksumAlgorithm,
      allChecksPassed: verification.every((item) => item.checksumValid),
      verification
    };
  }

  function restoreBackup({ backupPath, approvalConfirmed = false, actor = 'CEO', approvalReasonKo = '대표 승인 Restore' }) {
    if (!approvalConfirmed) throw new Error('Restore blocked: CEO approval is required.');
    const preview = previewRestore({ backupPath });
    if (!preview.allChecksPassed) throw new Error('Restore blocked: checksum verification failed.');

    const preRestore = createFullBackup({ actor, backupType: 'PRE_RESTORE_AUTO_BACKUP' });
    const manifest = readManifest(backupPath);

    manifest.dbList.forEach((item) => {
      const sourcePath = path.join(backupPath, item.fileName);
      fs.copyFileSync(sourcePath, dbPaths[item.dbName]);
    });

    const createdAt = nowIso();
    logDb.prepare(`
      INSERT INTO restore_logs (
        restore_log_id, backup_id, backup_path, pre_restore_backup_path,
        checksum_verified, approval_actor, approval_reason_ko,
        restored_db_list_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `RLOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      manifest.backupId,
      backupPath,
      preRestore.backupPath,
      1,
      actor,
      approvalReasonKo,
      JSON.stringify(manifest.dbList),
      createdAt
    );

    return { restored: true, backupId: manifest.backupId, preRestoreBackupPath: preRestore.backupPath, restoredDbList: manifest.dbList };
  }

  function exportJson({ scope = 'ALL', actor = 'CEO' } = {}) {
    const createdAt = nowIso();
    const exportId = `JSON-EXPORT-${safeStamp()}`;
    const exportPath = path.join(exportRoot, `${exportId}.json`);
    const selectedDbNames = scope === 'ALL' ? DATABASES : DATABASES.filter((dbName) => dbName === scope);
    const payload = {
      exportId,
      exportType: 'JSON',
      version: BOC_VERSION,
      createdAt,
      scope,
      reimportable: true,
      databases: {}
    };

    selectedDbNames.forEach((dbName) => {
      const database = openDatabase(dbPaths[dbName]);
      const tables = {};
      getTables(database).forEach((tableName) => {
        tables[tableName] = readTable(database, tableName);
      });
      payload.databases[dbName] = { tables };
    });

    fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2), 'utf8');
    logExport({ exportId, exportType: 'JSON', exportPath, scope, actor, createdAt, hasPersonalData: true });
    return { exportId, exportPath, exportType: 'JSON', reimportable: true, hasPersonalData: true };
  }

  function exportExcel({ scope = 'ALL', actor = 'CEO' } = {}) {
    const createdAt = nowIso();
    const exportId = `EXCEL-EXPORT-${safeStamp()}`;
    const exportPath = path.join(exportRoot, `${exportId}.xls`);
    const selectedDbNames = scope === 'ALL' ? DATABASES : DATABASES.filter((dbName) => dbName === scope);
    const worksheets = [];

    selectedDbNames.forEach((dbName) => {
      const database = openDatabase(dbPaths[dbName]);
      getTables(database).forEach((tableName) => {
        const rows = readTable(database, tableName).slice(0, 500);
        const columns = rows[0] ? Object.keys(rows[0]) : ['empty'];
        const header = `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${xmlEscape(column)}</Data></Cell>`).join('')}</Row>`;
        const body = rows.map((row) => `<Row>${columns.map((column) => `<Cell><Data ss:Type="String">${xmlEscape(row[column])}</Data></Cell>`).join('')}</Row>`).join('');
        worksheets.push(`
          <Worksheet ss:Name="${xmlEscape(`${dbName}_${tableName}`.slice(0, 31))}">
            <Table>${header}${body}</Table>
          </Worksheet>
        `);
      });
    });

    const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 ${worksheets.join('\n')}
</Workbook>`;
    fs.writeFileSync(exportPath, xml, 'utf8');
    logExport({ exportId, exportType: 'EXCEL', exportPath, scope, actor, createdAt, hasPersonalData: true });
    return { exportId, exportPath, exportType: 'EXCEL', reimportable: false, hasPersonalData: true };
  }

  function logExport({ exportId, exportType, exportPath, scope, actor, createdAt, hasPersonalData }) {
    logDb.prepare(`
      INSERT INTO export_logs (
        export_log_id, export_id, export_type, export_path, scope,
        has_personal_data, actor, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      `ELOG-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      exportId,
      exportType,
      exportPath,
      scope,
      hasPersonalData ? 1 : 0,
      actor,
      createdAt
    );
  }

  function getBackupStatus() {
    return {
      backupRoot,
      exportRoot,
      databaseList: DATABASES.map((dbName) => ({ dbName, path: dbPaths[dbName], checksum: fs.existsSync(dbPaths[dbName]) ? sha256File(dbPaths[dbName]) : 'MISSING' })),
      backupLogs: logDb.prepare('SELECT * FROM backup_logs ORDER BY created_at DESC LIMIT 20').all(),
      restoreLogs: logDb.prepare('SELECT * FROM restore_logs ORDER BY created_at DESC LIMIT 20').all(),
      exportLogs: logDb.prepare('SELECT * FROM export_logs ORDER BY created_at DESC LIMIT 20').all()
    };
  }

  migrateLogs();

  return {
    createFullBackup,
    createDatabaseBackup,
    previewRestore,
    restoreBackup,
    exportJson,
    exportExcel,
    getBackupStatus
  };
}

module.exports = {
  createBackupService
};
