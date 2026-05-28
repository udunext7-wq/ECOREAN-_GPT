export type BackupRecord = {
  backupId: string;
  backupType: string;
  backupPath: string;
  manifestPath: string;
  status: string;
  fileSize: number;
  notes: string;
  createdAt: string;
  verifiedAt: string;
};

export type BackupRestoreStatus = {
  paths: {
    userDataRoot: string;
    databaseDir: string;
    exportRoot: string;
    backupRoot: string;
    backupFolders: Record<string, string>;
    dbPaths: Record<string, string>;
    exportFolders: Record<string, string>;
  };
  backups: BackupRecord[];
  integrity: {
    status: string;
    statusKo: string;
    results: Array<Record<string, unknown>>;
  };
  latestBackup: BackupRecord | null;
  recentStatusKo: string;
  internalOnly: boolean;
};

function bridge() {
  const db = window.ecorean?.bocDb;
  if (!db) {
    throw new Error('BOC DB bridge is not available.');
  }
  return db;
}

export async function getBackupRestoreStatus() {
  return (await bridge().getBackupRestoreStatus()) as BackupRestoreStatus;
}

export async function createDatabaseBackup(payload: Record<string, unknown> = {}) {
  return bridge().createBackupRestoreDatabaseBackup(payload);
}

export async function createExportBackup(payload: Record<string, unknown> = {}) {
  return bridge().createBackupRestoreExportBackup(payload);
}

export async function createFullBackup(payload: Record<string, unknown> = {}) {
  return bridge().createBackupRestoreFullBackup(payload);
}

export async function createPreUpdateBackup(payload: Record<string, unknown> = {}) {
  return bridge().createBackupRestorePreUpdateBackup(payload);
}

export async function verifyBackup(payload: Record<string, unknown>) {
  return bridge().verifyBackupRestoreBackup(payload);
}

export async function validateDatabase() {
  return bridge().validateBackupRestoreDatabase();
}

export async function prepareRestorePlan(payload: Record<string, unknown>) {
  return bridge().prepareBackupRestorePlan(payload);
}
